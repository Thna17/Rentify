const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Stub dependencies before loading apps
const redisConfig = require('../../src/config/redis');
redisConfig.getMerchantRedis = async () => null;
redisConfig.getCustomerRedis = async () => null;

const { Sequelize } = require('sequelize');
Sequelize.prototype.authenticate = async () => {};

process.env.INTERNAL_SERVICE_SECRET = 'ci-internal-secret-for-tracing-test-12345';
process.env.SERVICE_TO_SERVICE_TOKEN = 'ci-service-token-for-tracing-test-12345';

const coreLoggerModule = require('../../src/utils/logger');
const commerceLoggerModule = require('../../../ecommerce-server/utils/logger');

const coreApp = require('../../src/app');
const commerceApp = require('../../../ecommerce-server/app');

const ecommerceSyncService = require('../../src/modules/commerce-sync/ecommerceSyncService');
const { getStoreOwnerContact } = require('../../../ecommerce-server/modules/checkout/merchantContactService');
const { WebsiteSyncOutbox, User, Store } = require('../../src/models');

test('Cross-service observability: trace correlation across Core and Commerce boundaries', async (t) => {
  // Start ephemeral test servers for both Core and Commerce
  const coreServer = http.createServer(coreApp);
  const commerceServer = http.createServer(commerceApp);

  await Promise.all([
    new Promise((resolve) => coreServer.listen(0, resolve)),
    new Promise((resolve) => commerceServer.listen(0, resolve)),
  ]);

  const corePort = coreServer.address().port;
  const commercePort = commerceServer.address().port;

  t.after(() => {
    coreServer.close();
    commerceServer.close();
  });

  // Point ecommerceSyncService to the ephemeral Commerce server
  const origCommerceUrl = ecommerceSyncService.apiClient.defaults.baseURL;
  ecommerceSyncService.apiClient.defaults.baseURL = `http://127.0.0.1:${commercePort}`;
  t.after(() => {
    ecommerceSyncService.apiClient.defaults.baseURL = origCommerceUrl;
  });

  // Clear memory logs
  coreLoggerModule.logger.clearMemoryLogs();
  commerceLoggerModule.logger.clearMemoryLogs();

  // -------------------------------------------------------------
  // Scenario 1: Signup-to-Projection (Core -> Commerce)
  // -------------------------------------------------------------
  const signupTraceId = 'trace-signup-001-c89b-4321';

  // Mock outbox updates to avoid database reliance in unit/integration check
  t.mock.method(WebsiteSyncOutbox, 'update', async () => [1]);
  t.mock.method(WebsiteSyncOutbox, 'increment', async () => {});

  const { WebsiteData } = require('../../../ecommerce-server/models');
  t.mock.method(WebsiteData, 'upsert', async () => [{ id: 'website-trace-001' }]);

  // Simulate Core executing website data projection sync to Commerce with the signup trace ID
  await coreLoggerModule.runWithCorrelation(signupTraceId, async () => {
    const websitePayload = {
      id: 'website-trace-001',
      _ecommerceData: {
        websiteId: 'website-trace-001',
        userId: 'merchant-trace-user-001',
        status: 'active',
        domain: 'store.trace.test',
      },
    };

    // Make the sync call to Commerce
    await ecommerceSyncService.syncWebsiteData(websitePayload);
  });

  // Allow async log flush
  await new Promise((r) => setTimeout(r, 60));

  // Find logs in Core with this trace ID
  const coreSignupLogs = coreLoggerModule.logger.memoryLogs.filter(
    (log) => log.correlationId === signupTraceId
  );
  assert.ok(coreSignupLogs.length > 0, 'Core must have logs with the signup trace ID');
  assert.equal(coreSignupLogs[0].service, 'rentify-server');

  // Find logs in Commerce with this same trace ID
  const commerceProjectionLogs = commerceLoggerModule.logger.memoryLogs.filter(
    (log) => log.correlationId === signupTraceId
  );
  assert.ok(commerceProjectionLogs.length > 0, 'Commerce must record logs with the propagated signup trace ID');
  assert.equal(commerceProjectionLogs[0].service, 'ecommerce-server');
  assert.ok(
    commerceProjectionLogs.some((l) => l.route?.includes('/api/website-data')),
    'Commerce must log the incoming website-data projection request'
  );

  // -------------------------------------------------------------
  // Scenario 2: Checkout-to-Merchant-Contact (Commerce -> Core)
  // -------------------------------------------------------------
  const checkoutTraceId = 'trace-checkout-002-d98c-8765';

  // Mock Core User / Store lookup in controller
  t.mock.method(Store, 'findByPk', async () => ({
    id: 'store-checkout-001',
    ownerUserId: 'user-merchant-001',
  }));
  t.mock.method(User, 'findByPk', async () => ({
    id: 'user-merchant-001',
    name: 'Merchant Test Owner',
    email: 'owner@merchant.test',
    contact: '012345678',
    telegramChatId: '123456789',
  }));

  // Update RENTIFY_API_BASE to the ephemeral Core server
  process.env.RENTIFY_API_URL = `http://127.0.0.1:${corePort}`;

  // Run in Commerce context with the checkout trace ID
  await commerceLoggerModule.runWithCorrelation(checkoutTraceId, async () => {
    commerceLoggerModule.logger.info('Processing checkout order', { storeId: 'store-checkout-001' });
    // Perform internal contact lookup as part of checkout order placement
    const contact = await getStoreOwnerContact('store-checkout-001');
    assert.ok(contact, 'Merchant contact must be returned from Core internal API');
    assert.equal(contact.name, 'Merchant Test Owner');
  });

  // Allow async log flush
  await new Promise((r) => setTimeout(r, 60));

  // Verify Commerce has logs with the checkout trace ID
  const commerceCheckoutLogs = commerceLoggerModule.logger.memoryLogs.filter(
    (log) => log.correlationId === checkoutTraceId
  );
  assert.ok(commerceCheckoutLogs.length > 0, 'Commerce must record logs with the checkout trace ID');

  // Verify Core recorded the internal lookup with the same checkout trace ID
  const coreInternalLogs = coreLoggerModule.logger.memoryLogs.filter(
    (log) => log.correlationId === checkoutTraceId
  );
  assert.ok(coreInternalLogs.length > 0, 'Core must record internal lookup logs with the propagated checkout trace ID');
  assert.equal(coreInternalLogs[0].service, 'rentify-server');
  assert.ok(
    coreInternalLogs.some((l) => l.route?.includes('/api/internal/store-owner')),
    'Core must log the internal store-owner lookup request with the matching correlation ID'
  );

  // -------------------------------------------------------------
  // Scenario 3: Redaction Proof across Core and Commerce
  // -------------------------------------------------------------
  // Log an event containing sensitive data in both services
  await coreLoggerModule.runWithCorrelation('redaction-check-cid-001', async () => {
    coreLoggerModule.logger.info('Simulated order payment webhook', {
      password: 'plain-password-leak',
      token: 'jwt-bearer-leak',
      authorization: 'Bearer secret-key-leak',
      cookie: 'userAccessToken=secret-cookie-leak',
      cutluyKey: 'secret-cutluy-key-leak',
      address: '123 Private Blvd, Phnom Penh',
      phone: '+85512345678',
      qrPayload: '00020101021229300016bakong@devbkm01...',
    });
  });

  await commerceLoggerModule.runWithCorrelation('redaction-check-cid-002', async () => {
    commerceLoggerModule.logger.info('Simulated checkout submission', {
      password: 'plain-password-leak',
      token: 'jwt-bearer-leak',
      authorization: 'Bearer secret-key-leak',
      cookie: 'customerAccessToken=secret-cookie-leak',
      cutluySecret: 'secret-cutluy-secret-leak',
      address: '456 Confidential Ave, Phnom Penh',
      phoneNumber: '098765432',
      qrPayload: '00020101021229300016bakong@devbkm01...',
    });
  });

  // Stringify all recorded logs from both services and verify zero sensitive values
  const allLogs = [
    ...coreLoggerModule.logger.memoryLogs,
    ...commerceLoggerModule.logger.memoryLogs,
  ];

  const serializedLogs = JSON.stringify(allLogs);

  const leakedKeywords = [
    'plain-password-leak',
    'jwt-bearer-leak',
    'secret-key-leak',
    'secret-cookie-leak',
    'secret-cutluy-key-leak',
    'secret-cutluy-secret-leak',
    '123 Private Blvd',
    '456 Confidential Ave',
    '098765432',
    '+85512345678',
    'bakong@devbkm01',
  ];

  for (const keyword of leakedKeywords) {
    assert.ok(
      !serializedLogs.includes(keyword),
      `Found leaked sensitive value "${keyword}" in captured structured logs!`
    );
  }
});
