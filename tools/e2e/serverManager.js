// tools/e2e/serverManager.js - Orchestrates real platform services, databases, and frontends for E2E tests

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');
const { requireModule } = require('./resolve');
const express = requireModule('express');
const { ROOT_DIR, PORT_CORE, PORT_COMMERCE, PORT_MARKETPLACE, PORT_MERCHANT, URLS, TIMEOUTS } = require('./config');
const { assertSafeE2EEnvironment } = require('./safety');
const { setupTestDatabases, teardownTestDatabases } = require('./dbHelper');

async function waitForReady(url, timeoutMs = TIMEOUTS.serverStartup) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return true;
    } catch (_err) {
      // Process still starting up
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Server failed readiness check within ${timeoutMs}ms: ${url}`);
}

class E2EServerManager {
  /**
   * @param {object} [options]
   * @param {import('./artifactCollector').ArtifactCollector} [options.artifactCollector]
   */
  constructor(options = {}) {
    this.collector = options.artifactCollector || null;
    this.scenario = null;
    this.procs = {
      core: null,
      commerce: null,
    };
    this.servers = {
      marketplace: null,
      merchant: null,
    };
    this.isRunning = false;
  }

  log(service, msg) {
    if (this.collector) {
      this.collector.recordServiceLog(service, msg);
    }
  }

  /**
   * Starts real applications and seeded databases on deterministic test ports.
   */
  async start() {
    assertSafeE2EEnvironment();
    this.log('orchestrator', 'Starting real Rentify platform test environment...');

    // 1. Seed deterministic fixtures into isolated test databases
    this.log('fixtures', 'Seeding Core and Commerce test databases...');
    this.scenario = await setupTestDatabases();
    this.log('fixtures', 'Seeded deterministic platform scenario (Store A, Store B, products, carts, orders).');

    // 2. Start Core API (rentify-server)
    this.log('core', 'Starting rentify-server process...');
    const coreEnv = {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(PORT_CORE),
      DB_HOST: '127.0.0.1',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: 'root',
      DB_NAME: 'rentify_core_test',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      ECOMMERCE_API_URL: URLS.commerceApi,
      MARKETPLACE_URL: URLS.marketplace,
      MERCHANT_DASHBOARD_URL: URLS.merchant,
      CORS_ALLOWED_ORIGINS: `${URLS.marketplace},${URLS.merchant},http://127.0.0.1:${PORT_MARKETPLACE},http://localhost:${PORT_MARKETPLACE},http://127.0.0.1:${PORT_MERCHANT},http://localhost:${PORT_MERCHANT}`,
      JWT_SECRET: 'test-jwt-secret-min-32-chars-long-123456',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min-32-chars-long-123456',
      COOKIE_SECRET: 'test-cookie-secret-min-32-chars-long-123',
      SESSION_SECRET: 'test-session-secret-min-32-chars-long-123',
    };

    this.procs.core = fork(path.join(ROOT_DIR, 'rentify-server/src/server.js'), [], {
      env: coreEnv,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this.procs.core.stdout?.on('data', (d) => this.log('core', d.toString().trim()));
    this.procs.core.stderr?.on('data', (d) => this.log('core-err', d.toString().trim()));

    // 3. Start Commerce API (ecommerce-server)
    this.log('commerce', 'Starting ecommerce-server process...');
    const commEnv = {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(PORT_COMMERCE),
      DB_HOST: '127.0.0.1',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: 'root',
      DB_NAME: 'rentify_commerce_test',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      RENTIFY_API_URL: URLS.coreApi,
      MARKETPLACE_URL: URLS.marketplace,
      MERCHANT_DASHBOARD_URL: URLS.merchant,
      CORS_ALLOWED_ORIGINS: `${URLS.marketplace},${URLS.merchant},http://127.0.0.1:${PORT_MARKETPLACE},http://localhost:${PORT_MARKETPLACE},http://127.0.0.1:${PORT_MERCHANT},http://localhost:${PORT_MERCHANT}`,
      JWT_SECRET: 'test-jwt-secret-min-32-chars-long-123456',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-min-32-chars-long-123456',
      MARKETPLACE_COD_CHECKOUT_ENABLED: 'true',
      STOREFRONT_COD_CHECKOUT_ENABLED: 'true',
      COOKIE_SECRET: 'test-cookie-secret-min-32-chars-long-123',
      SESSION_SECRET: 'test-session-secret-min-32-chars-long-123',
    };

    this.procs.commerce = fork(path.join(ROOT_DIR, 'ecommerce-server/server.js'), [], {
      env: commEnv,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    this.procs.commerce.stdout?.on('data', (d) => this.log('commerce', d.toString().trim()));
    this.procs.commerce.stderr?.on('data', (d) => this.log('commerce-err', d.toString().trim()));

    // 4. Wait for both readiness probes
    await waitForReady(`${URLS.coreApi}/ready`);
    this.log('core', `Core API ready on ${URLS.coreApi}`);

    await waitForReady(`${URLS.commerceApi}/ready`);
    this.log('commerce', `Commerce API ready on ${URLS.commerceApi}`);

    // 5. Start Marketplace Static Frontend Server
    this.servers.marketplace = await this._startMarketplaceServer();
    this.log('marketplace', `Marketplace UI listening on ${URLS.marketplace}`);

    // 6. Start Merchant Static Frontend Server
    this.servers.merchant = await this._startMerchantServer();
    this.log('merchant', `Merchant UI listening on ${URLS.merchant}`);

    this.isRunning = true;
    return {
      scenario: this.scenario,
      urls: URLS,
    };
  }

  _startMarketplaceServer() {
    const app = express();
    const distDir = path.join(ROOT_DIR, 'marketplace-frontend/dist/marketplace-frontend/browser');
    const indexPath = path.join(distDir, 'index.html');

    let indexHtml = fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, 'utf8')
      : '<!DOCTYPE html><html><head><title>Rentify Marketplace</title></head><body><app-root></app-root></body></html>';

    const runtimeScript = `
<script>
window.__RENTIFY_MARKETPLACE__ = {
  coreApiUrl: '${URLS.coreApi}',
  commerceApiUrl: '${URLS.commerceApi}',
  authUrl: '${URLS.coreApi}',
  marketingUrl: '${URLS.marketplace}',
  merchantDashboardUrl: '${URLS.merchant}',
  adminDashboardUrl: '${URLS.merchant}'
};
window.__KHMERCRAFT_API__ = '${URLS.commerceApi}';
</script>
`;
    if (indexHtml.includes('<head>')) {
      indexHtml = indexHtml.replace('<head>', `<head>${runtimeScript}`);
    } else {
      indexHtml = runtimeScript + indexHtml;
    }

    // Dynamic configuration endpoint
    app.get('/marketplace-config.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.send(`
window.__RENTIFY_MARKETPLACE__ = {
  coreApiUrl: '${URLS.coreApi}',
  commerceApiUrl: '${URLS.commerceApi}',
  authUrl: '${URLS.coreApi}',
  marketingUrl: '${URLS.marketplace}',
  merchantDashboardUrl: '${URLS.merchant}',
  adminDashboardUrl: '${URLS.merchant}'
};
window.__KHMERCRAFT_API__ = '${URLS.commerceApi}';
`);
    });

    // Proxy API requests to real Commerce server
    app.use('/api', (req, res) => {
      const targetUrl = `${URLS.commerceApi}${req.originalUrl}`;
      const parsed = new URL(targetUrl);
      const options = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${PORT_COMMERCE}` },
      };
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });
      proxyReq.on('error', (err) => {
        res.status(502).json({ error: 'Proxy to Commerce API failed', details: err.message });
      });
      req.pipe(proxyReq, { end: true });
    });

    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { index: false }));
    }

    // SPA fallback
    app.get('*', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(indexHtml);
    });

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(PORT_MARKETPLACE, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    });
  }

  _startMerchantServer() {
    const app = express();
    const merchantDist = path.join(ROOT_DIR, 'rentify-frontend/dist/apps/core/merchant');
    const merchantIndex = path.join(merchantDist, 'index.html');

    let merchantHtml = fs.existsSync(merchantIndex)
      ? fs.readFileSync(merchantIndex, 'utf8')
      : '<!DOCTYPE html><html><head><title>Rentify Merchant</title></head><body><div id="root">Merchant App</div></body></html>';

    // Proxy API requests to real Core server
    app.use('/api', (req, res) => {
      const targetUrl = `${URLS.coreApi}${req.originalUrl}`;
      const parsed = new URL(targetUrl);
      const options = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${PORT_CORE}` },
      };
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });
      proxyReq.on('error', (err) => {
        res.status(502).json({ error: 'Proxy to Core API failed', details: err.message });
      });
      req.pipe(proxyReq, { end: true });
    });

    if (fs.existsSync(merchantDist)) {
      app.use(express.static(merchantDist, { index: false }));
    }

    app.get('*', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(merchantHtml);
    });

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(PORT_MERCHANT, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    });
  }

  /**
   * Stops all services, servers, and cleans up database fixtures.
   */
  async stop() {
    this.log('orchestrator', 'Stopping test servers and processes...');

    // Close static HTTP servers
    for (const [name, server] of Object.entries(this.servers)) {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
        this.servers[name] = null;
      }
    }

    // Terminate child processes
    for (const [name, proc] of Object.entries(this.procs)) {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
        this.procs[name] = null;
      }
    }

    // Clean up database fixtures
    if (this.scenario) {
      try {
        await teardownTestDatabases(this.scenario);
        this.log('fixtures', 'Teardown completed for Core and Commerce test fixtures.');
      } catch (err) {
        this.log('fixtures-error', `Teardown failed: ${err.message}`);
      }
      this.scenario = null;
    }

    this.isRunning = false;
  }
}

module.exports = {
  E2EServerManager,
};
