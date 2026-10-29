// tools/e2e/journeys/buyerJourney.js - Golden Buyer Journey (@buyer, @golden, @contract)

const assert = require('node:assert/strict');
const { BrowserSession } = require('../browserShell');

const RESPONSIVE_LOCALE_PROFILES = [
  { name: 'desktop-en', locale: 'en', viewport: { width: 1440, height: 900 } },
  { name: 'desktop-km', locale: 'km', viewport: { width: 1440, height: 900 } },
  { name: 'mobile-en', locale: 'en', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'mobile-km', locale: 'km', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

async function verifyResponsiveLocales(url, artifactCollector) {
  for (const profile of RESPONSIVE_LOCALE_PROFILES) {
    const browser = new BrowserSession({ artifactCollector, ...profile });
    try {
      await browser.init(`marketplace-${profile.name}`);
      await browser.context.addInitScript((locale) => localStorage.setItem('appLanguage', locale), profile.locale);
      const response = await browser.goto(url);
      assert.equal(response.ok, true, `${profile.name} marketplace must load`);
      await browser.waitForSelector('app-navbar');
      const state = await browser.evaluate(() => ({
        lang: document.documentElement.lang,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        navbarVisible: Boolean(document.querySelector('app-navbar')),
      }));
      assert.equal(state.lang, profile.locale, `${profile.name} must apply the selected locale`);
      assert.equal(state.navbarVisible, true, `${profile.name} must render navigation`);
      assert.ok(state.documentWidth <= state.viewportWidth + 1,
        `${profile.name} must not introduce horizontal page overflow (${state.documentWidth} > ${state.viewportWidth})`);
      await browser.screenshot(`phase-5-marketplace-${profile.name}`);
    } finally {
      await browser.close(`phase-5-marketplace-${profile.name}`);
    }
  }
}

async function runBuyerJourney({ serverManager, contractValidator, artifactCollector }) {
  const browser = new BrowserSession({ artifactCollector });
  const scenario = serverManager.scenario;
  const urls = serverManager.servers ? require('../config').URLS : {};

  try {
    artifactCollector.recordConsole('Starting Public Buyer Journey (@buyer, @golden, @contract)...');

    // Required release matrix: exercise the real marketplace in both supported
    // languages at representative desktop and mobile sizes before the golden flow.
    await verifyResponsiveLocales(urls.marketplace, artifactCollector);

    // 1. Open the Marketplace home page in Playwright
    const homeResult = await browser.goto(urls.marketplace);
    assert.equal(homeResult.ok, true, `Marketplace home must return 200, got ${homeResult.status}`);

    const title = await browser.title();
    assert.ok(title.includes('Rentify Marketplace'), `Expected title to contain Rentify Marketplace, got "${title}"`);

    // Wait for observable navbar component (no arbitrary sleeps!)
    await browser.waitForSelector('app-navbar');
    await browser.waitForSelector('.search-bar');

    // 2. Search / Browse products via Playwright overlay interaction
    const searchButton = await browser.waitForSelector('.search-bar');
    assert.ok(searchButton, 'Search bar trigger must be present');
    await browser.click('.search-bar');
    await browser.waitForSelector('app-search-overlay input[type="search"]');
    await browser.fill('app-search-overlay input[type="search"]', 'Celadon');

    // Wait for observable search result matching the query
    await browser.waitForSelector('app-search-overlay .results button');
    const resultName = await browser.textContent('app-search-overlay .results button .result-name');
    assert.ok(
      resultName.includes('Celadon') || resultName.includes('Vase'),
      `Search overlay must display matching product, got: "${resultName}"`
    );

    // Click the actual search result in Playwright to navigate to product detail
    await browser.click('app-search-overlay .results button');

    // 3. Confirm canonical product detail page is reached via search result click
    const targetProduct = scenario.products.simpleVase;
    const targetStore = scenario.stores.marketplaceOnly;

    // Wait for observable detail page elements
    await browser.waitForSelector('.info h1');
    await browser.waitForSelector('.store-row');
    await browser.waitForSelector('.price-block');
    await browser.waitForSelector('.avail');

    // 4. Verify canonical product presentation: name, store, price, and stock
    const renderedName = await browser.textContent('.info h1');
    assert.ok(
      renderedName.includes(targetProduct.name),
      `Rendered product name must include fixture name "${targetProduct.name}". Got: "${renderedName}"`
    );

    const renderedStore = await browser.textContent('.store-row');
    assert.ok(
      renderedStore.includes(targetStore.name),
      `Rendered store name must include fixture store "${targetStore.name}". Got: "${renderedStore}"`
    );

    const renderedPrice = await browser.textContent('.price-block .price');
    assert.equal(
      renderedPrice.trim(),
      `$${targetProduct.price.toFixed(2)}`,
      `Rendered price must match fixture: $${targetProduct.price.toFixed(2)}`
    );

    const renderedStock = await browser.textContent('.avail');
    assert.ok(
      renderedStock.includes(String(targetProduct.stockQuantity)),
      `Rendered stock must present availability (${targetProduct.stockQuantity} units). Got: "${renderedStock}"`
    );

    // Capture Playwright screenshot of canonical product detail page
    await browser.screenshot('golden-buyer-product-detail');

    // 5. Contract Validation against Commerce OpenAPI (docs/openapi/commerce.openapi.yaml)
    // a. GET /api/marketplace/products/:productId (Product Detail)
    const prodRes = await fetch(`${urls.commerceApi}/api/marketplace/products/${targetProduct.id}`, {
      headers: { 'x-correlation-id': 'e2e-buyer-trace-101' },
    });
    assert.equal(prodRes.status, 200);
    const prodHeaders = Object.fromEntries(prodRes.headers.entries());
    const prodJson = await prodRes.json();
    contractValidator.validateResponse(
      'commerce',
      'GET',
      '/api/marketplace/products/{productId}',
      200,
      prodJson,
      prodHeaders
    );

    // b. GET /api/marketplace/categories (Category List)
    const catRes = await fetch(`${urls.commerceApi}/api/marketplace/categories`, {
      headers: { 'x-correlation-id': 'e2e-buyer-trace-102' },
    });
    assert.equal(catRes.status, 200);
    const catHeaders = Object.fromEntries(catRes.headers.entries());
    const catJson = await catRes.json();
    contractValidator.validateResponse(
      'commerce',
      'GET',
      '/api/marketplace/categories',
      200,
      catJson,
      catHeaders
    );

    // c. GET /api/product/stores/:storeId (Store Products)
    const storeProdRes = await fetch(`${urls.commerceApi}/api/product/stores/${targetStore.id}`, {
      headers: { 'x-correlation-id': 'e2e-buyer-trace-103' },
    });
    assert.equal(storeProdRes.status, 200);
    const storeProdHeaders = Object.fromEntries(storeProdRes.headers.entries());
    const storeProdJson = await storeProdRes.json();
    contractValidator.validateResponse(
      'commerce',
      'GET',
      '/api/product/stores/{storeId}',
      200,
      storeProdJson,
      storeProdHeaders
    );

    // 6. Buyer Authentication via Core API
    const buyerUser = scenario.users.buyer;
    const loginRes = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-buyer-trace-104',
      },
      body: JSON.stringify({
        email: buyerUser.email,
        password: 'TestPassword123!',
      }),
    });
    assert.equal(loginRes.status, 200, `Buyer login must return 200, got ${loginRes.status}`);
    const loginJson = await loginRes.json();
    const buyerToken = loginJson.data?.accessToken || loginJson.token;
    assert.ok(buyerToken, 'Buyer token must be returned');

    // 7. Add canonical product to marketplace cart (POST /api/marketplace/cart/items)
    const cartAddRes = await fetch(`${urls.commerceApi}/api/marketplace/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
        'x-correlation-id': 'e2e-buyer-trace-105',
      },
      body: JSON.stringify({
        storeId: targetStore.id,
        productId: targetProduct.id,
        quantity: 1,
      }),
    });
    assert.equal(cartAddRes.status, 201, `Add to cart must return 201, got ${cartAddRes.status}`);
    const cartAddHeaders = Object.fromEntries(cartAddRes.headers.entries());
    const cartAddJson = await cartAddRes.json();

    // Validate cart against Commerce OpenAPI contract
    contractValidator.validateResponse(
      'commerce',
      'POST',
      '/api/marketplace/cart/items',
      201,
      cartAddJson,
      cartAddHeaders
    );

    // 8. Execute Cash On Delivery (COD) Checkout (POST /api/marketplace/checkout)
    const targetCart = (cartAddJson.carts || []).find((c) => c.storeId === targetStore.id) || cartAddJson.carts[0];
    const cartItem = (targetCart?.items || []).find((i) => i.productId === targetProduct.id);
    const purchasedQuantity = cartItem ? cartItem.quantity : 1;
    const expectedTotal = Number(targetCart.totalAmount);

    const checkoutPayload = {
      storeId: targetStore.id,
      expectedTotalAmount: expectedTotal,
      customerInfo: {
        name: buyerUser.name,
        phone: buyerUser.phoneNumber,
      },
      shippingInfo: {
        address: '123 Norodom Blvd, Daun Penh, Phnom Penh, Cambodia',
      },
    };

    const checkoutRes = await fetch(`${urls.commerceApi}/api/marketplace/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
        'Idempotency-Key': 'chk_e2e_buyer_cod_golden_001',
        'x-correlation-id': 'e2e-buyer-trace-106',
      },
      body: JSON.stringify(checkoutPayload),
    });
    assert.equal(checkoutRes.status, 201, `COD checkout must return 201, got ${checkoutRes.status}`);
    const checkoutHeaders = Object.fromEntries(checkoutRes.headers.entries());
    const checkoutJson = await checkoutRes.json();

    // Validate checkout response against Commerce OpenAPI contract
    contractValidator.validateResponse(
      'commerce',
      'POST',
      '/api/marketplace/checkout',
      201,
      checkoutJson,
      checkoutHeaders
    );

    const order = checkoutJson.order;
    assert.ok(order, 'Order must be created and returned');
    assert.equal(order.status, 'pending');
    assert.equal(order.deliveryStatus, 'pending');
    assert.equal(order.totalAmount, expectedTotal.toFixed(2));
    assert.equal(order.storeId, targetStore.id);
    assert.equal(order.salesChannel, 'marketplace');

    // 9. Verify Deterministic Stock Reduction
    const expectedRemainingStock = targetProduct.stockQuantity - purchasedQuantity;
    const afterProdRes = await fetch(`${urls.commerceApi}/api/marketplace/products/${targetProduct.id}`, {
      headers: { 'x-correlation-id': 'e2e-buyer-trace-107' },
    });
    assert.equal(afterProdRes.status, 200);
    const afterProdJson = await afterProdRes.json();
    assert.equal(
      afterProdJson.stockQuantity,
      expectedRemainingStock,
      `Deterministic stock reduction failed: expected stock to be ${expectedRemainingStock}, got ${afterProdJson.stockQuantity}`
    );

    const afterStoreProdRes = await fetch(`${urls.commerceApi}/api/product/stores/${targetStore.id}`, {
      headers: { 'x-correlation-id': 'e2e-buyer-trace-108' },
    });
    assert.equal(afterStoreProdRes.status, 200);
    const afterStoreProdJson = await afterStoreProdRes.json();
    const reducedCatalogItem = (afterStoreProdJson.products || []).find((p) => p.id === targetProduct.id);
    if (reducedCatalogItem) {
      assert.equal(
        reducedCatalogItem.stockQuantity,
        expectedRemainingStock,
        `Store catalog deterministic stock reduction failed: expected ${expectedRemainingStock}, got ${reducedCatalogItem.stockQuantity}`
      );
    }

    artifactCollector.recordConsole('Public Buyer Journey passed successfully with deterministic stock reduction.');
    return { passed: true, journey: 'Public Buyer Journey', tags: ['@buyer', '@golden', '@contract'] };
  } catch (err) {
    await browser.screenshot('failure-buyer-journey').catch(() => {});
    await browser.saveTrace('failure-buyer-journey').catch(() => {});
    throw err;
  } finally {
    await browser.close('golden-buyer-journey');
  }
}

module.exports = {
  runBuyerJourney,
  tags: ['@buyer', '@golden', '@contract'],
};
