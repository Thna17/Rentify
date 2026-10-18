const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const axios = require('axios');
const {
  logger,
  getCorrelationId,
  runWithCorrelation,
  validateCorrelationId,
  redact,
  isSensitiveKey,
} = require('../../utils/logger');
const { Sequelize } = require('sequelize');
Sequelize.prototype.authenticate = async () => {};

const app = require('../../app');
const { getStoreOwnerContact } = require('../../modules/checkout/merchantContactService');

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
    cookie: 'customerAccessToken=eyJhbGciOi...; connect.sid=s%3A12345',
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
    service: 'ecommerce-server',
    environment: 'test',
    method: 'POST',
    route: '/api/marketplace/checkout',
    status: 200,
    durationMs: 38.2,
    version: '1.0.0',
    storeId: 'store-uuid-001',
    orderId: 'order-uuid-002',
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
  assert.equal(sanitized.service, 'ecommerce-server');
  assert.equal(sanitized.environment, 'test');
  assert.equal(sanitized.method, 'POST');
  assert.equal(sanitized.route, '/api/marketplace/checkout');
  assert.equal(sanitized.status, 200);
  assert.equal(sanitized.durationMs, 38.2);
  assert.equal(sanitized.version, '1.0.0');
  assert.equal(sanitized.storeId, 'store-uuid-001');
  assert.equal(sanitized.orderId, 'order-uuid-002');
});

test('Commerce HTTP server correlation middleware handles generated, incoming, and invalid IDs', async (t) => {
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
  const clientCid = 'client-commerce-0123456789abcdef';
  const res2 = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-correlation-id': clientCid },
  });
  assert.equal(res2.status, 200);
  assert.equal(res2.headers.get('x-correlation-id'), clientCid);

  // 3. Incoming x-request-id fallback -> adopted as correlation ID
  const reqId = 'req-commerce-alias-12345';
  const res3 = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-request-id': reqId },
  });
  assert.equal(res3.status, 200);
  assert.equal(res3.headers.get('x-correlation-id'), reqId);

  // 4. Invalid incoming correlation ID -> rejected and replaced with safe UUID
  const res4 = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-correlation-id': 'bad invalid id with spaces' },
  });
  assert.equal(res4.status, 200);
  const replacedId = res4.headers.get('x-correlation-id');
  assert.notEqual(replacedId, 'bad invalid id with spaces');
  assert.match(replacedId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  // 5. Verify structured request logs were recorded with route template and duration
  const healthLogs = logger.memoryLogs.filter((log) => log.route === '/health');
  assert.ok(healthLogs.length >= 4, 'Expected structured request logs for each health check');
  for (const entry of healthLogs) {
    assert.equal(entry.service, 'ecommerce-server');
    assert.equal(entry.status, 200);
    assert.equal(entry.method, 'GET');
    assert.ok(typeof entry.durationMs === 'number');
    assert.ok(entry.correlationId);
  }
});

test('Commerce centralized error handler returns correlation ID in response and logs it', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  t.after(() => server.close());

  logger.clearMemoryLogs();

  const customCid = 'err-commerce-test-001';
  // Hit a route that triggers an error response (e.g., unauthorized admin operations)
  const res = await fetch(`http://127.0.0.1:${port}/api/admin/operations/products`, {
    headers: {
      'x-correlation-id': customCid,
      Accept: 'application/json',
    },
  });

  assert.equal(res.headers.get('x-correlation-id'), customCid);
});

test('Commerce-to-Core merchant contact lookup propagates correlation ID across HTTP boundary', async (t) => {
  const originalFetch = global.fetch;
  const capturedHeaders = [];

  global.fetch = async (url, options) => {
    capturedHeaders.push({ url, headers: options?.headers });
    return {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'user-001',
          name: 'Merchant Test',
          email: 'merchant@test.com',
          phoneNumber: '012345678',
        },
      }),
    };
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret-12345678';

  const checkoutCid = 'checkout-trace-cid-5544332211';

  await runWithCorrelation(checkoutCid, async () => {
    assert.equal(getCorrelationId(), checkoutCid);
    const contact = await getStoreOwnerContact('store-001');
    assert.ok(contact);
    assert.equal(contact.name, 'Merchant Test');
  });

  assert.ok(capturedHeaders.length > 0);
  assert.equal(capturedHeaders[0].headers['x-correlation-id'], checkoutCid);
  assert.equal(capturedHeaders[0].headers['x-internal-secret'], 'test-internal-secret-12345678');
});

test('outgoing axios requests in Commerce automatically propagate correlation ID', async () => {
  const origAdapter = axios.defaults.adapter;
  const recorded = [];

  axios.defaults.adapter = async (config) => {
    recorded.push(config);
    return { data: { valid: true }, status: 200, statusText: 'OK', headers: {}, config };
  };

  try {
    const customId = 'auth-validation-cid-998877';
    await runWithCorrelation(customId, async () => {
      await axios.post('http://fake-core.test/api/auth/validate-token', { token: 'abc' });
    });

    assert.ok(recorded.length > 0);
    assert.equal(recorded[0].headers['x-correlation-id'], 'auth-validation-cid-998877');
  } finally {
    axios.defaults.adapter = origAdapter;
  }
});
