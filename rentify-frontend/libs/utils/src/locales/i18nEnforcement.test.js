// libs/utils/src/locales/i18nEnforcement.test.js
// P4-UX-002: CI Enforcement Suite for rentify-frontend customer i18n catalogs.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('P4-UX-002: Customer-facing i18n catalogs enforce 100% parity and no empty translations', () => {
  const enPath = path.join(__dirname, 'en.json');
  const khPath = path.join(__dirname, 'kh.json');

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const kh = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const customerSections = [
    'header', 'products', 'hero', 'progress_indicator',
    'product_detail', 'cart', 'checkout', 'confirmation',
    'orders', 'order_details', 'order_status', 'payment_status',
    'common', 'payment',
  ];

  for (const section of customerSections) {
    const enKeys = Object.keys(en[section] || {}).sort();
    const khKeys = Object.keys(kh[section] || {}).sort();

    const missingInKh = enKeys.filter((k) => !khKeys.includes(k));
    assert.deepEqual(
      missingInKh,
      [],
      `Customer section "${section}" has missing keys in kh.json: ${missingInKh.join(', ')}`
    );

    // Verify non-empty
    for (const key of enKeys) {
      const enVal = en[section][key];
      const khVal = kh[section][key];
      assert.ok(
        typeof enVal === 'string' && enVal.trim().length > 0,
        `en.json [${section}][${key}] must not be empty`
      );
      assert.ok(
        typeof khVal === 'string' && khVal.trim().length > 0,
        `kh.json [${section}][${key}] must not be empty`
      );
    }
  }
});

test('P4-UX-002: Critical Cambodian commerce vocabulary consistency in rentify-frontend', () => {
  const khPath = path.join(__dirname, 'kh.json');
  const kh = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  // Cart
  assert.equal(kh.cart.shopping_cart, 'កន្ត្រកទិញទំនិញ');
  assert.equal(kh.cart.proceed_to_checkout, 'បន្តទៅការទូទាត់');

  // Checkout
  assert.equal(kh.checkout.shipping_details, 'ព័ត៌មានការដឹកជញ្ជូន');
  assert.equal(kh.checkout.payment_method, 'វិធីសាស្ត្រទូទាត់');
  assert.equal(kh.checkout.cash_on_delivery, 'សាច់ប្រាក់នៅពេលដឹកជញ្ជូន');

  // Orders
  assert.equal(kh.orders.order_history, 'ប្រវត្តិការបញ្ជាទិញ');
  assert.equal(kh.orders.all_orders, 'ការបញ្ជាទិញទាំងអស់');
});
