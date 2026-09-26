const test = require('node:test');
const assert = require('node:assert/strict');
const { requireMarketplaceCheckoutEnabled, requireStorefrontCheckoutEnabled } = require('../../modules/checkout/marketplaceCheckoutGate');

test('marketplace checkout writes stay disabled until explicitly enabled', () => {
  const original = process.env.MARKETPLACE_COD_CHECKOUT_ENABLED;
  const response = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let called = false;
  try {
    delete process.env.MARKETPLACE_COD_CHECKOUT_ENABLED;
    requireMarketplaceCheckoutEnabled({}, response, () => { called = true; });
    assert.equal(response.code, 503);
    assert.equal(called, false);
    process.env.MARKETPLACE_COD_CHECKOUT_ENABLED = 'true';
    requireMarketplaceCheckoutEnabled({}, response, () => { called = true; });
    assert.equal(called, true);
  } finally {
    if (original === undefined) delete process.env.MARKETPLACE_COD_CHECKOUT_ENABLED;
    else process.env.MARKETPLACE_COD_CHECKOUT_ENABLED = original;
  }
});

test('hosted storefront checkout writes stay disabled until explicitly enabled', () => {
  const original = process.env.STOREFRONT_COD_CHECKOUT_ENABLED;
  const response = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let called = false;
  try {
    delete process.env.STOREFRONT_COD_CHECKOUT_ENABLED;
    requireStorefrontCheckoutEnabled({}, response, () => { called = true; });
    assert.equal(response.code, 503);
    assert.equal(called, false);
    process.env.STOREFRONT_COD_CHECKOUT_ENABLED = 'true';
    requireStorefrontCheckoutEnabled({}, response, () => { called = true; });
    assert.equal(called, true);
  } finally {
    if (original === undefined) delete process.env.STOREFRONT_COD_CHECKOUT_ENABLED;
    else process.env.STOREFRONT_COD_CHECKOUT_ENABLED = original;
  }
});
