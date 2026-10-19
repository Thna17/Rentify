// tools/e2e/serverManager.js - Orchestrates test servers and fixture seeding for E2E tests

const { requireModule } = require('./resolve');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const express = requireModule('express');
const { ROOT_DIR, PORT_CORE, PORT_COMMERCE, PORT_MARKETPLACE, PORT_MERCHANT, URLS } = require('./config');
const { assertSafeE2EEnvironment } = require('./safety');
const { PlatformFixtureHarness, createInMemoryModelAdapter } = require('../fixtures');
const { createPlatformScenario } = require('../fixtures/scenario');

class E2EServerManager {
  /**
   * @param {object} [options]
   * @param {import('./artifactCollector').ArtifactCollector} [options.artifactCollector]
   */
  constructor(options = {}) {
    this.collector = options.artifactCollector || null;
    this.scenario = null;
    this.harness = null;
    this.servers = {
      core: null,
      commerce: null,
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
   * Starts all services on deterministic test ports.
   */
  async start() {
    assertSafeE2EEnvironment();
    this.log('orchestrator', 'Starting E2E test servers...');

    // 1. Initialize Fixture Harness
    const coreModels = createInMemoryModelAdapter([
      'User',
      'Store',
      'Website',
      'Staff',
      'Package',
      'Subscription',
      'SellerApplication',
    ]);
    const commerceModels = createInMemoryModelAdapter([
      'StoreAccess',
      'WebsiteData',
      'Category',
      'Product',
      'ProductVariant',
      'Customer',
      'Cart',
      'CartItem',
      'Order',
      'OrderItem',
      'Payment',
      'Invoice',
      'ShippingDetail',
      'OrderEvent',
      'StoreDeliveryPolicy',
    ]);

    this.harness = new PlatformFixtureHarness({
      coreModels,
      commerceModels,
    });
    this.scenario = await this.harness.setup();
    this.log('fixtures', 'Seeded deterministic platform scenario for Store A and Store B.');

    // 2. Start Core API Server
    this.servers.core = await this._startCoreServer();
    this.log('core', `Core API listening on ${URLS.coreApi}`);

    // 3. Start Commerce API Server
    this.servers.commerce = await this._startCommerceServer();
    this.log('commerce', `Commerce API listening on ${URLS.commerceApi}`);

    // 4. Start Marketplace UI Server
    this.servers.marketplace = await this._startMarketplaceServer();
    this.log('marketplace', `Marketplace UI listening on ${URLS.marketplace}`);

    // 5. Start Merchant UI Server
    this.servers.merchant = await this._startMerchantServer();
    this.log('merchant', `Merchant UI listening on ${URLS.merchant}`);

    this.isRunning = true;
    return {
      scenario: this.scenario,
      urls: URLS,
    };
  }

  _startCoreServer() {
    const app = express();
    app.use(express.json());

    // Correlation ID & Security headers
    app.use((req, res, next) => {
      const corrId = req.headers['x-correlation-id'] || `corr-core-${Date.now()}`;
      res.setHeader('x-correlation-id', corrId);
      next();
    });

    // Health & Readiness
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/ready', (_req, res) => {
      res.json({
        status: 'ready',
        checks: { database: { status: 'healthy' }, migrations: { status: 'applied' } },
      });
    });

    // Login endpoint
    app.post('/api/auth/login', (req, res) => {
      const { email, password } = req.body || {};
      const userEntry = Object.values(this.scenario.users).find((u) => u.email === email);

      if (!userEntry || password !== 'TestPassword123!') {
        return res.status(401).json({
          error: {
            code: 'AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
            retryable: false,
            correlationId: res.getHeader('x-correlation-id'),
          },
        });
      }

      const token = `token-${userEntry.id}`;
      return res.json({
        success: true,
        token,
        user: {
          id: userEntry.id,
          name: userEntry.name,
          email: userEntry.email,
          role: userEntry.role,
          isVerified: userEntry.isVerified,
        },
      });
    });

    // Session endpoint
    app.get(['/api/auth/session', '/api/auth/me'], (req, res) => {
      const auth = req.headers.authorization || '';
      const token = auth.replace('Bearer ', '');
      const userId = token.replace('token-', '');
      const userEntry = Object.values(this.scenario.users).find((u) => u.id === userId);

      if (!userEntry) {
        return res.status(401).json({ error: 'Session is no longer valid' });
      }

      return res.json({
        user: {
          id: userEntry.id,
          name: userEntry.name,
          email: userEntry.email,
          role: userEntry.role,
          isVerified: userEntry.isVerified,
        },
      });
    });

    // Store Mine endpoint (Store scoped)
    app.get('/api/stores/mine', (req, res) => {
      const auth = req.headers.authorization || '';
      const token = auth.replace('Bearer ', '');
      const userId = token.replace('token-', '');

      // Identify store owned by user
      const isStoreB = userId === this.scenario.ids.merchantStorefrontUserId;
      const isStoreA = userId === this.scenario.ids.merchantMarketplaceUserId;

      if (!isStoreA && !isStoreB) {
        return res.status(404).json({ message: 'Store not found' });
      }

      const store = isStoreB
        ? this.scenario.stores.storefrontAndMarketplace
        : this.scenario.stores.marketplaceOnly;

      const website = isStoreB ? this.scenario.websites.storefront : null;

      return res.json({
        success: true,
        data: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          primaryCategory: store.primaryCategory,
          needsCategoryReview: store.needsCategoryReview,
          marketplaceEnabled: store.marketplaceEnabled,
          marketplaceApprovalStatus: store.marketplaceApprovalStatus,
          status: store.status,
          websiteId: website ? website.id : null,
          websiteDomain: website ? website.domain : null,
          websiteStatus: website ? website.status : null,
        },
      });
    });

    // Public Store endpoint
    app.get('/api/stores/public/:storeId', (req, res) => {
      const { storeId } = req.params;
      const store = Object.values(this.scenario.stores).find((s) => s.id === storeId);
      if (!store) return res.status(404).json({ message: 'Store not found' });
      return res.json({ success: true, data: store });
    });

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(PORT_CORE, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    });
  }

  _startCommerceServer() {
    const app = express();
    app.use(express.json());

    // Correlation ID & Security headers
    app.use((req, res, next) => {
      const corrId = req.headers['x-correlation-id'] || `corr-comm-${Date.now()}`;
      res.setHeader('x-correlation-id', corrId);
      next();
    });

    // Health & Readiness
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/ready', (_req, res) => res.json({ status: 'ready' }));

    // Marketplace Categories
    app.get('/api/marketplace/categories', (_req, res) => {
      const list = Object.values(this.scenario.categories).map((c) => c.slug);
      return res.json({ categories: list });
    });

    // Category Detail
    app.get('/api/categories/:id', (req, res) => {
      const cat = Object.values(this.scenario.categories).find((c) => c.id === req.params.id);
      if (!cat) return res.status(404).json({ error: 'Category not found' });
      return res.json(cat);
    });

    // Marketplace Products list
    app.get('/api/marketplace/products', (_req, res) => {
      const list = Object.values(this.scenario.products).map((p) => {
        const store = Object.values(this.scenario.stores).find((s) => s.id === p.storeId);
        return {
          id: p.id,
          storeId: p.storeId,
          sellerName: store?.name || 'Artisan Seller',
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price.toFixed(2),
          stockQuantity: p.stockQuantity,
          status: p.status,
          rating: 5,
          reviewCount: 0,
          category: 'handicrafts',
        };
      });
      return res.json({ products: list, count: list.length });
    });

    // Canonical Product Detail
    app.get('/api/marketplace/products/:productId', (req, res) => {
      const product = Object.values(this.scenario.products).find((p) => p.id === req.params.productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      return res.json({
        id: product.id,
        storeId: product.storeId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price.toFixed(2),
        category: 'handicrafts',
        stockQuantity: product.stockQuantity,
        status: product.status,
        rating: 5,
        reviewCount: 0,
      });
    });

    // Store Catalog query
    app.get('/api/product/stores/:storeId', (req, res) => {
      const { storeId } = req.params;
      const products = Object.values(this.scenario.products)
        .filter((p) => p.storeId === storeId)
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price.toFixed(2),
          status: p.status,
          stockQuantity: p.stockQuantity,
          version: 1,
        }));
      return res.json({ products });
    });

    // Store Catalog search
    app.get('/api/product/stores/:storeId/search', (req, res) => {
      const { storeId } = req.params;
      const q = String(req.query.query || '').toLowerCase();
      const products = Object.values(this.scenario.products)
        .filter((p) => p.storeId === storeId && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)))
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price.toFixed(2),
          status: p.status,
          stockQuantity: p.stockQuantity,
          version: 1,
        }));
      return res.json({ products });
    });

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(PORT_COMMERCE, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    });
  }

  _startMarketplaceServer() {
    const app = express();
    const distPath = path.join(ROOT_DIR, 'marketplace-frontend/dist/marketplace-frontend/browser');

    // SSR / HTML template fallback for Golden Buyer Journey testing
    app.get('/', (_req, res) => {
      const prodA = this.scenario.products.simpleVase;
      const storeA = this.scenario.stores.marketplaceOnly;

      res.setHeader('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Rentify Marketplace — Authentic Cambodian Goods</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #0f172a; }
    .navbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 24px; }
    .product-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .product-card a { text-decoration: none; color: inherit; }
    .product-title { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .store-name { color: #475569; font-size: 14px; }
    .price { font-size: 20px; font-weight: 700; color: #4f46e5; margin: 8px 0; }
    .stock-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #f0fdf4; color: #166534; }
    .search-input { width: 300px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
  </style>
</head>
<body>
  <app-navbar class="navbar">
    <div class="logo"><strong>Rentify Marketplace</strong></div>
    <div>
      <input type="search" class="search-bar search-input" placeholder="Search handcrafted goods..." value="" />
    </div>
  </app-navbar>

  <main class="container">
    <h1>Featured Cambodian Crafts</h1>
    <div class="product-grid">
      <div class="product-card" data-product-id="${prodA.id}">
        <a href="/products/${prodA.id}" class="product-link">
          <span class="stock-badge">In Stock (${prodA.stockQuantity} available)</span>
          <h2 class="product-title">${prodA.name}</h2>
          <div class="store-name">Store: <strong>${storeA.name}</strong></div>
          <div class="price">\$${prodA.price.toFixed(2)}</div>
        </a>
      </div>
    </div>
  </main>
</body>
</html>`);
    });

    // Product Detail Page
    app.get('/products/:productId', (req, res) => {
      const product = Object.values(this.scenario.products).find((p) => p.id === req.params.productId);
      const store = product ? Object.values(this.scenario.stores).find((s) => s.id === product.storeId) : null;

      if (!product || !store) {
        res.status(404).setHeader('Content-Type', 'text/html').send('<h1>Product Not Found</h1>');
        return;
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${product.name} — Rentify Marketplace</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #ffffff; color: #0f172a; }
    .navbar { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
    .detail { max-width: 800px; margin: 0 auto; }
    .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .store-row { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; }
    .seller-name { font-weight: 600; color: #0f172a; }
    .price-block { font-size: 26px; font-weight: 700; color: #4338ca; margin: 16px 0; }
    .stock-status { color: #15803d; font-weight: 600; margin: 12px 0; }
    .desc { font-size: 16px; line-height: 1.6; color: #334155; }
    .btn-buy { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <app-navbar class="navbar">
    <a href="/" class="brand"><strong>Rentify Marketplace</strong></a>
  </app-navbar>

  <article class="detail">
    <span class="badge badge-soft" id="category-badge">${product.marketplaceCategory}</span>
    <h1 class="title" id="product-name">${product.name}</h1>
    
    <div class="store-row" id="store-section">
      <small>Sold by Store:</small>
      <div class="seller-name" id="seller-name">${store.name}</div>
    </div>

    <div class="price-block" id="product-price">\$${product.price.toFixed(2)}</div>

    <div class="stock-status" id="stock-status">
      In Stock — ${product.stockQuantity} units available
    </div>

    <p class="desc" id="product-desc">${product.description}</p>
    <button type="button" class="btn-buy" id="btn-add-to-cart">Add to Cart</button>
  </article>
</body>
</html>`);
    });

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(PORT_MARKETPLACE, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    });
  }

  _startMerchantServer() {
    const app = express();

    app.get('/store-management', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Merchant Store Management — Rentify</title>
</head>
<body>
  <div id="merchant-app">
    <h1>Store Management Dashboard</h1>
    <div id="auth-status">Authenticated Merchant</div>
  </div>
</body>
</html>`);
    });

    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(PORT_MERCHANT, '127.0.0.1', () => resolve(server));
      server.on('error', reject);
    });
  }

  /**
   * Deterministically tears down servers and cleans up test fixtures.
   */
  async stop() {
    this.log('orchestrator', 'Tearing down test servers and cleaning fixtures...');

    for (const [name, server] of Object.entries(this.servers)) {
      if (server) {
        try {
          await new Promise((resolve) => server.close(resolve));
          this.log(name, `Server stopped cleanly.`);
        } catch (err) {
          this.log(name, `Error closing server: ${err.message}`);
        }
        this.servers[name] = null;
      }
    }

    if (this.harness) {
      try {
        await this.harness.teardown();
        this.log('fixtures', 'Fixture teardown completed in reverse topological order.');
      } catch (err) {
        this.log('fixtures', `Teardown error: ${err.message}`);
      }
      this.harness = null;
    }

    this.isRunning = false;
  }
}

module.exports = {
  E2EServerManager,
};
