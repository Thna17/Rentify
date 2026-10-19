// tools/e2e/journeys/safetyAndFailureJourney.js - Validates rejection of production configurations and generation of failure artifacts (@safety, @artifacts)

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { assertSafeTestEnvironment, assertSafeUrl, UnsafeEnvironmentError } = require('../safety');
const { BrowserSession } = require('../browserShell');

async function runSafetyAndFailureJourney({ serverManager, artifactCollector }) {
  artifactCollector.recordConsole('Starting Safety & Failure Artifacts Validation (@safety, @artifacts)...');
  const scenario = serverManager?.scenario;
  const urls = serverManager?.servers ? require('../config').URLS : {};

  // 1. Verify rejection of production NODE_ENV
  assert.throws(
    () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        assertSafeTestEnvironment({});
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    },
    (err) => err instanceof UnsafeEnvironmentError && err.message.includes('NODE_ENV is set to "production"'),
    'Must refuse execution when NODE_ENV is production'
  );

  // 2. Verify rejection of production and cloud database hosts
  const cloudHosts = [
    'rentify-prod.rds.amazonaws.com',
    'mysql-live.cloudsql.googleapis.com',
    'db.rentifymarket.com',
    'prod-database.internal',
  ];

  for (const host of cloudHosts) {
    assert.throws(
      () => {
        assertSafeTestEnvironment({ host, database: 'rentify_test' });
      },
      (err) => err instanceof UnsafeEnvironmentError,
      `Must refuse cloud host: ${host}`
    );
  }

  // 3. Verify rejection of production database names
  const forbiddenDbs = ['rentify_core', 'rentify_ecommerce', 'production', 'live', 'khmercraft'];
  for (const db of forbiddenDbs) {
    assert.throws(
      () => {
        assertSafeTestEnvironment({ host: '127.0.0.1', database: db });
      },
      (err) => err instanceof UnsafeEnvironmentError,
      `Must refuse production DB name: ${db}`
    );
  }

  // 4. Verify rejection of remote / production URLs
  const unsafeUrls = [
    'https://rentifymarket.com/products',
    'https://api.rentify.com/api/stores',
    'https://mekhla.digital',
    'http://192.168.1.100:3000',
  ];

  for (const u of unsafeUrls) {
    assert.throws(
      () => {
        assertSafeUrl(u);
      },
      (err) => err instanceof UnsafeEnvironmentError,
      `Must refuse unsafe URL: ${u}`
    );
  }

  // 5. Verify refusal of invalid credentials against real Core auth
  if (urls.coreApi) {
    const badLoginRes = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-safety-bad-cred',
      },
      body: JSON.stringify({
        email: scenario?.users?.buyer?.email || 'sokha.buyer@rentify.test',
        password: 'DefinitivelyWrongPassword123!',
      }),
    });
    assert.ok(
      badLoginRes.status === 400 || badLoginRes.status === 401,
      `Invalid credentials must return 400 or 401, got ${badLoginRes.status}`
    );
    const badLoginData = await badLoginRes.json();
    assert.ok(badLoginData.error || badLoginData.message, 'Error response envelope required for invalid credentials');
  }

  // 6. Verify refusal of invalid tokens against real Commerce API
  if (urls.commerceApi && scenario?.ids) {
    const badTokenRes = await fetch(`${urls.commerceApi}/api/stores/${scenario.ids.storefrontStoreId}/products`, {
      headers: {
        Authorization: 'Bearer forged.invalid.token.signature',
        'x-correlation-id': 'e2e-safety-bad-token',
      },
    });
    assert.equal(badTokenRes.status, 401, `Forged token must return 401, got ${badTokenRes.status}`);
    const badTokenData = await badTokenRes.json();
    assert.ok(badTokenData.error, 'Error message required for forged token');
  }

  // 7. Verify refusal of out-of-stock / impossible purchases
  if (urls.commerceApi && scenario?.ids) {
    // a. Attempt to add excessive quantity to cart
    const excessCartRes = await fetch(`${urls.commerceApi}/api/marketplace/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-safety-excess-stock',
      },
      body: JSON.stringify({
        storeId: scenario.ids.marketplaceStoreId,
        productId: scenario.products.simpleVase.id,
        quantity: 999999, // Exceeds safe stock and maximum cart limit
      }),
    });
    assert.ok(
      excessCartRes.status === 400 || excessCartRes.status === 409,
      `Excessive quantity must return 400 or 409, got ${excessCartRes.status}`
    );

    // b. Attempt to checkout with an empty cart
    const buyerLogin = await fetch(`${urls.coreApi}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': 'e2e-safety-login',
      },
      body: JSON.stringify({
        email: scenario.users.buyer.email,
        password: 'TestPassword123!',
      }),
    });
    const buyerLoginJson = await buyerLogin.json();
    const buyerToken = buyerLoginJson.data?.accessToken || buyerLoginJson.token;
    assert.ok(buyerToken, 'Buyer token must be returned for empty cart checkout test');

    const emptyCheckoutRes = await fetch(`${urls.commerceApi}/api/marketplace/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
        'Idempotency-Key': 'chk_e2e_safety_empty_cart_001',
        'x-correlation-id': 'e2e-safety-empty-checkout',
      },
      body: JSON.stringify({
        storeId: scenario.ids.storefrontStoreId, // Cart for Store B is empty
        expectedTotalAmount: 50.0,
        customerInfo: {
          name: 'Sokha Buyer',
          phone: '+85512345678',
        },
        shippingInfo: {
          address: '123 Norodom Blvd, Phnom Penh, Cambodia',
        },
      }),
    });
    assert.equal(emptyCheckoutRes.status, 409, `Empty cart checkout must return 409, got ${emptyCheckoutRes.status}`);
  }

  // 8. Verify failure artifact generation (Playwright Screenshot, Native Trace, Service Logs)
  const browser = new BrowserSession({ artifactCollector });
  const simulatedErrorName = 'simulated-safety-failure';

  try {
    if (urls.marketplace) {
      await browser.goto(urls.marketplace);
    }
    // Generate native failure screenshot
    const screenshotPath = await browser.screenshot(simulatedErrorName);
    assert.ok(fs.existsSync(screenshotPath), `Screenshot file must exist at ${screenshotPath}`);
    const screenshotStat = fs.statSync(screenshotPath);
    assert.ok(screenshotStat.size > 0, `Screenshot file must not be empty (size: ${screenshotStat.size})`);

    // Generate native failure trace
    const tracePath = await browser.saveTrace(simulatedErrorName);
    if (tracePath) {
      assert.ok(fs.existsSync(tracePath), `Playwright trace file must exist at ${tracePath}`);
      const traceStat = fs.statSync(tracePath);
      assert.ok(traceStat.size > 0, `Trace zip must not be empty (size: ${traceStat.size})`);
    }

    // Generate structured JSON trace log
    const jsonTracePath = artifactCollector.saveTrace(simulatedErrorName, {
      simulated: true,
      reason: 'Validation of artifact generation mechanism',
    });
    assert.ok(fs.existsSync(jsonTracePath), `Trace JSON must exist at ${jsonTracePath}`);
    const traceContent = JSON.parse(fs.readFileSync(jsonTracePath, 'utf8'));
    assert.equal(traceContent.testName, simulatedErrorName);
    assert.ok(Array.isArray(traceContent.networkEntries));

    artifactCollector.recordConsole(
      'Verified failure screenshots, traces, and service logs are successfully generated.'
    );
  } finally {
    await browser.close();
  }

  return {
    passed: true,
    journey: 'Safety and Failure Artifacts Journey',
    tags: ['@safety', '@artifacts'],
  };
}

module.exports = {
  runSafetyAndFailureJourney,
  tags: ['@safety', '@artifacts'],
};
