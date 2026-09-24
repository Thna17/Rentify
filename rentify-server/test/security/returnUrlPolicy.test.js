const test = require("node:test");
const assert = require("node:assert/strict");

process.env.MARKETING_URL = "https://www.rentify.test";
process.env.MARKETPLACE_URL = "https://market.rentify.test";
process.env.AUTH_URL = "https://auth.rentify.test";
process.env.MERCHANT_DASHBOARD_URL = "https://merchant.rentify.test";
process.env.STOREFRONT_ORIGIN = "https://store.rentify.test";

const { resolveReturnUrl } = require("../../src/utils/returnUrlPolicy");

test("allows a configured Rentify return URL", () => {
  assert.equal(resolveReturnUrl("https://merchant.rentify.test/dashboard"), "https://merchant.rentify.test/dashboard");
  assert.equal(resolveReturnUrl("https://market.rentify.test/cart"), "https://market.rentify.test/cart");
});

test("rejects an arbitrary return URL", () => {
  assert.throws(() => resolveReturnUrl("https://attacker.invalid/steal"), /not allowed/);
});

test('hosted storefront returns accept only a single HTTPS store label', () => {
  const original = process.env.HOSTED_STOREFRONT_DOMAIN;
  try {
    process.env.HOSTED_STOREFRONT_DOMAIN = 'rentifystore.shop';
    assert.equal(resolveReturnUrl('https://ceramics.rentifystore.shop/checkout'),
      'https://ceramics.rentifystore.shop/checkout');
    for (const url of [
      'https://rentifystore.shop/checkout', 'https://a.b.rentifystore.shop/checkout',
      'http://ceramics.rentifystore.shop/checkout',
      'https://ceramics.rentifystore.shop.attacker.test/checkout',
      'https://ceramics.rentifystore.shop:8443/checkout',
    ]) assert.throws(() => resolveReturnUrl(url), /not allowed/);
  } finally {
    if (original === undefined) delete process.env.HOSTED_STOREFRONT_DOMAIN;
    else process.env.HOSTED_STOREFRONT_DOMAIN = original;
  }
});
