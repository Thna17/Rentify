const test = require('node:test');
const assert = require('node:assert/strict');
const { Product, ProductVariant, StoreAccess, StoreDeliveryPolicy } = require('../../models');
const launchFactsService = require('../../modules/store-access/launchFactsService');

test('launch facts require one active stocked categorized product and SKU', async (t) => {
  t.mock.method(StoreAccess, 'findByPk', async () => ({ storeId: 'store-1', websiteId: null, version: 7 }));
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => ({ storeId: 'store-1', version: 2 }));
  t.mock.method(Product, 'count', async () => 2);
  t.mock.method(Product, 'findAll', async () => [
    { id: 'draft', status: 'draft', price: '5.00', stockQuantity: 4, marketplaceCategory: 'Fashion' },
    { id: 'ready', status: 'active', price: '12.00', stockQuantity: 3, marketplaceCategory: 'Fashion', marketplaceVisibility: null },
  ]);
  t.mock.method(ProductVariant, 'findOne', async (options) => {
    assert.ok(options.where.productId);
    return { productId: 'ready', sku: 'SILK-001', price: '12.00', stockQuantity: 3 };
  });

  const facts = await launchFactsService.getLaunchFacts('store-1');
  assert.equal(facts.storeProjectionVersion, 7);
  assert.equal(facts.deliveryPolicyConfigured, true);
  assert.equal(facts.totalProducts, 2);
  assert.equal(facts.hasValidProduct, true);
  assert.equal(facts.hasValidSku, true);
  assert.equal(facts.marketplaceProductReady, true);
});

test('launch facts remain incomplete when the only product lacks a valid SKU', async (t) => {
  t.mock.method(StoreAccess, 'findByPk', async () => ({ storeId: 'store-1', version: 1 }));
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => null);
  t.mock.method(Product, 'count', async () => 1);
  t.mock.method(Product, 'findAll', async () => [
    { id: 'ready', status: 'active', price: '12.00', stockQuantity: 3, marketplaceCategory: 'Fashion', marketplaceVisibility: false },
  ]);
  t.mock.method(ProductVariant, 'findOne', async () => null);

  const facts = await launchFactsService.getLaunchFacts('store-1');
  assert.equal(facts.deliveryPolicyConfigured, false);
  assert.equal(facts.hasValidProduct, true);
  assert.equal(facts.hasValidSku, false);
  assert.equal(facts.marketplaceProductReady, false);
});
