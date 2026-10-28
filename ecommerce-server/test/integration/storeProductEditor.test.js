const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../../config/db');
const { Product, ProductVariant, StoreAccess, WebsiteData } = require('../../models');
const storeCatalog = require('../../modules/store-catalog/storeCatalogService');

const store = {
  storeId: '11111111-1111-4111-8111-111111111111',
  websiteId: null,
  status: 'active',
  marketplaceEntitlement: 'pilot',
  planCode: 'growth',
};

function mockCreateDependencies(t, createdVariants) {
  t.mock.method(sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(WebsiteData, 'findOne', async () => null);
  t.mock.method(Product, 'count', async () => 0);
  t.mock.method(Product, 'findOne', async () => null);
  t.mock.method(ProductVariant, 'findOne', async () => null);
  t.mock.method(Product, 'create', async (values) => ({ id: 'product-1', ...values }));
  t.mock.method(Product, 'findByPk', async () => ({ id: 'product-1', ProductVariants: createdVariants }));
  t.mock.method(ProductVariant, 'create', async (values) => {
    const variant = { id: `variant-${createdVariants.length + 1}`, ...values };
    createdVariants.push(variant);
    return variant;
  });
}

test('P4-MER-003: simple product creates one canonical SKU in the same operation', async (t) => {
  const createdVariants = [];
  mockCreateDependencies(t, createdVariants);
  await storeCatalog.create(store, {
    name: 'Canvas bag', sku: 'bag-001', description: '', price: 12.5,
    stockQuantity: 4, marketplaceCategory: 'Other', status: 'draft', images: [],
  });
  assert.equal(createdVariants.length, 1);
  assert.equal(createdVariants[0].sku, 'BAG-001');
  assert.equal(createdVariants[0].stockQuantity, 4);
});

test('P4-MER-003: variant product preserves option, SKU, price, and stock facts', async (t) => {
  const createdVariants = [];
  mockCreateDependencies(t, createdVariants);
  await storeCatalog.create(store, {
    name: 'T-shirt', price: 10, stockQuantity: 5,
    marketplaceCategory: 'Clothing', status: 'draft', images: [],
    variants: [
      { sku: 'shirt-s', price: 10, stockQuantity: 2, optionValues: { Size: 'S' } },
      { sku: 'shirt-m', price: 11, stockQuantity: 3, optionValues: { Size: 'M' } },
    ],
  });
  assert.deepEqual(createdVariants.map(({ sku, price, stockQuantity, optionValues }) => ({
    sku, price, stockQuantity, optionValues,
  })), [
    { sku: 'SHIRT-S', price: '10.00', stockQuantity: 2, optionValues: { Size: 'S' } },
    { sku: 'SHIRT-M', price: '11.00', stockQuantity: 3, optionValues: { Size: 'M' } },
  ]);
});

test('P4-MER-003: duplicate SKUs are rejected before any Product is written', async (t) => {
  const create = t.mock.method(Product, 'create', async () => ({}));
  await assert.rejects(storeCatalog.create(store, {
    name: 'T-shirt', price: 10, stockQuantity: 2,
    marketplaceCategory: 'Clothing', status: 'draft', images: [],
    variants: [
      { sku: 'same', price: 10, stockQuantity: 1 },
      { sku: 'SAME', price: 10, stockQuantity: 1 },
    ],
  }), (error) => error.statusCode === 409 && (error.code === 'SKU_DUPLICATE' || error.code === 'DUPLICATE_SKU'));
  assert.equal(create.mock.callCount(), 0);
});
