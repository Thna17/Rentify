const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSku, variantStatusFor, chooseSku } = require('../../scripts/backfillDefaultSkus');

test('generated SKUs follow the product name and stay unique within the Store', () => {
  const values = ['aaaa1111', 'bbbb2222'];
  const sku = generateSku('Butter Croissant', new Set(['BUTTER-CROISSANT-AAAA1111']), () => values.shift());
  assert.equal(sku, 'BUTTER-CROISSANT-BBBB2222');
  assert.match(generateSku('', new Set()), /^SKU-[0-9A-F]{8}$/);
  assert.throws(() => generateSku('X', new Set(['X-SAME']), () => 'same'), /unique SKU/);
});

test('an existing product SKU is kept when it is unique, otherwise a new one is generated', () => {
  assert.deepEqual(chooseSku({ name: 'Latte', sku: 'lat-01' }, new Set()), { sku: 'LAT-01', productSkuSet: false });
  const clash = chooseSku({ name: 'Latte', sku: 'LAT-01' }, new Set(['LAT-01']), () => 'cafe0001');
  assert.equal(clash.sku, 'LATTE-CAFE0001');
  assert.equal(clash.productSkuSet, false);
  const none = chooseSku({ name: 'Latte', sku: null }, new Set(), () => 'cafe0002');
  assert.deepEqual(none, { sku: 'LATTE-CAFE0002', productSkuSet: true });
});

test('the default SKU is disabled exactly when the product is not for sale, as on creation', () => {
  for (const status of ['draft', 'archived', 'inactive']) assert.equal(variantStatusFor(status), 'disabled', status);
  for (const status of ['active', 'low_stock', 'out_of_stock']) assert.equal(variantStatusFor(status), 'active', status);
});
