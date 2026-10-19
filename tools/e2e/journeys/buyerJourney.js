// tools/e2e/journeys/buyerJourney.js - Golden Buyer Journey (@buyer, @golden, @contract)

const assert = require('node:assert/strict');
const { BrowserSession } = require('../browserShell');

async function runBuyerJourney({ serverManager, contractValidator, artifactCollector }) {
  const browser = new BrowserSession({ artifactCollector });
  const scenario = serverManager.scenario;
  const urls = serverManager.servers ? require('../config').URLS : {};

  try {
    artifactCollector.recordConsole('Starting Public Buyer Journey (@buyer, @golden)...');

    // 1. Open the Marketplace home page
    const homeResult = await browser.goto(urls.marketplace);
    assert.equal(homeResult.ok, true, `Marketplace home must return 200, got ${homeResult.status}`);

    const title = await browser.title();
    assert.ok(title.includes('Rentify Marketplace'), `Expected title to contain Rentify Marketplace, got "${title}"`);

    // Wait for observable navbar component (no arbitrary sleeps!)
    await browser.waitForSelector('app-navbar');
    await browser.waitForSelector('.search-bar');

    // 2. Search / Browse products
    const searchInput = await browser.waitForSelector('.search-bar');
    assert.ok(searchInput, 'Search bar must be present');
    await browser.fill('.search-bar', 'Celadon');

    // Confirm product card is visible in grid
    const targetProduct = scenario.products.simpleVase;
    const targetStore = scenario.stores.marketplaceOnly;
    const productCardSelector = `.product-card[data-product-id="${targetProduct.id}"]`;
    await browser.waitForSelector(productCardSelector);

    // 3. Open canonical product detail page
    const detailUrl = `${urls.marketplace}/products/${targetProduct.id}`;
    const detailResult = await browser.goto(detailUrl);
    assert.equal(detailResult.ok, true, `Product detail must return 200, got ${detailResult.status}`);

    // Wait for observable detail page elements
    await browser.waitForSelector('#product-name');
    await browser.waitForSelector('#seller-name');
    await browser.waitForSelector('#product-price');
    await browser.waitForSelector('#stock-status');

    // 4. Verify canonical product presentation: name, store, price, and stock
    const renderedName = await browser.textContent('#product-name');
    assert.equal(renderedName, targetProduct.name, `Rendered product name must match fixture: ${targetProduct.name}`);

    const renderedStore = await browser.textContent('#seller-name');
    assert.equal(renderedStore, targetStore.name, `Rendered store name must match fixture: ${targetStore.name}`);

    const renderedPrice = await browser.textContent('#product-price');
    assert.equal(renderedPrice, `$${targetProduct.price.toFixed(2)}`, `Rendered price must match fixture: $${targetProduct.price.toFixed(2)}`);

    const renderedStock = await browser.textContent('#stock-status');
    assert.ok(
      renderedStock.includes(String(targetProduct.stockQuantity)),
      `Rendered stock must present availability (${targetProduct.stockQuantity} units). Got: "${renderedStock}"`
    );

    // 5. Contract Validation against Commerce OpenAPI (docs/openapi/commerce.openapi.yaml)
    // a. GET /api/marketplace/products/:productId
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

    // b. GET /api/marketplace/categories
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

    // c. GET /api/product/stores/:storeId
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

    artifactCollector.recordConsole('Public Buyer Journey passed successfully.');
    return { passed: true, journey: 'Public Buyer Journey', tags: ['@buyer', '@golden', '@contract'] };
  } catch (err) {
    // Capture screenshot and trace immediately on failure
    await browser.screenshot({ name: 'failure-buyer-journey' });
    artifactCollector.saveTrace('failure-buyer-journey', { error: err.message, stack: err.stack });
    throw err;
  } finally {
    await browser.close();
  }
}

module.exports = {
  runBuyerJourney,
  tags: ['@buyer', '@golden', '@contract'],
};
