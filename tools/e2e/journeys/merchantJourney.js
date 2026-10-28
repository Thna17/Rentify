// tools/e2e/journeys/merchantJourney.js - Authenticated Merchant Journey (@merchant, @golden, @contract)

const assert = require('node:assert/strict');
const { BrowserSession } = require('../browserShell');

async function runMerchantJourney({ serverManager, contractValidator, artifactCollector }) {
  const browser = new BrowserSession({ artifactCollector });
  const scenario = serverManager.scenario;
  const urls = serverManager.servers ? require('../config').URLS : {};

  try {
    artifactCollector.recordConsole('Starting Authenticated Merchant Journey (@merchant, @golden, @contract)...');

    // 1. Sign in Store B storefront merchant (Bopha Silk) via real Core auth
    const merchantBUser = scenario.users.storefrontMerchant;
    const loginPayloadB = {
      email: merchantBUser.email,
      password: 'TestPassword123!',
    };

    const loginResB = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-merchant-trace-201',
      },
      body: JSON.stringify(loginPayloadB),
    });

    assert.equal(loginResB.status, 200, `Store B merchant login should return 200, got ${loginResB.status}`);
    const loginHeadersB = Object.fromEntries(loginResB.headers.entries());
    const loginDataB = await loginResB.json();
    const tokenB = loginDataB.data?.accessToken || loginDataB.token;
    assert.ok(tokenB, 'Login response must include auth token');
    const userB = loginDataB.data?.user || loginDataB.user;
    assert.equal(userB.id, merchantBUser.id);

    // Validate login against Core OpenAPI contract
    contractValidator.validateResponse('core', 'POST', '/api/auth/login', 200, loginDataB, loginHeadersB);

    // 2. Authenticate the Playwright browser session for Store B and load the real merchant UI
    await browser.clearCookies();
    await browser.addCookies([
      { name: 'authType', value: 'user', domain: '127.0.0.1', path: '/' },
      { name: 'userAccessToken', value: tokenB, domain: '127.0.0.1', path: '/' },
      { name: 'accessToken', value: tokenB, domain: '127.0.0.1', path: '/' },
    ]);

    const merchantResultB = await browser.goto(urls.merchant);
    assert.equal(merchantResultB.ok, true, `Merchant UI must return 200, got ${merchantResultB.status}`);
    await browser.waitForSelector('#root');
    await browser.waitForSelector('main');

    // Wait on observable rendered DOM state for Store B in merchant UI
    await browser.page.waitForFunction(
      () => document.body.textContent.includes('Mekong Silk Heritage'),
      { timeout: 15000 }
    );

    // Assert that the real merchant UI renders Store B data and exposes the
    // Storefront sales channel. The redesigned dashboard no longer uses the
    // legacy "Storefront · Live" badge.
    const bodyContentB = await browser.textContent('body');
    assert.ok(
      bodyContentB.includes('Mekong Silk Heritage'),
      `Merchant UI must render Store B name "Mekong Silk Heritage". Got: "${bodyContentB.slice(0, 200)}"`
    );
    assert.ok(
      bodyContentB.includes('Storefront') && !bodyContentB.includes('Get your own website'),
      'Merchant UI must expose the Storefront channel for storefront-enabled Store B'
    );

    // Capture Playwright screenshot of Store B authenticated merchant dashboard
    await browser.screenshot('golden-merchant-store-b-dashboard');

    // 3. Read Store-scoped information (GET /api/stores/mine) for Store B
    const storeBRes = await fetch(`${urls.coreApi}/api/stores/mine`, {
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'x-correlation-id': 'e2e-merchant-trace-202',
      },
    });
    assert.equal(storeBRes.status, 200, `Store B lookup must return 200, got ${storeBRes.status}`);
    const storeBHeaders = Object.fromEntries(storeBRes.headers.entries());
    const storeBData = await storeBRes.json();

    // Validate store lookup response against Core OpenAPI contract
    contractValidator.validateResponse('core', 'GET', '/api/stores/mine', 200, storeBData, storeBHeaders);

    const storeB = storeBData.data;
    assert.ok(storeB, 'Store B data object must be present');
    assert.equal(storeB.id, scenario.ids.storefrontStoreId, 'Store ID must match scenario Store B ID');
    assert.equal(storeB.name, 'Mekong Silk Heritage');
    assert.equal(storeB.websiteId, scenario.ids.storefrontWebsiteId, 'Store B must have linked websiteId');

    // CRITICAL TENANCY INVARIANT: Store ID and Website ID are distinct and NOT interchanged
    assert.notEqual(
      storeB.id,
      storeB.websiteId,
      `FATAL INVARIANT VIOLATION: Store ID (${storeB.id}) must not equal Website ID (${storeB.websiteId})`
    );

    // 4. Sign in Store A marketplace-only merchant (Kosal Ceramicist)
    const merchantAUser = scenario.users.marketplaceMerchant;
    const loginResA = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-merchant-trace-203',
      },
      body: JSON.stringify({
        email: merchantAUser.email,
        password: 'TestPassword123!',
      }),
    });
    const loginDataA = await loginResA.json();
    const tokenA = loginDataA.data?.accessToken || loginDataA.token;
    assert.ok(tokenA, 'Store A token must be returned');

    // Authenticate the Playwright browser session for Store A and assert UI presentation
    await browser.clearCookies();
    await browser.addCookies([
      { name: 'authType', value: 'user', domain: '127.0.0.1', path: '/' },
      { name: 'userAccessToken', value: tokenA, domain: '127.0.0.1', path: '/' },
      { name: 'accessToken', value: tokenA, domain: '127.0.0.1', path: '/' },
    ]);

    const merchantResultA = await browser.goto(urls.merchant);
    assert.equal(merchantResultA.ok, true, `Merchant UI must return 200, got ${merchantResultA.status}`);
    await browser.waitForSelector('#root');
    await browser.waitForSelector('main');

    // Wait on observable rendered DOM state for Store A in merchant UI
    await browser.page.waitForFunction(
      () => document.body.textContent.includes('Angkor Artisan Pottery'),
      { timeout: 15000 }
    );

    const bodyContentA = await browser.textContent('body');
    assert.ok(
      bodyContentA.includes('Angkor Artisan Pottery'),
      `Merchant UI must render Store A name "Angkor Artisan Pottery". Got: "${bodyContentA.slice(0, 200)}"`
    );
    assert.ok(
      bodyContentA.includes('Get your own website') || !bodyContentA.includes('Storefront'),
      'Merchant UI for a marketplace-only store must show the website prompt or omit the Storefront channel'
    );

    // Capture Playwright screenshot of Store A authenticated merchant dashboard
    await browser.screenshot('golden-merchant-store-a-dashboard');

    const storeARes = await fetch(`${urls.coreApi}/api/stores/mine`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'x-correlation-id': 'e2e-merchant-trace-204',
      },
    });
    assert.equal(storeARes.status, 200, `Store A lookup must return 200, got ${storeARes.status}`);
    const storeAHeaders = Object.fromEntries(storeARes.headers.entries());
    const storeAData = await storeARes.json();

    // Validate Store A contract response
    contractValidator.validateResponse('core', 'GET', '/api/stores/mine', 200, storeAData, storeAHeaders);

    const storeA = storeAData.data;
    assert.ok(storeA, 'Store A data object must be present');
    assert.equal(storeA.id, scenario.ids.marketplaceStoreId, 'Store ID must match scenario Store A ID');
    assert.equal(storeA.name, 'Angkor Artisan Pottery');

    // CRITICAL TENANCY INVARIANT: Marketplace-only Store has websiteId === null
    assert.equal(
      storeA.websiteId,
      null,
      `FATAL INVARIANT VIOLATION: Marketplace-only Store must have websiteId === null, got "${storeA.websiteId}"`
    );

    // 5. Add a product to Store B with marketplace listing enabled (POST /api/stores/:storeId/products)
    const newProductPayload = {
      name: 'Royal Phnom Penh Silk Scarf',
      description: 'Finely spun traditional golden silk scarf dyed with natural pigments.',
      price: 45.00,
      marketplaceCategory: 'Accessories',
      stockQuantity: 15,
      status: 'active',
      marketplaceVisibility: true,
    };

    const createProductRes = await fetch(`${urls.commerceApi}/api/stores/${storeB.id}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
        'x-correlation-id': 'e2e-merchant-trace-205',
      },
      body: JSON.stringify(newProductPayload),
    });

    assert.equal(
      createProductRes.status,
      201,
      `Create product in Store B must return 201, got ${createProductRes.status}`
    );
    const createProductHeaders = Object.fromEntries(createProductRes.headers.entries());
    const createdProduct = await createProductRes.json();

    assert.ok(createdProduct.id, 'Created product must have an ID');
    assert.equal(createdProduct.name, newProductPayload.name);
    assert.equal(Number(createdProduct.price), 45.00);
    assert.equal(createdProduct.stockQuantity, 15);
    assert.equal(createdProduct.storeId, storeB.id);

    // Validate product creation against Commerce OpenAPI contract
    contractValidator.validateResponse(
      'commerce',
      'POST',
      '/api/stores/{storeId}/products',
      201,
      createdProduct,
      createProductHeaders
    );

    // 6. Verify canonical product appears in marketplace with unified price and stock
    const mktProductRes = await fetch(`${urls.commerceApi}/api/marketplace/products/${createdProduct.id}`, {
      headers: { 'x-correlation-id': 'e2e-merchant-trace-206' },
    });
    assert.equal(
      mktProductRes.status,
      200,
      `New canonical product must be visible in marketplace, got ${mktProductRes.status}`
    );
    const mktProductHeaders = Object.fromEntries(mktProductRes.headers.entries());
    const mktProduct = await mktProductRes.json();

    assert.equal(mktProduct.id, createdProduct.id);
    assert.equal(mktProduct.name, 'Royal Phnom Penh Silk Scarf');
    assert.equal(Number(mktProduct.price), 45.00);
    assert.equal(mktProduct.stockQuantity, 15);
    assert.equal(mktProduct.storeId, storeB.id);

    // Validate marketplace projection against Commerce OpenAPI contract
    contractValidator.validateResponse(
      'commerce',
      'GET',
      '/api/marketplace/products/{productId}',
      200,
      mktProduct,
      mktProductHeaders
    );

    // Verify product also appears in Store B catalog with identical price and stock
    const storeCatalogRes = await fetch(`${urls.commerceApi}/api/product/stores/${storeB.id}`, {
      headers: { 'x-correlation-id': 'e2e-merchant-trace-207' },
    });
    assert.equal(storeCatalogRes.status, 200);
    const storeCatalogJson = await storeCatalogRes.json();
    const storeCatalogItem = (storeCatalogJson.products || []).find((p) => p.id === createdProduct.id);
    assert.ok(storeCatalogItem, 'Created product must appear in store catalog');
    assert.equal(Number(storeCatalogItem.price), 45.00);
    assert.equal(storeCatalogItem.stockQuantity, 15);

    artifactCollector.recordConsole('Authenticated Merchant Journey passed successfully.');
    return {
      passed: true,
      journey: 'Authenticated Merchant Journey',
      tags: ['@merchant', '@golden', '@contract'],
    };
  } catch (err) {
    await browser.screenshot('failure-merchant-journey').catch(() => {});
    await browser.saveTrace('failure-merchant-journey').catch(() => {});
    throw err;
  } finally {
    await browser.close('golden-merchant-journey');
  }
}

module.exports = {
  runMerchantJourney,
  tags: ['@merchant', '@golden', '@contract'],
};
