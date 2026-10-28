'use strict';

// test/security/returnsRestockingAdjustments.test.js
// P3-INV-002 Slice 6: Comprehensive test suite for returns, restocking, and administrative adjustments.
// Verifies:
// 1. Return request alone does NOT restore inventory.
// 2. Physical receipt with resellable condition restocks available inventory.
// 3. Damaged/non-resellable returns MUST NOT increase sellable stock.
// 4. Mixed item returns: resellable items restocked, damaged items skipped with 0 stock effect.
// 5. Replay and duplicate return receipt cannot restore stock twice (idempotency).
// 6. Refund and restock remain separate decisions.
// 7. Merchant manual adjustments require reason, actor, and evidence.
// 8. Negative manual adjustments cannot create negative balance.
// 9. Administrative adjustments require privileged authorization and audit reason.
// 10. Negative administrative adjustments cannot create negative balance.
// 11. Admin updateProduct routes stock changes through inventoryLedgerService.
// 12. Dedicated admin inventory adjustment endpoint appends immutable ledger entry with admin actor.
// 13. Reconstruct balance verifies ledger invariants after returns and adjustments.
// 14. Static quality check verifies zero direct stock writes across all application modules.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const mockTx = {
  id: 'mock-tx-id',
  uuid: 'mock-tx-uuid',
  LOCK: { UPDATE: 'UPDATE' },
  commit: async () => {},
  rollback: async () => {},
};

sequelize.transaction = async (fn) => {
  if (typeof fn === 'function') return fn(mockTx);
  return mockTx;
};

const {
  Product,
  ProductVariant,
  Order,
  OrderItem,
  OrderEvent,
  InventoryBalance,
  InventoryLedgerEntry,
} = require('../../models');

const skuStoreMap = new Map();
const skuStockMap = new Map();

Product.findByPk = async (id) => {
  const storeId = skuStoreMap.get(id);
  const stockQuantity = skuStockMap.has(id) ? skuStockMap.get(id) : 10;
  return {
    id,
    storeId,
    name: 'Test Product',
    sku: 'TEST-SKU',
    stockQuantity,
    hasVariants: false,
    async update(fields) { Object.assign(this, fields); return this; },
  };
};

ProductVariant.findByPk = async (id) => {
  const storeId = skuStoreMap.get(id);
  const stockQuantity = skuStockMap.has(id) ? skuStockMap.get(id) : 10;
  return {
    id,
    productId: id,
    storeId,
    stockQuantity,
    isDefault: true,
    status: 'active',
    async update(fields) { Object.assign(this, fields); return this; },
  };
};

Product.update = async () => [1];
ProductVariant.update = async () => [1];
Product.findOne = async () => null;

// In-memory test store
const balances = new Map();
const ledgerEntries = [];
const orderEvents = [];

InventoryBalance.findOne = async ({ where }) => {
  const key = `${where.storeId}:${where.skuId}`;
  return balances.get(key) || null;
};

InventoryBalance.create = async (data) => {
  const record = {
    ...data,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };
  const key = `${data.storeId}:${data.skuId}`;
  balances.set(key, record);
  return record;
};

InventoryLedgerEntry.findOne = async (query) => {
  if (query?.where?.idempotencyKey) {
    return ledgerEntries.find((e) => e.idempotencyKey === query.where.idempotencyKey) || null;
  }
  return null;
};

InventoryLedgerEntry.create = async (data) => {
  const entry = { ...data, id: data.id || randomUUID(), createdAt: new Date() };
  ledgerEntries.push(entry);
  return entry;
};

InventoryLedgerEntry.findAll = async (query) => {
  return ledgerEntries.filter((e) => {
    if (query?.where?.storeId && e.storeId !== query.where.storeId) return false;
    if (query?.where?.skuId && e.skuId !== query.where.skuId) return false;
    if (query?.where?.reasonCode && e.reasonCode !== query.where.reasonCode) return false;
    return true;
  });
};

OrderEvent.findOne = async (query) => {
  if (query?.where?.eventKey) {
    return orderEvents.find((e) => e.eventKey === query.where.eventKey) || null;
  }
  return null;
};

OrderEvent.create = async (data) => {
  const evt = { ...data, id: data.id || randomUUID() };
  orderEvents.push(evt);
  return evt;
};

ProductVariant.findOne = async () => null;
ProductVariant.findAll = async () => [];

const { inventoryLedgerService } = require('../../modules/inventory');
const orderStateMachineService = require('../../modules/orders/orderStateMachineService');
const platformOperationsController = require('../../modules/admin/platformOperationsController');
const ProductService = require('../../modules/catalog/ProductService');

// Helper to simulate Express response
const responseHelper = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
  setHeader(k, v) {
    this.headers[k] = v;
  },
});

const setupBalance = async (storeId, skuId, initialOnHand = 10, productId = null) => {
  skuStoreMap.set(skuId, storeId);
  skuStockMap.set(skuId, initialOnHand);
  if (productId) {
    skuStoreMap.set(productId, storeId);
    skuStockMap.set(productId, initialOnHand);
  }
  return inventoryLedgerService.ensureBalance({
    storeId,
    skuId,
    initialOnHand,
    reasonCode: 'opening_balance',
  });
};

test('P3-INV-002 Slice 6: 1. Return request alone does NOT restore inventory', async (t) => {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const skuId = randomUUID();

  // Create initial balance of 10
  await setupBalance(storeId, skuId, 10);

  const order = {
    id: orderId,
    storeId,
    buyerId: 'buyer-1',
    status: 'delivered',
    fulfillmentStatus: 'delivered',
    returnStatus: 'none',
    deliveredAt: new Date(),
    updatedAt: new Date(),
    stockDeducted: true,
    stockRestocked: false,
    OrderItems: [{ id: 'item-1', productId: skuId, skuId, variantId: skuId, sku: skuId, quantity: 2 }],
    async update(data) { Object.assign(this, data); return this; },
  };

  t.mock.method(Order, 'findByPk', async () => order);

  // Buyer requests return
  const result = await orderStateMachineService.requestReturn(orderId, {
    actor: { id: 'buyer-1', type: 'buyer' },
    reason: 'Wrong size',
    evidence: 'Photo attached',
    idempotencyKey: `ret-req-${orderId}`,
  });

  assert.equal(result.order.returnStatus, 'return_requested');
  assert.equal(result.order.stockRestocked, false);

  // Balance MUST remain exactly 10
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 10, 'On-hand balance must not change on return request');
  assert.equal(balance.available, 10, 'Available balance must not change on return request');
});

test('P3-INV-002 Slice 6: 2. Accepted physical receipt with resellable condition restocks available inventory', async (t) => {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const skuId = randomUUID();

  // Initial balance 10
  await setupBalance(storeId, skuId, 10);

  const orderItem = {
    id: 'item-resellable-1',
    productId: skuId,
    skuId,
    variantId: skuId,
    sku: skuId,
    quantity: 3,
    returnCondition: null,
    restockedQuantity: 0,
    async update(data) { Object.assign(this, data); return this; },
  };

  const order = {
    id: orderId,
    storeId,
    buyerId: 'buyer-1',
    status: 'delivered',
    fulfillmentStatus: 'delivered',
    returnStatus: 'return_approved',
    stockDeducted: true,
    stockRestocked: false,
    OrderItems: [orderItem],
    async update(data) { Object.assign(this, data); return this; },
  };

  t.mock.method(Order, 'findByPk', async () => order);

  // Merchant physically receives return and inspects as resellable
  const result = await orderStateMachineService.receiveReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'resellable',
    reason: 'Items in perfect condition, original packaging',
    idempotencyKey: `ret-rec-${orderId}`,
  });

  assert.equal(result.order.returnStatus, 'return_received');
  assert.equal(result.order.stockRestocked, true);
  assert.equal(orderItem.returnCondition, 'resellable');
  assert.equal(orderItem.restockedQuantity, 3);

  // Authoritative balance must increase by 3: 10 + 3 = 13
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 13, 'On-hand balance must increase by returned quantity');
  assert.equal(balance.available, 13, 'Available balance must increase by returned quantity');

  // Verify immutable ledger entry
  const entries = await InventoryLedgerEntry.findAll({
    where: { storeId, skuId, reasonCode: 'return' },
  });
  assert.ok(entries.length >= 1);
  assert.equal(entries[entries.length - 1].changeOnHand, 3);
  assert.equal(entries[entries.length - 1].sourceType, 'order');
  assert.equal(entries[entries.length - 1].sourceId, orderId);
});

test('P3-INV-002 Slice 6: 3. Damaged/non-resellable returns MUST NOT increase sellable stock', async (t) => {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const skuId = randomUUID();

  // Initial balance 10
  await setupBalance(storeId, skuId, 10);

  const orderItem = {
    id: 'item-damaged-1',
    productId: skuId,
    skuId,
    variantId: skuId,
    sku: skuId,
    quantity: 2,
    returnCondition: null,
    restockedQuantity: 0,
    async update(data) { Object.assign(this, data); return this; },
  };

  const order = {
    id: orderId,
    storeId,
    buyerId: 'buyer-1',
    status: 'delivered',
    fulfillmentStatus: 'delivered',
    returnStatus: 'return_approved',
    stockDeducted: true,
    stockRestocked: false,
    OrderItems: [orderItem],
    async update(data) { Object.assign(this, data); return this; },
  };

  t.mock.method(Order, 'findByPk', async () => order);

  // Merchant receives return but inspection marks item as damaged
  const result = await orderStateMachineService.receiveReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'damaged',
    reason: 'Item crushed during transit; unsellable',
    evidence: 'Inspection report #102',
    idempotencyKey: `ret-rec-damaged-${orderId}`,
  });

  assert.equal(result.order.returnStatus, 'return_received');
  assert.equal(result.order.stockRestocked, true);
  assert.equal(orderItem.returnCondition, 'damaged');
  assert.equal(orderItem.restockedQuantity, 0);

  // Balance MUST remain exactly 10 - sellable stock cannot increase
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 10, 'Damaged return must NOT increase on-hand balance');
  assert.equal(balance.available, 10, 'Damaged return must NOT increase available balance');

  // Verify event recorded damaged count
  assert.equal(result.event.details.damagedCount, 2);
  assert.equal(result.event.details.restockedCount, 0);
});

test('P3-INV-002 Slice 6: 4. Mixed item returns: resellable items restocked, damaged items skipped', async (t) => {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const skuGood = randomUUID();
  const skuDamaged = randomUUID();

  await setupBalance(storeId, skuGood, 10);
  await setupBalance(storeId, skuDamaged, 10);

  const itemGood = {
    id: 'item-good',
    productId: skuGood,
    skuId: skuGood,
    variantId: skuGood,
    sku: skuGood,
    quantity: 2,
    returnCondition: null,
    restockedQuantity: 0,
    async update(data) { Object.assign(this, data); return this; },
  };

  const itemBad = {
    id: 'item-bad',
    productId: skuDamaged,
    skuId: skuDamaged,
    variantId: skuDamaged,
    sku: skuDamaged,
    quantity: 3,
    returnCondition: null,
    restockedQuantity: 0,
    async update(data) { Object.assign(this, data); return this; },
  };

  const order = {
    id: orderId,
    storeId,
    buyerId: 'buyer-1',
    status: 'delivered',
    fulfillmentStatus: 'delivered',
    returnStatus: 'return_approved',
    stockDeducted: true,
    stockRestocked: false,
    OrderItems: [itemGood, itemBad],
    async update(data) { Object.assign(this, data); return this; },
  };

  t.mock.method(Order, 'findByPk', async () => order);

  // Specify explicit per-item inspection outcomes
  const result = await orderStateMachineService.receiveReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    itemsToRestock: [
      { id: 'item-good', quantity: 2, condition: 'resellable', restock: true },
      { id: 'item-bad', quantity: 3, condition: 'damaged', restock: false },
    ],
    reason: 'Partial restock: 1 good item, 1 damaged',
    idempotencyKey: `ret-mixed-${orderId}`,
  });

  assert.equal(result.order.returnStatus, 'return_received');
  assert.equal(itemGood.returnCondition, 'resellable');
  assert.equal(itemGood.restockedQuantity, 2);
  assert.equal(itemBad.returnCondition, 'damaged');
  assert.equal(itemBad.restockedQuantity, 0);

  // Good SKU: 10 + 2 = 12
  const balanceGood = await inventoryLedgerService.getBalance({ storeId, skuId: skuGood });
  assert.equal(balanceGood.onHand, 12);

  // Damaged SKU: remains 10
  const balanceBad = await inventoryLedgerService.getBalance({ storeId, skuId: skuDamaged });
  assert.equal(balanceBad.onHand, 10);
});

test('P3-INV-002 Slice 6: 5. Replay and duplicate return receipt cannot restore stock twice', async (t) => {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const skuId = randomUUID();

  await setupBalance(storeId, skuId, 10);

  const orderItem = {
    id: 'item-dup-1',
    productId: skuId,
    skuId,
    variantId: skuId,
    sku: skuId,
    quantity: 4,
    async update(data) { Object.assign(this, data); return this; },
  };

  const order = {
    id: orderId,
    storeId,
    buyerId: 'buyer-1',
    status: 'delivered',
    fulfillmentStatus: 'delivered',
    returnStatus: 'return_approved',
    stockDeducted: true,
    stockRestocked: false,
    OrderItems: [orderItem],
    async update(data) { Object.assign(this, data); return this; },
  };

  t.mock.method(Order, 'findByPk', async () => order);

  const key = `ret-dup-test-${orderId}`;

  // Call 1: Physical receipt and restock
  const res1 = await orderStateMachineService.receiveReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'resellable',
    idempotencyKey: key,
  });
  assert.equal(res1.duplicate, false);
  assert.equal(order.stockRestocked, true);

  const bal1 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(bal1.onHand, 14, 'First receipt increases stock from 10 to 14');

  // Call 2: Replay with identical idempotency key
  const res2 = await orderStateMachineService.receiveReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'resellable',
    idempotencyKey: key,
  });
  assert.equal(res2.duplicate, true);

  // Call 3: Call again even with new key on already-restocked order
  const res3 = await orderStateMachineService.receiveReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    inspectionOutcome: 'resellable',
    idempotencyKey: `new-key-${randomUUID()}`,
  });
  assert.equal(res3.duplicate, true);

  // Stock MUST remain 14, never 18 or 22
  const bal2 = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(bal2.onHand, 14, 'Stock must not be restocked a second time');
});

test('P3-INV-002 Slice 6: 6. Refund and restock remain separate decisions', async (t) => {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const skuId = randomUUID();

  await setupBalance(storeId, skuId, 10);

  const orderItem = {
    id: 'item-separate-1',
    productId: skuId,
    skuId,
    variantId: skuId,
    sku: skuId,
    quantity: 5,
    async update(data) { Object.assign(this, data); return this; },
  };

  const order = {
    id: orderId,
    storeId,
    buyerId: 'buyer-1',
    status: 'delivered',
    fulfillmentStatus: 'delivered',
    returnStatus: 'return_received',
    stockDeducted: true,
    stockRestocked: true,
    OrderItems: [orderItem],
    async update(data) { Object.assign(this, data); return this; },
  };

  t.mock.method(Order, 'findByPk', async () => order);

  // Complete return with refund transaction
  const result = await orderStateMachineService.completeReturn(orderId, {
    actor: { id: 'merchant-1', role: 'merchant' },
    refundTransactionId: 'txn-refund-999',
    reason: 'Customer refunded via original payment method',
    idempotencyKey: `ret-comp-${orderId}`,
  });

  assert.equal(result.order.returnStatus, 'return_completed');

  // Stock is completely unaffected by refund completion
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 10, 'Refund completion must NOT mutate inventory');
});

test('P3-INV-002 Slice 6: 7. Merchant manual adjustment requires reason, actor, and evidence', async (t) => {
  const service = new ProductService('website-test');
  const productId = randomUUID();

  // Missing reason/evidence throws 400
  await assert.rejects(
    async () => {
      await service.updateInventory(productId, {
        quantity: 5,
        expectedVersion: 1,
        // no note or reason
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes('Reason or note is required'));
      return true;
    }
  );

  // Non-safe quantity throws 400
  await assert.rejects(
    async () => {
      await service.updateInventory(productId, {
        quantity: 0,
        expectedVersion: 1,
        note: 'zero test',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test('P3-INV-002 Slice 6: 8. Negative manual adjustment cannot create negative balance', async (t) => {
  const storeId = randomUUID();
  const skuId = randomUUID();

  // Create balance of 3
  await setupBalance(storeId, skuId, 3);

  // Attempt adjusting by -5 (exceeding 3)
  await assert.rejects(
    async () => {
      await inventoryLedgerService.adjustBalance({
        storeId,
        skuId,
        delta: -5,
        reasonCode: 'manual_adjustment',
        actor: { id: 'merchant-1', type: 'merchant' },
        idempotencyKey: `neg-adj-${randomUUID()}`,
        notes: 'Damaged inventory writeoff',
      });
    },
    (err) => {
      assert.ok(err.message.includes('negative') || err.message.includes('Insufficient'));
      return true;
    }
  );

  // Balance remains 3
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 3);
});

test('P3-INV-002 Slice 6: 9. Administrative adjustment requires privileged authorization and audit reason', async (t) => {
  const req = {
    user: { id: 'admin-1', role: 'admin' },
    body: {
      storeId: randomUUID(),
      skuId: randomUUID(),
      delta: 10,
      // no reason or evidence
    },
  };
  const res = responseHelper();

  // Missing audit reason throws 400
  await assert.rejects(
    async () => {
      await platformOperationsController.adjustInventory(req, res);
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes('reason or evidence is required'));
      return true;
    }
  );
});

test('P3-INV-002 Slice 6: 10. Negative administrative adjustment cannot create negative balance', async (t) => {
  const storeId = randomUUID();
  const skuId = randomUUID();

  await setupBalance(storeId, skuId, 5);

  const req = {
    user: { id: 'admin-1', role: 'admin' },
    body: {
      storeId,
      skuId,
      delta: -10, // exceeds on-hand 5
      reason: 'Audit correction for physical count discrepancy',
    },
    headers: {},
  };
  const res = responseHelper();

  await assert.rejects(
    async () => {
      await platformOperationsController.adjustInventory(req, res);
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes('negative'));
      return true;
    }
  );

  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 5);
});

test('P3-INV-002 Slice 6: 11. Admin adjustInventory creates immutable ledger entry with admin actor', async (t) => {
  const storeId = randomUUID();
  const skuId = randomUUID();

  await setupBalance(storeId, skuId, 10);

  const req = {
    user: { id: 'admin-super', role: 'admin' },
    body: {
      storeId,
      skuId,
      delta: 15,
      reasonCode: 'restock',
      reason: 'Emergency restock authorized by platform support',
      idempotencyKey: `admin-restock-${randomUUID()}`,
    },
    headers: {},
  };
  const res = responseHelper();

  await platformOperationsController.adjustInventory(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);

  // Balance updated to 25
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 25);

  // Check ledger entry attribution
  const entries = await InventoryLedgerEntry.findAll({
    where: { storeId, skuId, reasonCode: 'restock' },
  });
  const latest = entries[entries.length - 1];
  assert.equal(latest.actorId, 'admin-super');
  assert.equal(latest.actorType, 'admin');
  assert.equal(latest.sourceType, 'admin_adjustment');
});

test('P3-INV-002 Slice 6: 12. Admin updateProduct routes stock change through canonical inventory ledger', async (t) => {
  const storeId = randomUUID();
  const productId = randomUUID();
  const skuId = productId;

  await setupBalance(storeId, skuId, 5);

  const mockProduct = {
    id: productId,
    storeId,
    marketplaceVisibility: null,
    status: 'active',
    stockQuantity: 5,
    version: 1,
    async update(changes) { Object.assign(this, changes); return this; },
  };

  t.mock.method(Product, 'findByPk', async () => mockProduct);

  const req = {
    params: { id: productId },
    user: { id: 'admin-mod', role: 'admin' },
    body: {
      stockQuantity: 20,
      reason: 'Admin stock correction',
    },
    headers: {},
  };
  const res = responseHelper();

  await platformOperationsController.updateProduct(req, res);
  assert.equal(res.body.success, true);
  assert.equal(mockProduct.stockQuantity, 20);

  // Canonical ledger must reflect 20
  const balance = await inventoryLedgerService.getBalance({ storeId, skuId });
  assert.equal(balance.onHand, 20);
});

test('P3-INV-002 Slice 6: 13. Reconstruct balance verifies ledger invariants after returns and adjustments', async (t) => {
  const storeId = randomUUID();
  const skuId = randomUUID();

  // 1. Opening balance 100
  await setupBalance(storeId, skuId, 100);

  // 2. Sale of 20
  await inventoryLedgerService.mutateBalance({
    storeId,
    skuId,
    changeOnHand: -20,
    changeReserved: 0,
    reasonCode: 'sale',
    sourceType: 'order',
    sourceId: randomUUID(),
    actor: { id: 'buyer-1', type: 'buyer' },
    idempotencyKey: `sale-${randomUUID()}`,
  });

  // 3. Return receipt restock of 5
  await inventoryLedgerService.mutateBalance({
    storeId,
    skuId,
    changeOnHand: 5,
    changeReserved: 0,
    reasonCode: 'return',
    sourceType: 'order',
    sourceId: randomUUID(),
    actor: { id: 'merchant-1', type: 'merchant' },
    idempotencyKey: `ret-${randomUUID()}`,
  });

  // 4. Admin manual adjustment of +15
  await inventoryLedgerService.adjustBalance({
    storeId,
    skuId,
    delta: 15,
    reasonCode: 'manual_adjustment',
    actor: { id: 'admin-1', type: 'admin' },
    idempotencyKey: `adj-${randomUUID()}`,
    notes: 'Warehouse audit correction',
  });

  // Reconstruct and verify exact invariant match: 100 - 20 + 5 + 15 = 100
  const audit = await inventoryLedgerService.reconstructBalance({ storeId, skuId });
  assert.equal(audit.match, true, 'Mathematical ledger sum must exactly match balance snapshot');
  assert.equal(audit.calculated.onHand, 100);
  assert.equal(audit.actual.onHand, 100);
  assert.equal(audit.calculated.available, 100);
});

test('P3-INV-002 Slice 6: 14. Static quality check: zero direct stock writes across all application modules', () => {
  const scriptPath = path.resolve(__dirname, '../../scripts/quality/check-no-direct-stock-writes.js');
  const result = execSync(`node "${scriptPath}"`, { encoding: 'utf8' });
  assert.ok(result.includes('Static enforcement passed'), 'Static enforcement must pass');
  assert.ok(result.includes('Zero direct stock writes detected'), 'Zero direct writes must be verified');
});
