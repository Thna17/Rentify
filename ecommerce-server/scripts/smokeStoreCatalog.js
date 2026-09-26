const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, WebsiteData, Product } = require('../models');
const catalog = require('../modules/store-catalog/storeCatalogService');
const checkout = require('../modules/checkout/marketplaceCheckoutService');
const ProductService = require('../modules/catalog/ProductService');

async function run() {
  if (process.env.NODE_ENV !== 'test') throw new Error('Use an isolated test database');
  const storeId = randomUUID();
  const ownerUserId = randomUUID();
  const websiteId = randomUUID();
  let product;
  let websiteProduct;
  try {
    const store = await StoreAccess.create({
      storeId, ownerUserId, websiteId: null, primaryCategory: 'Fashion',
      needsCategoryReview: false, marketplaceEnabled: true,
      marketplaceApprovalStatus: 'pending', status: 'active',
      marketplaceEntitlement: 'pilot', version: 1,
    });
    product = await catalog.create(store, {
      name: 'Catalog smoke item', price: 12.5, stockQuantity: 3,
      marketplaceCategory: 'Clothing', status: 'active',
    });
    assert.equal(product.websiteId, null);
    assert.equal((await catalog.listOwn(storeId)).total, 1);
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    await store.update({ marketplaceApprovalStatus: 'approved' });
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    await checkout.setDeliveryPolicy(storeId, { flatFee: '3.50' });
    assert.equal((await catalog.listPublic({ storeId })).total, 1);
    assert.equal((await catalog.getPublic(product.id)).id, product.id);
    await store.update({ status: 'suspended' });
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    await assert.rejects(catalog.getPublic(product.id), { statusCode: 404 });
    await store.update({ status: 'active' });
    await store.update({ marketplaceEnabled: false });
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    await assert.rejects(catalog.getPublic(product.id), { statusCode: 404 });
    product = await catalog.update(storeId, product.id, {
      expectedVersion: product.version, marketplaceVisibility: true,
    });
    assert.equal((await catalog.listPublic({ storeId })).total, 1);
    product = await catalog.update(storeId, product.id, {
      expectedVersion: product.version, status: 'archived',
    });
    assert.equal((await catalog.listPublic({ storeId })).total, 0);

    await store.update({ websiteId, marketplaceEnabled: true });
    await WebsiteData.create({ websiteId, storeId, userId: ownerUserId, niche: 'ecommerce' });
    const websiteCatalog = new ProductService(websiteId);
    websiteProduct = await websiteCatalog.create({
      name: 'Shared storefront item', description: 'A test item', price: 20,
      stockQuantity: 2, status: 'draft', marketplaceCategory: 'Clothing',
    });
    assert.equal(websiteProduct.storeId, storeId);
    assert.equal(websiteProduct.websiteId, websiteId);
    assert.equal(websiteProduct.status, 'draft');
    assert.equal((await websiteCatalog.findAll({ status: 'active' })).totalItems, 0);
    assert.equal((await websiteCatalog.findAll({ status: 'all' })).totalItems, 1);
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    websiteProduct = await sequelize.transaction((transaction) => websiteCatalog.updateInventory(
      websiteProduct.id, { quantity: 1, expectedVersion: websiteProduct.version }, transaction,
    ));
    assert.equal(websiteProduct.status, 'draft');
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    await sequelize.transaction((transaction) => websiteCatalog.bulkUpdateProducts({
      productIds: [websiteProduct.id], expectedVersions: [websiteProduct.version],
      operation: 'price-update', newPrice: 25,
    }, transaction));
    await assert.rejects(sequelize.transaction((transaction) => websiteCatalog.bulkUpdateProducts({
      productIds: [websiteProduct.id], expectedVersions: [websiteProduct.version],
      operation: 'price-update', newPrice: 30,
    }, transaction)), { statusCode: 409 });
    await websiteProduct.reload();
    assert.equal(Number(websiteProduct.price), 25);
    websiteProduct = await sequelize.transaction((transaction) => websiteCatalog.update(
      websiteProduct.id, { expectedVersion: websiteProduct.version, status: 'active' }, transaction,
    ));
    assert.equal((await websiteCatalog.findAll({ status: 'active' })).totalItems, 1);
    assert.equal((await catalog.listPublic({ storeId })).total, 1);
    await sequelize.transaction((transaction) => websiteCatalog.delete(
      websiteProduct.id, websiteProduct.version, transaction,
    ));
    assert.equal((await catalog.listPublic({ storeId })).total, 0);
    assert.equal((await websiteCatalog.findAll({ status: 'all' })).totalItems, 1);
    console.log('Store catalog SQL smoke passed');
  } finally {
    await Product.destroy({ where: { storeId }, force: true });
    await WebsiteData.destroy({ where: { websiteId } });
    await StoreDeliveryPolicy.destroy({ where: { storeId } });
    await StoreAccess.destroy({ where: { storeId } });
    await sequelize.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
