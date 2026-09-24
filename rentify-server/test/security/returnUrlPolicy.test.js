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
  assert.equal(resolveReturnUrl("https://market.rentify.test/rentify-preview"), "https://market.rentify.test/rentify-preview");
});

test("rejects an arbitrary return URL", () => {
  assert.throws(() => resolveReturnUrl("https://attacker.invalid/steal"), /not allowed/);
});
