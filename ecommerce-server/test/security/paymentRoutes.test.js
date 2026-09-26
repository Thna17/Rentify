const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../../modules/payments/paymentRoutes.js"), "utf8");

test("payment route contract uses the payment controller, never ProductController", () => {
  assert.match(source, /PaymentController/);
  assert.doesNotMatch(source, /ProductController/);
  assert.match(source, /router\.get\("\/payments\/:paymentId"/);
  assert.match(source, /confirm-payment/);
});
