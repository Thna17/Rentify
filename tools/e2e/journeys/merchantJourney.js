// tools/e2e/journeys/merchantJourney.js - Authenticated Merchant Read Journey (@merchant, @golden, @contract)

const assert = require('node:assert/strict');
const { BrowserSession } = require('../browserShell');

async function runMerchantJourney({ serverManager, contractValidator, artifactCollector }) {
  const browser = new BrowserSession({ artifactCollector });
  const scenario = serverManager.scenario;
  const urls = serverManager.servers ? require('../config').URLS : {};

  try {
    artifactCollector.recordConsole('Starting Authenticated Merchant Read Journey (@merchant, @golden)...');

    // 1. Sign in using safe test fixtures (Store B merchant: Bopha Silk)
    const merchantBUser = scenario.users.storefrontMerchant;
    const loginPayload = {
      email: merchantBUser.email,
      password: 'TestPassword123!',
    };

    const loginRes = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-merchant-trace-201',
      },
      body: JSON.stringify(loginPayload),
    });

    assert.equal(loginRes.status, 200, `Merchant login should return 200, got ${loginRes.status}`);
    const loginHeaders = Object.fromEntries(loginRes.headers.entries());
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Login response must include auth token');
    assert.equal(loginData.user.id, merchantBUser.id);

    // Validate login against Core OpenAPI contract
    contractValidator.validateResponse('core', 'POST', '/api/auth/login', 200, loginData, loginHeaders);

    const tokenB = loginData.token;

    // 2. Validate session endpoint (GET /api/auth/session)
    const sessionRes = await fetch(`${urls.coreApi}/api/auth/session`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-correlation-id': 'e2e-merchant-trace-202',
      },
    });
    assert.equal(sessionRes.status, 200);
    const sessionHeaders = Object.fromEntries(sessionRes.headers.entries());
    const sessionData = await sessionRes.json();
    assert.equal(sessionData.user.id, merchantBUser.id);
    contractValidator.validateResponse('core', 'GET', '/api/auth/session', 200, sessionData, sessionHeaders);

    // 3. Open merchant-facing page
    const merchantPageResult = await browser.goto(`${urls.merchant}/store-management`);
    assert.equal(merchantPageResult.ok, true, `Merchant store management page should return 200`);
    await browser.waitForSelector('#merchant-app');
    await browser.waitForSelector('#auth-status');

    // 4. Read Store-scoped information (GET /api/stores/mine) for Storefront Merchant (Store B)
    const storeBRes = await fetch(`${urls.coreApi}/api/stores/mine`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-correlation-id': 'e2e-merchant-trace-203',
      },
    });
    assert.equal(storeBRes.status, 200);
    const storeBHeaders = Object.fromEntries(storeBRes.headers.entries());
    const storeBData = await storeBRes.json();

    // Validate store response against Core OpenAPI contract
    contractValidator.validateResponse('core', 'GET', '/api/stores/mine', 200, storeBData, storeBHeaders);

    const storeB = storeBData.data;
    assert.ok(storeB, 'Store B data object must be present');
    assert.equal(storeB.id, scenario.ids.storefrontStoreId, 'Store ID must match scenario Store B ID');
    assert.equal(storeB.name, 'Mekong Silk Heritage');
    assert.equal(storeB.primaryCategory, 'Fashion & Textiles');
    assert.equal(storeB.websiteId, scenario.ids.storefrontWebsiteId, 'Store B must have linked websiteId');

    // CRITICAL TENANCY INVARIANT: Store ID and Website ID are distinct and NOT interchanged
    assert.notEqual(
      storeB.id,
      storeB.websiteId,
      `FATAL INVARIANT VIOLATION: Store ID (${storeB.id}) must not equal Website ID (${storeB.websiteId})`
    );

    // 5. Read Store-scoped information for Marketplace-only Merchant (Store A: Kosal Ceramicist)
    const merchantAUser = scenario.users.marketplaceMerchant;
    const loginARes = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-merchant-trace-204',
      },
      body: JSON.stringify({
        email: merchantAUser.email,
        password: 'TestPassword123!',
      }),
    });
    assert.equal(loginARes.status, 200);
    const loginAData = await loginARes.json();
    const tokenA = loginAData.token;

    const storeARes = await fetch(`${urls.coreApi}/api/stores/mine`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-correlation-id': 'e2e-merchant-trace-205',
      },
    });
    assert.equal(storeARes.status, 200);
    const storeAHeaders = Object.fromEntries(storeARes.headers.entries());
    const storeAData = await storeARes.json();

    // Validate Store A contract response
    contractValidator.validateResponse('core', 'GET', '/api/stores/mine', 200, storeAData, storeAHeaders);

    const storeA = storeAData.data;
    assert.ok(storeA, 'Store A data object must be present');
    assert.equal(storeA.id, scenario.ids.marketplaceStoreId, 'Store ID must match scenario Store A ID');
    assert.equal(storeA.name, 'Angkor Artisan Pottery');
    assert.equal(storeA.primaryCategory, 'Handicrafts & Pottery');

    // CRITICAL TENANCY INVARIANT: Marketplace-only Store has websiteId === null
    assert.equal(
      storeA.websiteId,
      null,
      `FATAL INVARIANT VIOLATION: Marketplace-only Store must have websiteId === null, got "${storeA.websiteId}"`
    );

    artifactCollector.recordConsole('Authenticated Merchant Read Journey passed successfully.');
    return {
      passed: true,
      journey: 'Authenticated Merchant Read Journey',
      tags: ['@merchant', '@golden', '@contract'],
    };
  } catch (err) {
    // Capture screenshot and trace immediately on failure
    await browser.screenshot({ name: 'failure-merchant-journey' });
    artifactCollector.saveTrace('failure-merchant-journey', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    await browser.close();
  }
}

module.exports = {
  runMerchantJourney,
  tags: ['@merchant', '@golden', '@contract'],
};
