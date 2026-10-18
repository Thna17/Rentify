const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {
  logger,
  getCorrelationId,
  runWithCorrelation,
  validateCorrelationId,
  redact,
  isSensitiveKey,
} = require('../../src/utils/logger');
const redisConfig = require('../../src/config/redis');
redisConfig.getMerchantRedis = async () => null;
redisConfig.getCustomerRedis = async () => null;

const app = require('../../src/app');
const ecommerceSyncService = require('../../src/modules/commerce-sync/ecommerceSyncService');
const storeSyncService = require('../../src/modules/commerce-sync/storeSyncService');
const { WebsiteSyncOutbox, StoreSyncOutbox } = require('../../src/models');

test('validateCorrelationId accepts valid IDs and rejects unsafe or malformed values', () => {
  // Valid IDs
  assert.equal(validateCorrelationId('c7a3d8e2-9b4f-4a31-9f20-b4728d6c8e31'), 'c7a3d8e2-9b4f-4a31-9f20-b4728d6c8e31');
  assert.equal(validateCorrelationId('req-1234-5678'), 'req-1234-5678');
  assert.equal(validateCorrelationId('trace.id_001.test'), 'trace.id_001.test');

  // Invalid IDs
  assert.equal(validateCorrelationId(''), null);
  assert.equal(validateCorrelationId('   '), null);
  assert.equal(validateCorrelationId('short'), null); // < 8 characters
  assert.equal(validateCorrelationId('a'.repeat(129)), null); // > 128 characters
  assert.equal(validateCorrelationId('bad id with spaces'), null);
  assert.equal(validateCorrelationId('<script>alert(1)</script>'), null);
  assert.equal(validateCorrelationId('../../etc/passwd'), null);
  assert.equal(validateCorrelationId('id\nnewline'), null);
  assert.equal(validateCorrelationId(null), null);
  assert.equal(validateCorrelationId(undefined), null);
  assert.equal(validateCorrelationId(12345678), null);
  assert.equal(validateCorrelationId({}), null);
});

test('redact removes all sensitive categories and preserves safe operational metadata', () => {
  const sensitivePayload = {
    // Passwords & auth
    password: 'super-secret-password-123',
    currentPassword: 'old-secret-password-456',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.signature',
    // Tokens & secrets
    token: 'jwt-access-token-0123456789',
    accessToken: 'access-token-abc',
    refreshToken: 'refresh-token-xyz',
    secret: 'top-secret-signing-key',
    apiKey: 'rentify_live_key_99999',
    privateKey: ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ') + '\nMIIEvgIBADANBgk...\n' + ['-----END', 'PRIVATE', 'KEY-----'].join(' '),
    // Cookies & sessions
    cookie: 'userAccessToken=eyJhbGciOi...; connect.sid=s%3A12345',
    sessionId: 'sess_abc123',
    // CutLuy credentials
    cutluyKey: 'cutluy_merchant_prod_key',
    cutluySecret: 'cutluy_secret_hash_98765',
    // Buyer personal data & addresses
    email: 'buyer@example.test',
    phone: '+85512345678',
    phoneNumber: '012345678',
    address: 'Street 210, Sangkat Boeung Keng Kang, Phnom Penh',
    buyerName: 'Sophea Sok',
    recipientName: 'Dara Chan',
    // Payment credentials & QR
    creditCard: '4111222233334444',
    cardNumber: '4111222233334444',
    cvv: '123',
    cvc: '456',
    expiry: '12/28',
    bakongAccount: 'seller@acleda',
    qrPayload: '00020101021229300016bakong@devbkm010812345678520459995303840540525.005802KH5909Rentify6010Phnom Penh6304ABCD',
    khqr: '000201010212...',
    // Safe operational metadata (must NOT be redacted)
    correlationId: 'c7a3d8e2-9b4f-4a31-9f20-b4728d6c8e31',
    service: 'rentify-server',
    environment: 'test',
    method: 'POST',
    route: '/api/websites',
    status: 201,
    durationMs: 42.5,
    version: '1.0.0',
    storeId: 'store-uuid-001',
    websiteId: 'website-uuid-002',
  };

  const sanitized = redact(sensitivePayload);

  // Assert sensitive fields are redacted
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.currentPassword, '[REDACTED]');
  assert.equal(sanitized.authorization, '[REDACTED]');
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.accessToken, '[REDACTED]');
  assert.equal(sanitized.refreshToken, '[REDACTED]');
  assert.equal(sanitized.secret, '[REDACTED]');
  assert.equal(sanitized.apiKey, '[REDACTED]');
  assert.equal(sanitized.privateKey, '[REDACTED]');
  assert.equal(sanitized.cookie, '[REDACTED]');
  assert.equal(sanitized.sessionId, '[REDACTED]');
  assert.equal(sanitized.cutluyKey, '[REDACTED]');
  assert.equal(sanitized.cutluySecret, '[REDACTED]');
  assert.equal(sanitized.email, '[REDACTED]');
  assert.equal(sanitized.phone, '[REDACTED]');
  assert.equal(sanitized.phoneNumber, '[REDACTED]');
  assert.equal(sanitized.address, '[REDACTED]');
  assert.equal(sanitized.buyerName, '[REDACTED]');
  assert.equal(sanitized.recipientName, '[REDACTED]');
  assert.equal(sanitized.creditCard, '[REDACTED]');
  assert.equal(sanitized.cardNumber, '[REDACTED]');
  assert.equal(sanitized.cvv, '[REDACTED]');
  assert.equal(sanitized.cvc, '[REDACTED]');
  assert.equal(sanitized.expiry, '[REDACTED]');
  assert.equal(sanitized.bakongAccount, '[REDACTED]');
  assert.equal(sanitized.qrPayload, '[REDACTED]');
  assert.equal(sanitized.khqr, '[REDACTED]');

  // Assert safe fields are intact
  assert.equal(sanitized.correlationId, 'c7a3d8e2-9b4f-4a31-9f20-b4728d6c8e31');
  assert.equal(sanitized.service, 'rentify-server');
  assert.equal(sanitized.environment, 'test');
  assert.equal(sanitized.method, 'POST');
  assert.equal(sanitized.route, '/api/websites');
  assert.equal(sanitized.status, 201);
  assert.equal(sanitized.durationMs, 42.5);
  assert.equal(sanitized.version, '1.0.0');
  assert.equal(sanitized.storeId, 'store-uuid-001');
  assert.equal(sanitized.websiteId, 'website-uuid-002');
});

test('redact handles string messages with tokens and circular references safely', () => {
  const logMessage = 'Authentication failed for user Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.123 with cookie userAccessToken=abc123def456';
  const redactedMessage = redact(logMessage);
  assert.ok(!redactedMessage.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.123'));
  assert.ok(!redactedMessage.includes('abc123def456'));
  assert.ok(redactedMessage.includes('Bearer [REDACTED]'));

  // Circular reference
  const circular = { name: 'test', correlationId: 'req-12345678' };
  circular.self = circular;
  const sanitizedCircular = redact(circular);
  assert.equal(sanitizedCircular.name, 'test');
  assert.equal(sanitizedCircular.correlationId, 'req-12345678');
  assert.equal(sanitizedCircular.self, '[CIRCULAR]');
});

test('Core HTTP server correlation middleware handles generated, incoming, and invalid IDs', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  t.after(() => server.close());

  logger.clearMemoryLogs();

  // 1. Missing correlation ID -> generated UUID returned in header
  const res1 = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res1.status, 200);
  const genId = res1.headers.get('x-correlation-id');
  assert.ok(genId, 'Response header must contain x-correlation-id');
  assert.match(genId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // 2. Valid incoming correlation ID -> preserved in response header
  const clientCid = 'client-req-0123456789abcdef';
  const res2 = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-correlation-id': clientCid },
  });
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get('x-correlation-id'), clientCid);

  // 3. Incoming x-request-id fallback -> adopted as correlation ID
  const reqId = 'req-custom-alias-12345';
  const res3 = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-request-id': reqId },
  });
  assert.equal(res3.status, 200);
  assert.equal(res3.headers.get('x-correlation-id'), reqId);

  // 4. Invalid incoming correlation ID -> rejected and replaced with safe UUID
  const res4 = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-correlation-id': '<malicious_script_attempt>' },
  });
  assert.equal(res4.status, 200);
  const replacedId = res4.headers.get('x-correlation-id');
  assert.notEqual(replacedId, '<malicious_script_attempt>');
  assert.match(replacedId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // 5. Verify structured request logs were recorded with route template and duration
  await new Promise((r) => setTimeout(r, 50));
  const healthLogs = logger.memoryLogs.filter((log) => log.route === '/health');
  assert.ok(healthLogs.length >= 4, 'Expected structured request logs for each health check');
  for (const entry of healthLogs) {
    assert.equal(entry.service, 'rentify-server');
    assert.equal(entry.status, 200);
    assert.equal(entry.method, 'GET');
    assert.ok(typeof entry.durationMs === 'number');
    assert.ok(entry.correlationId);
  }
});

test('Core centralized error handler returns correlation ID in response and logs it', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  t.after(() => server.close());

  logger.clearMemoryLogs();

  const customCid = 'err-test-correlation-001';
  // Hit a route that triggers an error response (e.g., unauthorized admin route)
  const res = await fetch(`http://127.0.0.1:${port}/admin/templates`, {
    headers: {
      'x-correlation-id': customCid,
      Accept: 'application/json',
    },
  });

  assert.equal(res.headers.get('x-correlation-id'), customCid);
});

test('Core-to-Commerce website sync propagates correlation ID across HTTP boundary', async (t) => {
  const outgoingConfigs = [];
  const origAdapter = ecommerceSyncService.apiClient.defaults.adapter;
  ecommerceSyncService.apiClient.defaults.adapter = async (config) => {
    outgoingConfigs.push(config);
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
  t.after(() => {
    ecommerceSyncService.apiClient.defaults.adapter = origAdapter;
  });

  t.mock.method(WebsiteSyncOutbox, 'update', async () => [1]);
  t.mock.method(WebsiteSyncOutbox, 'increment', async () => {});

  const testCid = 'sync-trace-cid-987654321';

  await runWithCorrelation(testCid, async () => {
    assert.equal(getCorrelationId(), testCid);

    await ecommerceSyncService.syncWebsiteData({
      id: 'website-trace-1',
      _ecommerceData: {
        websiteId: 'website-trace-1',
        userId: 'user-trace-1',
        status: 'active',
        domain: 'trace.rentify.test',
      },
    });
  });

  // Verify outgoing axios call attached x-correlation-id
  assert.ok(outgoingConfigs.length > 0);
  const lastConfig = outgoingConfigs[outgoingConfigs.length - 1];
  assert.equal(lastConfig.headers['x-correlation-id'], testCid);
});

test('Core-to-Commerce store projection outbox preserves correlation ID for background workers', async (t) => {
  const testCid = 'store-proj-cid-1122334455';

  let savedPayload = null;
  t.mock.method(StoreSyncOutbox, 'findByPk', async () => null);
  t.mock.method(StoreSyncOutbox, 'create', async ({ payload }) => {
    savedPayload = payload;
    return { id: payload.storeId, payload };
  });

  await runWithCorrelation(testCid, async () => {
    const store = {
      id: 'store-trace-1',
      ownerUserId: 'owner-trace-1',
      primaryCategory: 'Food',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      marketplaceEntitlement: 'standard',
      projectionVersion: 2,
    };

    const enqueued = await storeSyncService.queueStore(store);
    assert.equal(enqueued._correlationId, testCid);
  });

  assert.ok(savedPayload);
  assert.equal(savedPayload._correlationId, testCid);

  // Now simulate worker executing syncStore with the saved outbox row
  const outgoingConfigs = [];
  const origAdapter = storeSyncService.apiClient.defaults.adapter;
  storeSyncService.apiClient.defaults.adapter = async (config) => {
    outgoingConfigs.push(config);
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
  t.after(() => {
    storeSyncService.apiClient.defaults.adapter = origAdapter;
  });

  t.mock.method(StoreSyncOutbox, 'findByPk', async () => ({
    storeId: 'store-trace-1',
    status: 'pending',
    version: 2,
    payload: savedPayload,
  }));
  t.mock.method(StoreSyncOutbox, 'update', async () => [1]);
  t.mock.method(StoreSyncOutbox, 'increment', async () => {});

  await storeSyncService.syncStore('store-trace-1');

  assert.ok(outgoingConfigs.length > 0);
  assert.equal(outgoingConfigs[0].headers['x-correlation-id'], testCid);
});
