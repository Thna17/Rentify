'use strict';

// test/security/legacyWebsiteOrderInventory.test.js
// Verification suite for P3-INV-002 Slice 3: Legacy Website order compatibility.
// Verifies unambiguous website-to-store resolution, product-to-SKU mapping, ambiguous rejection,
// live compatibility writes routed through canonical inventory, single-effect idempotency on deduction
// and cancellation, reconciliation tool, and safety on unexplained records.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const {
  inventoryLedgerService,
  InsufficientStockError,
} = require('../../modules/inventory');

const {
  resolveWebsiteToStore,
  resolveLegacyItemToSku,
  deductOrderInventory,
  restoreOrderInventory,
} = require('../../modules/orders/services/legacyWebsiteCompatibilityService');

const {
  AmbiguousWebsiteMappingError,
  UnresolvedWebsiteStoreError,
  AmbiguousProductSkuMappingError,
  LegacyProductNotFoundError,
  LegacyVariantNotFoundError,
  LegacyStoreMismatchError,
  StoreNotActiveError,
} = require('../../modules/orders/legacyCompatibilityErrors');

const stockService = require('../../modules/inventory/stockService');
const sharedStockService = require('../../modules/inventory/sharedStockService');
const { reconcileLegacyWebsiteStock } = require('../../modules/inventory/legacyWebsiteReconciliationService');

const {
  WebsiteData,
  StoreAccess,
  Product,
  ProductVariant,
  Order,
  OrderItem,
  InventoryBalance,
  InventoryLedgerEntry,
} = require('../../models');

ProductVariant.update = async () => [1];
Product.update = async () => [1];

const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const WEB_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WEB_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROD_SIMPLE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SKU_SIMPLE = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PROD_VAR = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const SKU_VAR_1 = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const SKU_VAR_2 = '99999999-9999-4999-8999-999999999999';

function createMockTx() {
  const txId = randomUUID();
  return {
    id: txId,
    uuid: txId,
    LOCK: { UPDATE: 'UPDATE' },
    commit: async () => {},
    rollback: async () => {},
  };
}

test('P3-INV-002: 1. Website-to-Store: Unambiguous resolution from WebsiteData', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(WebsiteData, 'findOne', async () => ({
    websiteId: WEB_A,
    storeId: STORE_A,
    niche: 'ecommerce',
  }));

  t.mock.method(StoreAccess, 'findAll', async () => [
    { storeId: STORE_A, websiteId: WEB_A },
  ]);

  t.mock.method(StoreAccess, 'findByPk', async (id) => ({
    storeId: id,
    status: 'active',
  }));

  const resolved = await resolveWebsiteToStore(WEB_A, { transaction: mockTx });
  assert.equal(resolved.storeId, STORE_A);
  assert.equal(resolved.store.status, 'active');
  assert.equal(resolved.website.niche, 'ecommerce');
});

test('P3-INV-002: 2. Website-to-Store: Unambiguous resolution from StoreAccess when WebsiteData storeId is unset', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(WebsiteData, 'findOne', async () => ({
    websiteId: WEB_A,
    storeId: null,
    niche: 'fashion',
  }));

  t.mock.method(StoreAccess, 'findAll', async () => [
    { storeId: STORE_A, websiteId: WEB_A },
  ]);

  t.mock.method(StoreAccess, 'findByPk', async (id) => ({
    storeId: id,
    status: 'active',
  }));

  const resolved = await resolveWebsiteToStore(WEB_A, { transaction: mockTx });
  assert.equal(resolved.storeId, STORE_A);
});

test('P3-INV-002: 3. Website-to-Store: Rejects ambiguous mapping when multiple StoreAccess entries claim same website', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(WebsiteData, 'findOne', async () => ({
    websiteId: WEB_A,
    storeId: STORE_A,
  }));

  t.mock.method(StoreAccess, 'findAll', async () => [
    { storeId: STORE_A, websiteId: WEB_A },
    { storeId: STORE_B, websiteId: WEB_A },
  ]);

  await assert.rejects(async () => {
    await resolveWebsiteToStore(WEB_A, { transaction: mockTx });
  }, (err) => {
    assert.ok(err instanceof AmbiguousWebsiteMappingError);
    assert.equal(err.code, 'AMBIGUOUS_WEBSITE_STORE_MAPPING');
    assert.equal(err.statusCode, 409);
    assert.match(err.message, /maps to multiple Stores/);
    return true;
  });
});

test('P3-INV-002: 4. Website-to-Store: Rejects conflicting mapping between WebsiteData and StoreAccess', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(WebsiteData, 'findOne', async () => ({
    websiteId: WEB_A,
    storeId: STORE_A,
  }));

  t.mock.method(StoreAccess, 'findAll', async () => [
    { storeId: STORE_B, websiteId: WEB_A },
  ]);

  await assert.rejects(async () => {
    await resolveWebsiteToStore(WEB_A, { transaction: mockTx });
  }, (err) => {
    assert.ok(err instanceof AmbiguousWebsiteMappingError);
    assert.equal(err.code, 'AMBIGUOUS_WEBSITE_STORE_MAPPING');
    assert.equal(err.statusCode, 409);
    assert.match(err.message, /Conflicting Store mappings/);
    return true;
  });
});

test('P3-INV-002: 5. Website-to-Store: Rejects unmapped website when neither table points to a store', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(WebsiteData, 'findOne', async () => null);
  t.mock.method(StoreAccess, 'findAll', async () => []);

  await assert.rejects(async () => {
    await resolveWebsiteToStore(WEB_A, { transaction: mockTx });
  }, (err) => {
    assert.ok(err instanceof UnresolvedWebsiteStoreError);
    assert.equal(err.code, 'UNRESOLVED_WEBSITE_STORE');
    assert.equal(err.statusCode, 404);
    return true;
  });
});

test('P3-INV-002: 6. Website-to-Store: Rejects inactive or suspended store', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(WebsiteData, 'findOne', async () => ({
    websiteId: WEB_A,
    storeId: STORE_A,
  }));

  t.mock.method(StoreAccess, 'findAll', async () => [
    { storeId: STORE_A, websiteId: WEB_A },
  ]);

  t.mock.method(StoreAccess, 'findByPk', async () => ({
    storeId: STORE_A,
    status: 'suspended',
  }));

  await assert.rejects(async () => {
    await resolveWebsiteToStore(WEB_A, { transaction: mockTx });
  }, (err) => {
    assert.ok(err instanceof StoreNotActiveError);
    assert.equal(err.code, 'STORE_NOT_ACTIVE');
    assert.equal(err.statusCode, 403);
    assert.match(err.message, /is not active/);
    return true;
  });
});

test('P3-INV-002: 7. Legacy Product/SKU: Explicit variantId maps to exact ProductVariant', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_VAR,
    storeId: STORE_A,
    name: 'Silk Shirt',
  }));

  t.mock.method(ProductVariant, 'findOne', async () => ({
    id: SKU_VAR_1,
    productId: PROD_VAR,
    storeId: STORE_A,
    sku: 'SILK-SHIRT-M',
    status: 'active',
  }));

  const resolved = await resolveLegacyItemToSku({
    productId: PROD_VAR,
    variantId: SKU_VAR_1,
    storeId: STORE_A,
  }, { transaction: mockTx });

  assert.equal(resolved.skuId, SKU_VAR_1);
  assert.equal(resolved.sku, 'SILK-SHIRT-M');
  assert.equal(resolved.isVariant, true);
});

test('P3-INV-002: 8. Legacy Product/SKU: Simple product with 1 variant maps to that variant', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Bamboo Basket',
    sku: 'BAMBOO-BSK',
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    {
      id: SKU_SIMPLE,
      productId: PROD_SIMPLE,
      storeId: STORE_A,
      sku: 'BAMBOO-BSK-DEF',
      status: 'active',
    },
  ]);

  const resolved = await resolveLegacyItemToSku({
    productId: PROD_SIMPLE,
    variantId: null,
    storeId: STORE_A,
  }, { transaction: mockTx });

  assert.equal(resolved.skuId, SKU_SIMPLE);
  assert.equal(resolved.sku, 'BAMBOO-BSK-DEF');
});

test('P3-INV-002: 9. Legacy Product/SKU: Rejects ambiguous variable product mapping when variantId is omitted', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_VAR,
    storeId: STORE_A,
    name: 'Ceramic Vase',
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    { id: SKU_VAR_1, productId: PROD_VAR, storeId: STORE_A, sku: 'VASE-BLUE', status: 'active' },
    { id: SKU_VAR_2, productId: PROD_VAR, storeId: STORE_A, sku: 'VASE-RED', status: 'active' },
  ]);

  await assert.rejects(async () => {
    await resolveLegacyItemToSku({
      productId: PROD_VAR,
      variantId: null,
      storeId: STORE_A,
    }, { transaction: mockTx });
  }, (err) => {
    assert.ok(err instanceof AmbiguousProductSkuMappingError);
    assert.equal(err.code, 'AMBIGUOUS_PRODUCT_SKU_MAPPING');
    assert.equal(err.statusCode, 409);
    assert.match(err.message, /Ambiguous SKU mapping/);
    return true;
  });
});

test('P3-INV-002: 10. Legacy Product/SKU: Rejects item belonging to different store', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_B,
    name: 'Store B Item',
  }));

  await assert.rejects(async () => {
    await resolveLegacyItemToSku({
      productId: PROD_SIMPLE,
      variantId: null,
      storeId: STORE_A,
    }, { transaction: mockTx });
  }, (err) => {
    assert.ok(err instanceof LegacyStoreMismatchError);
    assert.equal(err.code, 'STORE_MISMATCH');
    assert.equal(err.statusCode, 403);
    return true;
  });
});

test('P3-INV-002: 11. Live stock deduction routes to inventoryLedgerService with sourceType=legacy_website_order and notes', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Cotton Scarf',
    stockQuantity: 10,
    async reload() { return this; },
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    {
      id: SKU_SIMPLE,
      productId: PROD_SIMPLE,
      storeId: STORE_A,
      sku: 'COTTON-SCARF-DEF',
      status: 'active',
      stockQuantity: 10,
      async reload() { return this; },
    },
  ]);

  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'COTTON-SCARF-DEF',
    productId: PROD_SIMPLE,
    onHand: 10,
    reserved: 0,
    available: 10,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);

  let createdLedgerEntry = null;
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    createdLedgerEntry = { id: randomUUID(), ...data };
    return createdLedgerEntry;
  });

  const orderId = 'ord-legacy-101';
  const items = [{ productId: PROD_SIMPLE, quantity: 2, price: 15.0 }];

  const results = await deductOrderInventory(items, mockTx, {
    orderId,
    storeId: STORE_A,
    websiteId: WEB_A,
    actor: { id: 'buyer-99', type: 'customer' },
    idempotencyKey: `legacy-deduct-${orderId}`,
    sourceType: 'legacy_website_order',
    currency: 'USD',
  });

  assert.equal(results.length, 1);
  assert.equal(balanceRecord.onHand, 8);
  assert.equal(balanceRecord.available, 8);
  assert.ok(createdLedgerEntry);
  assert.equal(createdLedgerEntry.sourceType, 'legacy_website_order');
  assert.equal(createdLedgerEntry.sourceId, orderId);
  assert.equal(createdLedgerEntry.reasonCode, 'sale');
  assert.equal(createdLedgerEntry.changeOnHand, -2);
  assert.equal(createdLedgerEntry.monetaryContext.legacyWebsiteId, WEB_A);
  assert.match(createdLedgerEntry.notes, /Legacy Website order compatibility deduction/);
});

test('P3-INV-002: 12. Duplicate legacy order deduction replay has exactly one inventory effect', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Cotton Scarf',
    stockQuantity: 8,
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    {
      id: SKU_SIMPLE,
      productId: PROD_SIMPLE,
      storeId: STORE_A,
      sku: 'COTTON-SCARF-DEF',
      status: 'active',
      stockQuantity: 8,
    },
  ]);

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'COTTON-SCARF-DEF',
    productId: PROD_SIMPLE,
    onHand: 8,
    reserved: 0,
    available: 8,
    version: 2,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  const existingEntry = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    idempotencyKey: `legacy-deduct-ord-dup-101-${SKU_SIMPLE}`,
    changeOnHand: -2,
    sourceType: 'legacy_website_order',
    sourceId: 'ord-dup-101',
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => existingEntry);

  let ledgerCreateCalled = false;
  t.mock.method(InventoryLedgerEntry, 'create', async () => {
    ledgerCreateCalled = true;
  });

  const orderId = 'ord-dup-101';
  const items = [{ productId: PROD_SIMPLE, quantity: 2, price: 15.0 }];

  const results = await deductOrderInventory(items, mockTx, {
    orderId,
    storeId: STORE_A,
    websiteId: WEB_A,
    actor: { id: 'buyer-99', type: 'customer' },
    idempotencyKey: `legacy-deduct-${orderId}`,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].mutation.duplicate, true);
  assert.equal(results[0].mutation.idempotent, true);
  assert.equal(ledgerCreateCalled, false);
  assert.equal(balanceRecord.onHand, 8); // Balance unchanged on duplicate!
});

test('P3-INV-002: 13. Insufficient stock on legacy order fails safely without negative balance', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Cotton Scarf',
    stockQuantity: 2,
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    {
      id: SKU_SIMPLE,
      productId: PROD_SIMPLE,
      storeId: STORE_A,
      sku: 'COTTON-SCARF-DEF',
      status: 'active',
      stockQuantity: 2,
    },
  ]);

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'COTTON-SCARF-DEF',
    productId: PROD_SIMPLE,
    onHand: 2,
    reserved: 0,
    available: 2,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);

  const orderId = 'ord-oversell-101';
  const items = [{ productId: PROD_SIMPLE, quantity: 5, price: 15.0 }];

  await assert.rejects(async () => {
    await deductOrderInventory(items, mockTx, {
      orderId,
      storeId: STORE_A,
      websiteId: WEB_A,
      idempotencyKey: `legacy-deduct-${orderId}`,
    });
  }, (err) => {
    assert.ok(err instanceof InsufficientStockError);
    assert.match(err.message, /Insufficient stock on hand/);
    return true;
  });

  // Balance remains untouched
  assert.equal(balanceRecord.onHand, 2);
  assert.equal(balanceRecord.available, 2);
});

test('P3-INV-002: 14. Cancellation compensates deducted stock exactly once via inventoryLedgerService', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Cotton Scarf',
    stockQuantity: 8,
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    {
      id: SKU_SIMPLE,
      productId: PROD_SIMPLE,
      storeId: STORE_A,
      sku: 'COTTON-SCARF-DEF',
      status: 'active',
      stockQuantity: 8,
    },
  ]);

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'COTTON-SCARF-DEF',
    productId: PROD_SIMPLE,
    onHand: 8,
    reserved: 0,
    available: 8,
    version: 2,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);

  let restoreLedgerCreated = null;
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    restoreLedgerCreated = { id: randomUUID(), ...data };
    return restoreLedgerCreated;
  });

  const orderId = 'ord-cancel-101';
  const items = [{ productId: PROD_SIMPLE, quantity: 2 }];

  const results = await restoreOrderInventory(items, mockTx, {
    orderId,
    storeId: STORE_A,
    websiteId: WEB_A,
    actor: { id: 'admin-1', type: 'merchant' },
    idempotencyKey: `legacy-restore-${orderId}`,
  });

  assert.equal(results.length, 1);
  assert.equal(balanceRecord.onHand, 10);
  assert.ok(restoreLedgerCreated);
  assert.equal(restoreLedgerCreated.reasonCode, 'cancellation');
  assert.equal(restoreLedgerCreated.changeOnHand, 2);
  assert.equal(restoreLedgerCreated.sourceType, 'legacy_website_order');
});

test('P3-INV-002: 15. Duplicate cancellation replay does not restore stock twice', async (t) => {
  const mockTx = createMockTx();
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Cotton Scarf',
    stockQuantity: 10,
  }));

  t.mock.method(ProductVariant, 'findAll', async () => [
    {
      id: SKU_SIMPLE,
      productId: PROD_SIMPLE,
      storeId: STORE_A,
      sku: 'COTTON-SCARF-DEF',
      status: 'active',
      stockQuantity: 10,
    },
  ]);

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'COTTON-SCARF-DEF',
    productId: PROD_SIMPLE,
    onHand: 10,
    reserved: 0,
    available: 10,
    version: 3,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  const existingRestoreEntry = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    idempotencyKey: `legacy-restore-ord-cancel-101-${SKU_SIMPLE}`,
    changeOnHand: 2,
    reasonCode: 'cancellation',
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => existingRestoreEntry);

  let createCalled = false;
  t.mock.method(InventoryLedgerEntry, 'create', async () => {
    createCalled = true;
  });

  const orderId = 'ord-cancel-101';
  const items = [{ productId: PROD_SIMPLE, quantity: 2 }];

  const results = await restoreOrderInventory(items, mockTx, {
    orderId,
    storeId: STORE_A,
    websiteId: WEB_A,
    idempotencyKey: `legacy-restore-${orderId}`,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].mutation.duplicate, true);
  assert.equal(createCalled, false);
  assert.equal(balanceRecord.onHand, 10);
});

test('P3-INV-002: 16. stockService.updateStock routes through inventoryLedgerService with single-effect idempotency', async (t) => {
  const mockTx = createMockTx();

  const mockOrder = {
    id: 'ord-stock-svc-1',
    storeId: STORE_A,
    websiteId: WEB_A,
    orderType: 'online',
    stockDeducted: false,
    OrderItems: [
      { id: 'item-1', productId: PROD_SIMPLE, variantId: SKU_SIMPLE, quantity: 3 },
    ],
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(Order, 'findByPk', async () => mockOrder);
  t.mock.method(ProductVariant, 'findByPk', async () => ({
    id: SKU_SIMPLE,
    productId: PROD_SIMPLE,
    storeId: STORE_A,
    sku: 'COTTON-DEF',
    stockQuantity: 10,
  }));

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'COTTON-DEF',
    productId: PROD_SIMPLE,
    onHand: 10,
    reserved: 0,
    available: 10,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);

  let ledgerEntryCreated = null;
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledgerEntryCreated = data;
    return data;
  });

  // 1. Deduct
  await stockService.updateStock('ord-stock-svc-1', 'deduct', mockTx);
  assert.equal(mockOrder.stockDeducted, true);
  assert.equal(balanceRecord.onHand, 7);
  assert.equal(ledgerEntryCreated.sourceType, 'legacy_website_order');
  assert.equal(ledgerEntryCreated.changeOnHand, -3);

  // 2. Calling deduct again when stockDeducted is already true is an immediate idempotent return
  const secondResult = await stockService.updateStock('ord-stock-svc-1', 'deduct', mockTx);
  assert.equal(secondResult.id, mockOrder.id);
  assert.equal(balanceRecord.onHand, 7); // Still 7!
});

test('P3-INV-002: 17. sharedStockService.changeStock routes through inventoryLedgerService preserving caller contract', async (t) => {
  const mockTx = createMockTx();

  const mockProduct = {
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Linen Shirt',
    status: 'active',
    trackInventory: true,
    stockQuantity: 15,
    async reload() { return this; },
  };

  const mockVariant = {
    id: SKU_SIMPLE,
    productId: PROD_SIMPLE,
    storeId: STORE_A,
    status: 'active',
    trackInventory: true,
    stockQuantity: 15,
    async reload() { return this; },
  };

  t.mock.method(Product, 'findByPk', async () => mockProduct);
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_SIMPLE,
    sku: 'LINEN-SHIRT-M',
    productId: PROD_SIMPLE,
    onHand: 15,
    reserved: 0,
    available: 15,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);

  let ledgerEntryCreated = null;
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledgerEntryCreated = data;
    return data;
  });

  const res = await sharedStockService.changeStock(PROD_SIMPLE, -4, mockTx, SKU_SIMPLE);
  assert.equal(res.id, SKU_SIMPLE);
  assert.equal(balanceRecord.onHand, 11);
  assert.ok(ledgerEntryCreated);
  assert.equal(ledgerEntryCreated.changeOnHand, -4);
  assert.equal(ledgerEntryCreated.sourceType, 'legacy_shared_stock');
});

test('P3-INV-002: 18. Reconciliation audits mapped vs unmapped rows and fails safely on unexplained records', async (t) => {
  const mockOrders = [
    // 1. Fully mapped order
    {
      id: 'ord-rec-1',
      orderNumber: 'ORD-001',
      websiteId: WEB_A,
      storeId: STORE_A,
      status: 'confirmed',
      stockDeducted: true,
      OrderItems: [
        { id: 'item-1', productId: PROD_SIMPLE, variantId: SKU_SIMPLE, quantity: 1 },
      ],
    },
    // 2. Unmapped website order
    {
      id: 'ord-rec-2',
      orderNumber: 'ORD-002',
      websiteId: 'unknown-website-uuid',
      storeId: null,
      status: 'pending',
      stockDeducted: false,
      OrderItems: [],
    },
  ];

  t.mock.method(Order, 'findAll', async () => mockOrders);

  // Mock website resolution
  t.mock.method(WebsiteData, 'findOne', async ({ where }) => {
    if (where.websiteId === WEB_A) {
      return { websiteId: WEB_A, storeId: STORE_A };
    }
    return null;
  });

  t.mock.method(StoreAccess, 'findAll', async ({ where }) => {
    if (where.websiteId === WEB_A) {
      return [{ storeId: STORE_A, websiteId: WEB_A }];
    }
    return [];
  });

  t.mock.method(StoreAccess, 'findByPk', async (id) => {
    if (id === STORE_A) return { storeId: STORE_A, status: 'active' };
    return null;
  });

  t.mock.method(Product, 'findByPk', async () => ({
    id: PROD_SIMPLE,
    storeId: STORE_A,
    name: 'Item',
  }));

  t.mock.method(ProductVariant, 'findOne', async () => ({
    id: SKU_SIMPLE,
    productId: PROD_SIMPLE,
    storeId: STORE_A,
    sku: 'ITEM-SKU',
  }));

  t.mock.method(ProductVariant, 'findByPk', async () => ({
    id: SKU_SIMPLE,
    productId: PROD_SIMPLE,
    storeId: STORE_A,
  }));

  // Mock ledger entry: ord-rec-1 has matching entry, but also an orphaned entry exists!
  t.mock.method(InventoryLedgerEntry, 'findOne', async ({ where }) => {
    if (where.sourceId === 'ord-rec-1') {
      return { id: 'led-1', sourceId: 'ord-rec-1', skuId: SKU_SIMPLE };
    }
    return null;
  });

  t.mock.method(InventoryLedgerEntry, 'findAll', async () => [
    {
      id: 'led-orphaned-1',
      sourceType: 'legacy_website_order',
      sourceId: 'non-existent-order-id',
      storeId: STORE_A,
      skuId: SKU_SIMPLE,
      changeOnHand: -2,
    },
  ]);

  t.mock.method(Order, 'findByPk', async (id) => {
    if (id === 'ord-rec-1') return mockOrders[0];
    return null; // non-existent-order-id returns null!
  });

  const report = await reconcileLegacyWebsiteStock();

  assert.equal(report.summary.totalOrders, 2);
  assert.equal(report.summary.mappedOrders, 1);
  assert.equal(report.summary.unmappedOrders, 1);
  assert.equal(report.summary.unexplainedRecordsCount, 1);
  assert.equal(report.summary.status, 'UNEXPLAINED_RECORDS_DETECTED');
  assert.equal(report.details.unexplainedRecords[0].type, 'ORPHANED_LEDGER_ENTRY');
});
