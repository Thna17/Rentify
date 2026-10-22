// test/security/readinessHealth.test.js - Tests for P1-OBS-002 Commerce readiness and liveness probes
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const {
  checkDatabase,
  checkMigrations,
  checkRedis,
  checkWorkers,
  getReadinessReport,
  withTimeout,
  setTestOverrides,
  clearTestOverrides,
} = require('../../modules/health');

const app = require('../../app');
const { sequelize: defaultDb } = require('../../config/db');
const redisConfig = require('../../config/redis');

test.after(async () => {
  try {
    await defaultDb.close();
  } catch (_) {}
  try {
    redisConfig.redisClient?.disconnect();
    redisConfig.redisSubscriber?.disconnect();
  } catch (_) {}
});

test('liveness probe: GET /health returns 200 with minimal status and does not leak internals', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { 'x-correlation-id': 'commerce-liveness-001' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-correlation-id'), 'commerce-liveness-001');

    const body = await res.json();
    assert.deepEqual(body, { status: 'ok' });

    const bodyStr = JSON.stringify(body);
    assert.equal(bodyStr.includes('password'), false);
    assert.equal(bodyStr.includes('sequelize'), false);
    assert.equal(bodyStr.includes('mysql'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('readiness probe: GET /ready returns 200 when required dependencies are healthy', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.resolve(__dirname, '../../migrations');
  const diskFiles = fs.readdirSync(dir).filter((f) => /^\d+_.+\.js$/.test(f));

  const healthyDb = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async (sql) => {
      if (sql.includes('SELECT 1')) return [{ ready: 1 }];
      if (sql.includes('SequelizeMeta')) {
        return [diskFiles.map((name) => ({ name }))];
      }
      return [];
    },
    getQueryInterface: () => ({
      showAllTables: async () => ['SequelizeMeta', 'Orders', 'Products'],
    }),
  };

  setTestOverrides({ db: healthyDb });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/ready`, {
      headers: { 'x-correlation-id': 'commerce-readiness-001' },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-correlation-id'), 'commerce-readiness-001');

    const body = await res.json();
    assert.ok(body.status === 'ready' || body.status === 'degraded');
    assert.equal(body.service, 'ecommerce-server');
    assert.equal(body.version, '1.0.0');
    assert.ok(body.timestamp);
    assert.ok(body.checks);
    assert.equal(body.checks.database.required, true);
    assert.equal(body.checks.migrations.required, true);
    assert.equal(body.checks.redis.required, false);
    assert.equal(body.checks.workers.required, false);
  } finally {
    clearTestOverrides();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('database failure: causes readiness to fail (503) without crashing liveness (/health = 200)', async () => {
  const brokenDb = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:3306');
      err.code = 'ECONNREFUSED';
      throw err;
    },
    getQueryInterface: () => ({
      showAllTables: async () => {
        throw new Error('Connection refused');
      },
    }),
  };

  const report = await getReadinessReport({
    db: brokenDb,
    serviceName: 'ecommerce-server',
  });

  assert.equal(report.statusCode, 503);
  assert.equal(report.payload.status, 'not_ready');
  assert.equal(report.payload.checks.database.status, 'down');
  assert.equal(report.payload.checks.database.required, true);
  assert.equal(report.payload.checks.database.message, 'Database connection failed');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const livenessRes = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(livenessRes.status, 200);
    const livenessBody = await livenessRes.json();
    assert.equal(livenessBody.status, 'ok');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('pending migrations: missing SequelizeMeta or unapplied migration files fail readiness (503)', async () => {
  const dbMissingMeta = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async () => [{ ready: 1 }],
    getQueryInterface: () => ({
      showAllTables: async () => ['Orders', 'Products'],
    }),
  };

  const reportMeta = await getReadinessReport({
    db: dbMissingMeta,
    serviceName: 'ecommerce-server',
  });

  assert.equal(reportMeta.statusCode, 503);
  assert.equal(reportMeta.payload.status, 'not_ready');
  assert.equal(reportMeta.payload.checks.migrations.status, 'down');
  assert.equal(reportMeta.payload.checks.migrations.message, 'SequelizeMeta table missing');

  const dbPendingMigrations = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async (sql) => {
      if (sql.includes('SELECT 1')) return [{ ready: 1 }];
      if (sql.includes('SequelizeMeta')) {
        return [[{ name: '20260922_001_baseline_schema.js' }]];
      }
      return [];
    },
    getQueryInterface: () => ({
      showAllTables: async () => ['SequelizeMeta', 'Orders'],
    }),
  };

  const reportPending = await getReadinessReport({
    db: dbPendingMigrations,
    serviceName: 'ecommerce-server',
  });

  assert.equal(reportPending.statusCode, 503);
  assert.equal(reportPending.payload.status, 'not_ready');
  assert.equal(reportPending.payload.checks.migrations.status, 'down');
  assert.ok(reportPending.payload.checks.migrations.pendingCount > 0);
  assert.equal(reportPending.payload.checks.migrations.message, 'Pending migrations not applied');
});

test('optional dependency loss: Redis failure when REDIS_REQUIRED is unset does not fail readiness', async () => {
  const origRedisReq = process.env.REDIS_REQUIRED;
  delete process.env.REDIS_REQUIRED;

  const mockDb = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async (sql) => {
      if (sql.includes('SELECT 1')) return [{ ready: 1 }];
      if (sql.includes('SequelizeMeta')) {
        const fs = require('node:fs');
        const path = require('node:path');
        const dir = path.resolve(__dirname, '../../migrations');
        const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.js$/.test(f));
        return [files.map((name) => ({ name }))];
      }
      return [];
    },
    getQueryInterface: () => ({
      showAllTables: async () => ['SequelizeMeta', 'Orders'],
    }),
  };

  const brokenRedis = {
    redisClient: {
      status: 'end',
      ping: async () => {
        throw new Error('Redis connection refused');
      },
    },
  };

  try {
    const report = await getReadinessReport({
      db: mockDb,
      redis: brokenRedis,
      serviceName: 'ecommerce-server',
    });

    assert.equal(report.statusCode, 200);
    assert.equal(report.payload.status, 'degraded');
    assert.equal(report.payload.checks.database.status, 'up');
    assert.equal(report.payload.checks.migrations.status, 'up');
    assert.equal(report.payload.checks.redis.status, 'degraded');
    assert.equal(report.payload.checks.redis.required, false);
    assert.equal(report.payload.checks.redis.message, 'Redis unavailable (pubsub fallback active)');
  } finally {
    if (origRedisReq !== undefined) process.env.REDIS_REQUIRED = origRedisReq;
  }
});

test('required Redis loss: when REDIS_REQUIRED=true, Redis failure causes readiness to fail (503)', async () => {
  const origRedisReq = process.env.REDIS_REQUIRED;
  process.env.REDIS_REQUIRED = 'true';

  const mockDb = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async (sql) => {
      if (sql.includes('SELECT 1')) return [{ ready: 1 }];
      if (sql.includes('SequelizeMeta')) {
        const fs = require('node:fs');
        const path = require('node:path');
        const dir = path.resolve(__dirname, '../../migrations');
        const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.js$/.test(f));
        return [files.map((name) => ({ name }))];
      }
      return [];
    },
    getQueryInterface: () => ({
      showAllTables: async () => ['SequelizeMeta', 'Orders'],
    }),
  };

  const brokenRedis = {
    redisClient: {
      status: 'ready',
      ping: async () => {
        throw new Error('Connection reset by peer');
      },
    },
  };

  try {
    const report = await getReadinessReport({
      db: mockDb,
      redis: brokenRedis,
      serviceName: 'ecommerce-server',
    });

    assert.equal(report.statusCode, 503);
    assert.equal(report.payload.status, 'not_ready');
    assert.equal(report.payload.checks.redis.status, 'down');
    assert.equal(report.payload.checks.redis.required, true);
    assert.equal(report.payload.checks.redis.message, 'Redis connection failed');
  } finally {
    if (origRedisReq !== undefined) {
      process.env.REDIS_REQUIRED = origRedisReq;
    } else {
      delete process.env.REDIS_REQUIRED;
    }
  }
});

test('security guardrail: responses do not leak secrets, database credentials, hostnames, or ports', async () => {
  const sensitiveHost = 'commerce-db-internal.production.rentify.local';
  const sensitiveUser = 'ecommerce_master';
  const sensitivePass = 'super-secret-commerce-pass-5678!';

  const brokenDb = {
    QueryTypes: { SELECT: 'SELECT' },
    query: async () => {
      const err = new Error(`Connection to ${sensitiveHost}:3306 failed for user ${sensitiveUser} with pass ${sensitivePass}`);
      err.host = sensitiveHost;
      err.port = 3306;
      err.user = sensitiveUser;
      throw err;
    },
    getQueryInterface: () => ({
      showAllTables: async () => {
        throw new Error(`Failed to query tables on ${sensitiveHost}`);
      },
    }),
  };

  const report = await getReadinessReport({
    db: brokenDb,
    serviceName: 'ecommerce-server',
  });

  const serialized = JSON.stringify(report.payload);
  assert.equal(serialized.includes(sensitiveHost), false, 'Must not leak database hostname');
  assert.equal(serialized.includes(sensitiveUser), false, 'Must not leak database user');
  assert.equal(serialized.includes(sensitivePass), false, 'Must not leak database password');
  assert.equal(serialized.includes('3306'), false, 'Must not leak internal port');
  assert.equal(serialized.includes('password'), false, 'Must not contain password key');
  assert.equal(serialized.includes('ECONNREFUSED'), false, 'Must not leak raw socket error');
});

test('bounded execution: hanging dependency check aborts within bounded timeout', async () => {
  const hangingDb = {
    QueryTypes: { SELECT: 'SELECT' },
    query: () =>
      new Promise((resolve) => {
        setTimeout(() => resolve([{ ready: 1 }]), 120);
      }),
    getQueryInterface: () => ({
      showAllTables: async () => [],
    }),
  };

  const start = Date.now();
  const checkResult = await checkDatabase(hangingDb, 30);
  const elapsed = Date.now() - start;

  assert.ok(elapsed >= 25 && elapsed < 200, `Expected bounded timeout around 30ms, took ${elapsed}ms`);
  assert.equal(checkResult.status, 'down');
  assert.equal(checkResult.message, 'Database check timed out');

  await new Promise((resolve) => setTimeout(resolve, 150));
});
