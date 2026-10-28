'use strict';

// test/security/marketplaceCheckoutInventory.test.js
// Verification suite for P3-INV-002 Slice 1: Marketplace checkout and marketplace cancellation.
// Verifies transactional reservation, fulfillment, last-unit concurrency, idempotency retries,
// single restoration on cancellation, multi-store order isolation, atomicity policies, and static enforcement.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
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

const checkoutService = require('../../modules/checkout/marketplaceCheckoutService');
const {
  Cart,
  CartItem,
  Order,
  OrderItem,
  Payment,
  StoreAccess,
  StoreDeliveryPolicy,
  Product,
  ProductVariant,
  InventoryBalance,
  InventoryLedgerEntry,
  InventoryReservation,
  OrderEvent,
} = require('../../models');

ProductVariant.update = async () => [1];
Product.update = async () => [1];

const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const BUYER_A = '33333333-3333-4333-8333-333333333333';
const BUYER_B = '44444444-4444-4444-8444-444444444444';
const PROD_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SKU_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROD_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SKU_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function createMockStore(storeId, overrides = {}) {
  return {
    storeId,
    displayName: `Store ${storeId.slice(0, 8)}`,
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
    needsCategoryReview: false,
    websiteId: null,
    ...overrides,
  };
}

function createMockPolicy(storeId, overrides = {}) {
  return {
    storeId,
    flatFee: '5.00',
    currency: 'USD',
    version: 1,
    ...overrides,
  };
}

function createMockTx() {
  const txId = randomUUID();
  return { id: txId, uuid: txId, LOCK: { UPDATE: 'UPDATE' } };
}

test('P3-INV-002: 1. Transactional stock reservation and sale fulfillment during checkout', async (t) => {
  const mockStore = createMockStore(STORE_A);
  const mockPolicy = createMockPolicy(STORE_A);

  const mockProduct = {
    id: PROD_A,
    storeId: STORE_A,
    name: 'Khmer Silk Shirt',
    slug: 'khmer-silk-shirt',
    price: '25.00',
    currency: 'USD',
    trackInventory: true,
    stockQuantity: 10,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
    version: 1,
  };

  const mockVariant = {
    id: SKU_A,
    productId: PROD_A,
    storeId: STORE_A,
    sku: 'KHM-SILK-M',
    price: '25.00',
    currency: 'USD',
    stockQuantity: 10,
    trackInventory: true,
    isDefault: true,
    status: 'active',
  };

  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'KHM-SILK-M',
    productId: PROD_A,
    onHand: 10,
    reserved: 0,
    available: 10,
    version: 1,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  const ledgerEntries = [];
  const reservations = [];
  const orderItems = [];
  let createdOrder = null;
  let createdPayment = null;

  const cartId = randomUUID();
  const mockCart = { id: cartId, buyerId: BUYER_A, storeId: STORE_A, websiteId: null };
  const mockCartItems = [{ id: 'ci-1', cartId, productId: PROD_A, variantId: SKU_A, quantity: 2 }];

  t.mock.method(sequelize, 'transaction', async (fn) => fn(createMockTx()));
  t.mock.method(ProductVariant, 'update', async () => [1]);
  t.mock.method(Product, 'update', async () => [1]);

  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? mockStore : null));
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async (id) => (id === STORE_A ? mockPolicy : null));
  t.mock.method(Product, 'findByPk', async (id) => (id === PROD_A ? mockProduct : null));
  t.mock.method(ProductVariant, 'findByPk', async (id) => (id === SKU_A ? mockVariant : null));
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);

  t.mock.method(Cart, 'findOne', async () => mockCart);
  t.mock.method(CartItem, 'findAll', async () => mockCartItems);
  t.mock.method(CartItem, 'destroy', async () => 1);
  t.mock.method(Cart, 'destroy', async () => 1);

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledgerEntries.push(data);
    return data;
  });

  t.mock.method(InventoryReservation, 'create', async (data) => {
    const res = { ...data, async update(f) { Object.assign(this, f); return this; } };
    reservations.push(res);
    return res;
  });
  t.mock.method(InventoryReservation, 'findByPk', async (id) => reservations.find((r) => r.id === id) || null);

  t.mock.method(Order, 'findOne', async () => null);
  t.mock.method(Order, 'create', async (data) => {
    createdOrder = { id: randomUUID(), ...data, async update(f) { Object.assign(this, f); return this; } };
    return createdOrder;
  });
  t.mock.method(OrderItem, 'create', async (data) => {
    const item = { id: randomUUID(), ...data };
    orderItems.push(item);
    return item;
  });
  t.mock.method(Payment, 'create', async (data) => {
    createdPayment = { id: randomUUID(), ...data };
    return createdPayment;
  });

  const checkoutKey = 'idemp-chk-flow-1';
  const result = await checkoutService.checkout({
    buyerId: BUYER_A,
    storeId: STORE_A,
    checkoutKey,
    expectedTotalAmount: '55.00', // 2 * $25 + $5 delivery
    customerInfo: { name: 'Sokha Chan', phone: '+85512345678' },
    shippingInfo: { address: 'Street 240, Phnom Penh' },
  });

  assert.ok(result);
  assert.equal(result.subtotal, '50.00');
  assert.equal(result.deliveryFee, '5.00');
  assert.equal(result.totalAmount, '55.00');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].snapshot.sku, 'KHM-SILK-M');

  // Verify Ledger Invariants:
  // 1. Reservation entry created
  const resEntry = ledgerEntries.find((e) => e.reasonCode === 'reservation');
  assert.ok(resEntry, 'Reservation ledger entry must exist');
  assert.equal(resEntry.changeReserved, 2);
  assert.equal(resEntry.changeOnHand, 0);
  assert.equal(resEntry.skuId, SKU_A);
  assert.equal(resEntry.storeId, STORE_A);

  // 2. Sale fulfillment entry created
  const saleEntry = ledgerEntries.find((e) => e.reasonCode === 'sale');
  assert.ok(saleEntry, 'Sale ledger entry must exist');
  assert.equal(saleEntry.changeOnHand, -2);
  assert.equal(saleEntry.changeReserved, -2);
  assert.equal(saleEntry.skuId, SKU_A);
  assert.equal(saleEntry.storeId, STORE_A);

  // 3. Final Balance invariant: onHand was 10 -> 8; reserved was 2 -> 0; available is 8
  assert.equal(balanceRecord.onHand, 8);
  assert.equal(balanceRecord.reserved, 0);
  assert.equal(balanceRecord.available, 8);
});

test('P3-INV-002: 2. Last-Unit Concurrency: 2 concurrent checkouts compete for 1 unit; exactly 1 winner, no negative balance', async (t) => {
  const mockStore = createMockStore(STORE_A);
  const mockPolicy = createMockPolicy(STORE_A);

  const mockProduct = {
    id: PROD_A,
    storeId: STORE_A,
    name: 'Last Unit Item',
    slug: 'last-unit-item',
    price: '20.00',
    currency: 'USD',
    trackInventory: true,
    stockQuantity: 1,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
    version: 1,
  };

  const mockVariant = {
    id: SKU_A,
    productId: PROD_A,
    storeId: STORE_A,
    sku: 'LAST-UNIT-SKU',
    price: '20.00',
    currency: 'USD',
    stockQuantity: 1,
    trackInventory: true,
    isDefault: true,
    status: 'active',
  };

  // State: exactly 1 unit available
  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'LAST-UNIT-SKU',
    productId: PROD_A,
    onHand: 1,
    reserved: 0,
    available: 1,
    version: 1,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  // Mutex simulating database row lock on InventoryBalance
  let lockAcquired = false;
  const lockQueue = [];
  async function acquireRowLock() {
    if (!lockAcquired) {
      lockAcquired = true;
      return;
    }
    await new Promise((resolve) => lockQueue.push(resolve));
  }
  function releaseRowLock() {
    if (lockQueue.length > 0) {
      const next = lockQueue.shift();
      next();
    } else {
      lockAcquired = false;
    }
  }

  t.mock.method(sequelize, 'transaction', async (fn) => {
    await acquireRowLock();
    try {
      return await fn(createMockTx());
    } finally {
      releaseRowLock();
    }
  });

  t.mock.method(StoreAccess, 'findByPk', async () => mockStore);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockPolicy);
  t.mock.method(Product, 'findByPk', async () => mockProduct);
  t.mock.method(ProductVariant, 'findByPk', async () => mockVariant);
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);

  const cartIdA = randomUUID();
  const cartIdB = randomUUID();
  t.mock.method(Cart, 'findOne', async (opt) => ({
    id: opt.where.buyerId === BUYER_A ? cartIdA : cartIdB,
    buyerId: opt.where.buyerId,
    storeId: STORE_A,
    websiteId: null,
  }));

  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-last', productId: PROD_A, variantId: SKU_A, quantity: 1 },
  ]);
  t.mock.method(CartItem, 'destroy', async () => 1);
  t.mock.method(Cart, 'destroy', async () => 1);

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => data);

  const resList = [];
  t.mock.method(InventoryReservation, 'create', async (data) => {
    const res = { ...data, async update(f) { Object.assign(this, f); return this; } };
    resList.push(res);
    return res;
  });
  t.mock.method(InventoryReservation, 'findByPk', async (id) => resList.find((r) => r.id === id) || null);

  t.mock.method(Order, 'findOne', async () => null);
  t.mock.method(Order, 'create', async (data) => ({
    id: randomUUID(), ...data, async update(f) { Object.assign(this, f); return this; },
  }));
  t.mock.method(OrderItem, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(OrderItem, 'findAll', async () => [
    { id: 'item-comp-a', productId: PROD_A, variantId: SKU_A, quantity: 1, price: '10.00' },
  ]);
  t.mock.method(Payment, 'create', async (data) => ({ id: randomUUID(), ...data }));

  // Run 2 simultaneous checkouts competing for the single unit
  const req1 = {
    buyerId: BUYER_A,
    storeId: STORE_A,
    checkoutKey: 'race-checkout-1',
    expectedTotalAmount: '25.00',
    customerInfo: { name: 'Buyer 1', phone: '+85511111111' },
    shippingInfo: { address: 'Address 1' },
  };

  const req2 = {
    buyerId: BUYER_B,
    storeId: STORE_A,
    checkoutKey: 'race-checkout-2',
    expectedTotalAmount: '25.00',
    customerInfo: { name: 'Buyer 2', phone: '+85522222222' },
    shippingInfo: { address: 'Address 2' },
  };

  const results = await Promise.allSettled([
    checkoutService.checkout(req1),
    checkoutService.checkout(req2),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  // Assert exactly ONE winner
  assert.equal(fulfilled.length, 1, 'Exactly one concurrent checkout must succeed');
  assert.equal(rejected.length, 1, 'Exactly one concurrent checkout must fail');

  // Assert rejected reason is 409 Insufficient stock
  assert.equal(rejected[0].reason.statusCode, 409);
  assert.match(rejected[0].reason.message, /Insufficient stock/);

  // Assert non-negative balance invariant: onHand = 0, reserved = 0, available = 0
  assert.equal(balanceRecord.onHand, 0, 'onHand must not become negative');
  assert.equal(balanceRecord.reserved, 0, 'reserved must return to 0');
  assert.equal(balanceRecord.available, 0, 'available must be 0');
});

test('P3-INV-002: 3. Replay and Retry Idempotency: Duplicate checkout does not duplicate stock deduction', async (t) => {
  const mockStore = createMockStore(STORE_A);
  const mockPolicy = createMockPolicy(STORE_A);

  const mockProduct = {
    id: PROD_A,
    storeId: STORE_A,
    name: 'Idempotency Item',
    slug: 'idemp-item',
    price: '30.00',
    currency: 'USD',
    trackInventory: true,
    stockQuantity: 5,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
    version: 1,
  };

  const mockVariant = {
    id: SKU_A,
    productId: PROD_A,
    storeId: STORE_A,
    sku: 'IDEMP-SKU',
    price: '30.00',
    currency: 'USD',
    stockQuantity: 5,
    trackInventory: true,
    isDefault: true,
    status: 'active',
  };

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'IDEMP-SKU',
    productId: PROD_A,
    onHand: 5,
    reserved: 0,
    available: 5,
    version: 1,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  let committedOrder = null;
  const ledgerEntries = [];
  const reservations = [];

  t.mock.method(sequelize, 'transaction', async (fn) => fn(createMockTx()));
  t.mock.method(StoreAccess, 'findByPk', async () => mockStore);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockPolicy);
  t.mock.method(Product, 'findByPk', async () => mockProduct);
  t.mock.method(ProductVariant, 'findByPk', async () => mockVariant);
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);

  t.mock.method(Cart, 'findOne', async () => ({ id: 'cart-idemp', buyerId: BUYER_A, storeId: STORE_A }));
  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-idemp', productId: PROD_A, variantId: SKU_A, quantity: 1 },
  ]);
  t.mock.method(CartItem, 'destroy', async () => 1);
  t.mock.method(Cart, 'destroy', async () => 1);

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async (opt) => {
    return ledgerEntries.find((e) => e.idempotencyKey === opt.where.idempotencyKey) || null;
  });
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledgerEntries.push(data);
    return data;
  });

  t.mock.method(InventoryReservation, 'create', async (data) => {
    const res = { ...data, async update(f) { Object.assign(this, f); return this; } };
    reservations.push(res);
    return res;
  });
  t.mock.method(InventoryReservation, 'findByPk', async (id) => reservations.find((r) => r.id === id) || null);

  t.mock.method(Order, 'findOne', async (opt) => {
    if (opt.where.checkoutKey === 'idemp-replay-key') return committedOrder;
    return null;
  });
  t.mock.method(Order, 'create', async (data) => {
    committedOrder = {
      id: randomUUID(),
      ...data,
      totalAmount: data.totalAmount,
      async update(f) { Object.assign(this, f); return this; },
    };
    return committedOrder;
  });
  t.mock.method(OrderItem, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(OrderItem, 'findAll', async () => [
    { id: randomUUID(), productId: PROD_A, variantId: SKU_A, quantity: 1, price: '30.00' },
  ]);
  t.mock.method(Payment, 'create', async (data) => ({ id: randomUUID(), ...data, status: 'pending' }));
  t.mock.method(Payment, 'findOne', async () => ({ id: randomUUID(), amount: '35.00', status: 'pending' }));

  const checkoutPayload = {
    buyerId: BUYER_A,
    storeId: STORE_A,
    checkoutKey: 'idemp-replay-key',
    expectedTotalAmount: '35.00',
    customerInfo: { name: 'Replay Buyer', phone: '+85512345678' },
    shippingInfo: { address: 'Phnom Penh Address' },
  };

  // Initial checkout
  const order1 = await checkoutService.checkout(checkoutPayload);
  assert.ok(order1);
  assert.equal(balanceRecord.onHand, 4);

  const initialSaleEntries = ledgerEntries.filter((e) => e.reasonCode === 'sale').length;
  assert.equal(initialSaleEntries, 1);

  // Second checkout with identical key (Replay)
  const order2 = await checkoutService.checkout(checkoutPayload);
  assert.equal(order2.id, order1.id, 'Replayed checkout must return existing order');

  // Stock deduction must NOT be repeated!
  assert.equal(balanceRecord.onHand, 4, 'Stock must not be deducted twice on replay');
  const secondSaleEntries = ledgerEntries.filter((e) => e.reasonCode === 'sale').length;
  assert.equal(secondSaleEntries, 1, 'Sale entries count must remain 1');
});

test('P3-INV-002: 4. Checkout Failure Rollback: Stale totals rollback reservation and leave stock untouched', async (t) => {
  const mockStore = createMockStore(STORE_A);
  const mockPolicy = createMockPolicy(STORE_A);

  const mockProduct = {
    id: PROD_A,
    storeId: STORE_A,
    name: 'Rollback Item',
    slug: 'rollback-item',
    price: '20.00',
    currency: 'USD',
    trackInventory: true,
    stockQuantity: 5,
    status: 'active',
    marketplaceCategory: 'Clothing',
    marketplaceVisibility: true,
    version: 1,
  };

  const mockVariant = {
    id: SKU_A,
    productId: PROD_A,
    storeId: STORE_A,
    sku: 'ROLLBACK-SKU',
    price: '20.00',
    currency: 'USD',
    stockQuantity: 5,
    trackInventory: true,
    isDefault: true,
    status: 'active',
  };

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'ROLLBACK-SKU',
    productId: PROD_A,
    onHand: 5,
    reserved: 0,
    available: 5,
    version: 1,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  // Simulate transactional rollback
  let inTxSnapshot = null;
  t.mock.method(sequelize, 'transaction', async (fn) => {
    inTxSnapshot = { ...balanceRecord };
    try {
      return await fn(createMockTx());
    } catch (err) {
      // Rollback restores state
      Object.assign(balanceRecord, inTxSnapshot);
      throw err;
    }
  });

  t.mock.method(StoreAccess, 'findByPk', async () => mockStore);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockPolicy);
  t.mock.method(Product, 'findByPk', async () => mockProduct);
  t.mock.method(ProductVariant, 'findByPk', async () => mockVariant);
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);

  t.mock.method(Cart, 'findOne', async () => ({ id: 'cart-rb', buyerId: BUYER_A, storeId: STORE_A }));
  t.mock.method(CartItem, 'findAll', async () => [
    { id: 'ci-rb', productId: PROD_A, variantId: SKU_A, quantity: 1 },
  ]);

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => data);
  t.mock.method(InventoryReservation, 'create', async (data) => ({ ...data, async update() {} }));
  t.mock.method(Order, 'findOne', async () => null);

  // Client provides wrong expected total ($10.00 instead of $25.00)
  await assert.rejects(
    checkoutService.checkout({
      buyerId: BUYER_A,
      storeId: STORE_A,
      checkoutKey: 'fail-total-rb',
      expectedTotalAmount: '10.00',
      customerInfo: { name: 'Buyer', phone: '+85512345678' },
      shippingInfo: { address: 'Address' },
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'TOTAL_MISMATCH');
      return true;
    }
  );

  // Invariant: Balance remains completely unmutated
  assert.equal(balanceRecord.onHand, 5);
  assert.equal(balanceRecord.reserved, 0);
  assert.equal(balanceRecord.available, 5);
});

test('P3-INV-002: 5. Marketplace Delivery Failure & Cancellation: Stock restored exactly once via canonical ledger', async (t) => {
  const ORDER_ID = randomUUID();
  const LINE_ID = randomUUID();

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'CANCEL-TEST-SKU',
    productId: PROD_A,
    onHand: 4, // 1 unit was deducted when order placed
    reserved: 0,
    available: 4,
    version: 2,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  const orderRecord = {
    id: ORDER_ID,
    storeId: STORE_A,
    buyerId: BUYER_A,
    checkoutKey: 'placed-chk-key',
    salesChannel: 'marketplace',
    deliveryStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    status: 'pending',
    stockDeducted: true,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  const paymentRecord = {
    id: randomUUID(),
    orderId: ORDER_ID,
    storeId: STORE_A,
    paymentMethod: 'COD',
    status: 'pending',
    amount: '25.00',
    collectedAmount: '0.00',
    refundedAmount: '0.00',
    async update(fields) { Object.assign(this, fields); return this; },
  };

  const orderItemRecord = {
    id: LINE_ID,
    orderId: ORDER_ID,
    productId: PROD_A,
    variantId: SKU_A,
    quantity: 1,
  };

  const ledgerEntries = [];
  const events = [];

  t.mock.method(sequelize, 'transaction', async (fn) => fn(createMockTx()));
  t.mock.method(Order, 'findOne', async () => orderRecord);
  t.mock.method(Payment, 'findOne', async () => paymentRecord);
  t.mock.method(OrderItem, 'findAll', async () => [orderItemRecord]);

  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledgerEntries.push(data);
    return data;
  });

  t.mock.method(OrderEvent, 'findOne', async (opt) => events.find((e) => e.eventKey === opt.where.eventKey) || null);
  t.mock.method(OrderEvent, 'create', async (data) => {
    events.push(data);
    return data;
  });

  const cancelKey = 'cancel-evt-001';
  const updatedOrder = await checkoutService.merchantAction({
    storeId: STORE_A,
    orderId: ORDER_ID,
    actorId: randomUUID(),
    eventKey: cancelKey,
    action: 'delivery_failed',
    details: { reason: 'Customer unreachable', resolution: 'cancel' },
  });

  assert.equal(updatedOrder.status, 'cancelled');
  assert.equal(updatedOrder.deliveryStatus, 'failed');
  assert.equal(orderRecord.stockDeducted, false);

  // Invariant 1: Ledger entry recorded with reasonCode: 'cancellation'
  const cancelLedger = ledgerEntries.find((e) => e.reasonCode === 'cancellation');
  assert.ok(cancelLedger, 'Cancellation ledger entry must be created');
  assert.equal(cancelLedger.changeOnHand, 1);
  assert.equal(cancelLedger.changeReserved, 0);
  assert.equal(cancelLedger.skuId, SKU_A);

  // Invariant 2: Stock on hand restored from 4 to 5
  assert.equal(balanceRecord.onHand, 5);
  assert.equal(balanceRecord.available, 5);
});

test('P3-INV-002: 6. Cancellation Double-Restoration Prevention: Repeated cancellation rejects and cannot restore stock twice', async (t) => {
  const ORDER_ID = randomUUID();

  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'CANCEL-ONCE-SKU',
    productId: PROD_A,
    onHand: 5, // Already restored
    reserved: 0,
    available: 5,
    version: 3,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  const cancelledOrder = {
    id: ORDER_ID,
    storeId: STORE_A,
    buyerId: BUYER_A,
    checkoutKey: 'placed-chk-key-2',
    salesChannel: 'marketplace',
    deliveryStatus: 'failed',
    fulfillmentStatus: 'failed',
    status: 'cancelled',
    stockDeducted: false, // Already false
    async update(fields) { Object.assign(this, fields); return this; },
  };

  const paymentRecord = {
    id: randomUUID(),
    orderId: ORDER_ID,
    paymentMethod: 'COD',
    status: 'pending',
    collectedAmount: '0.00',
  };

  t.mock.method(sequelize, 'transaction', async (fn) => fn(createMockTx()));
  t.mock.method(Order, 'findOne', async () => cancelledOrder);
  t.mock.method(Payment, 'findOne', async () => paymentRecord);
  t.mock.method(OrderEvent, 'findOne', async () => null);

  let ledgerEntriesCreated = 0;
  t.mock.method(InventoryLedgerEntry, 'create', async () => {
    ledgerEntriesCreated += 1;
  });

  // Attempting to cancel already cancelled order must fail with 409
  await assert.rejects(
    checkoutService.merchantAction({
      storeId: STORE_A,
      orderId: ORDER_ID,
      actorId: randomUUID(),
      eventKey: 'new-cancel-key',
      action: 'delivery_failed',
      details: { reason: 'Already cancelled', resolution: 'cancel' },
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Delivery cannot be failed/);
      return true;
    }
  );

  // Invariant: Zero stock restoration, balance remains unchanged at 5
  assert.equal(ledgerEntriesCreated, 0);
  assert.equal(balanceRecord.onHand, 5);
});

test('P3-INV-002: 7. Multi-Store Checkout (DEC-012, DEC-013): Creates isolated Store orders per store', async (t) => {
  const storeA = createMockStore(STORE_A);
  const storeB = createMockStore(STORE_B);
  const policyA = createMockPolicy(STORE_A, { flatFee: '3.00' });
  const policyB = createMockPolicy(STORE_B, { flatFee: '4.00' });

  const productA = {
    id: PROD_A, storeId: STORE_A, name: 'Item A', slug: 'item-a', price: '10.00',
    currency: 'USD', trackInventory: true, stockQuantity: 5, status: 'active',
    marketplaceCategory: 'Clothing', marketplaceVisibility: true, version: 1,
  };
  const productB = {
    id: PROD_B, storeId: STORE_B, name: 'Item B', slug: 'item-b', price: '20.00',
    currency: 'USD', trackInventory: true, stockQuantity: 5, status: 'active',
    marketplaceCategory: 'Clothing', marketplaceVisibility: true, version: 1,
  };

  const variantA = { id: SKU_A, productId: PROD_A, storeId: STORE_A, sku: 'SKU-A', price: '10.00', currency: 'USD', stockQuantity: 5, trackInventory: true, isDefault: true, status: 'active' };
  const variantB = { id: SKU_B, productId: PROD_B, storeId: STORE_B, sku: 'SKU-B', price: '20.00', currency: 'USD', stockQuantity: 5, trackInventory: true, isDefault: true, status: 'active' };

  const balanceA = { id: randomUUID(), storeId: STORE_A, skuId: SKU_A, sku: 'SKU-A', productId: PROD_A, onHand: 5, reserved: 0, available: 5, version: 1, async update(f) { Object.assign(this, f); return this; } };
  const balanceB = { id: randomUUID(), storeId: STORE_B, skuId: SKU_B, sku: 'SKU-B', productId: PROD_B, onHand: 5, reserved: 0, available: 5, version: 1, async update(f) { Object.assign(this, f); return this; } };

  t.mock.method(sequelize, 'transaction', async (fn) => fn(createMockTx()));

  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? storeA : (id === STORE_B ? storeB : null)));
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async (id) => (id === STORE_A ? policyA : (id === STORE_B ? policyB : null)));
  t.mock.method(Product, 'findByPk', async (id) => (id === PROD_A ? productA : (id === PROD_B ? productB : null)));
  t.mock.method(ProductVariant, 'findByPk', async (id) => (id === SKU_A ? variantA : (id === SKU_B ? variantB : null)));
  t.mock.method(ProductVariant, 'findOne', async (opt) => (opt.where.productId === PROD_A ? variantA : variantB));

  t.mock.method(Cart, 'findOne', async (opt) => ({
    id: `cart-${opt.where.storeId}`,
    buyerId: BUYER_A,
    storeId: opt.where.storeId,
    websiteId: null,
  }));

  t.mock.method(CartItem, 'findAll', async (opt) => {
    if (opt.where.cartId === `cart-${STORE_A}`) {
      return [{ id: 'ci-a', cartId: `cart-${STORE_A}`, productId: PROD_A, variantId: SKU_A, quantity: 1 }];
    }
    return [{ id: 'ci-b', cartId: `cart-${STORE_B}`, productId: PROD_B, variantId: SKU_B, quantity: 1 }];
  });
  t.mock.method(CartItem, 'destroy', async () => 1);
  t.mock.method(Cart, 'destroy', async () => 1);

  t.mock.method(InventoryBalance, 'findOne', async (opt) => (opt.where.storeId === STORE_A ? balanceA : balanceB));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => data);

  const reservations = [];
  t.mock.method(InventoryReservation, 'create', async (data) => {
    const res = { ...data, async update(f) { Object.assign(this, f); return this; } };
    reservations.push(res);
    return res;
  });
  t.mock.method(InventoryReservation, 'findByPk', async (id) => reservations.find((r) => r.id === id) || null);

  const createdOrders = [];
  t.mock.method(Order, 'findOne', async () => null);
  t.mock.method(Order, 'create', async (data) => {
    const ord = { id: randomUUID(), ...data, async update(f) { Object.assign(this, f); return this; } };
    createdOrders.push(ord);
    return ord;
  });
  t.mock.method(OrderItem, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(OrderItem, 'findAll', async () => [
    { id: 'item-comp-a', productId: PROD_A, variantId: SKU_A, quantity: 1, price: '10.00' },
  ]);
  t.mock.method(Payment, 'create', async (data) => ({ id: randomUUID(), ...data }));

  const multiResult = await checkoutService.checkoutMultiStore({
    buyerId: BUYER_A,
    checkoutKey: 'multi-store-chk-1',
    customerInfo: { name: 'Multi Buyer', phone: '+85512345678' },
    shippingInfo: { address: 'Phnom Penh Multi Address' },
    storeOrders: [
      { storeId: STORE_A, expectedTotalAmount: '13.00' }, // $10 item + $3 delivery
      { storeId: STORE_B, expectedTotalAmount: '24.00' }, // $20 item + $4 delivery
    ],
  });

  assert.equal(multiResult.successfulOrders.length, 2, 'Must create 2 independent Store orders');
  assert.equal(multiResult.failedOrders.length, 0);

  // Invariant: Orders belong strictly to their respective stores (DEC-013)
  assert.equal(multiResult.successfulOrders[0].storeId, STORE_A);
  assert.equal(multiResult.successfulOrders[0].deliveryFee, '3.00');
  assert.equal(multiResult.successfulOrders[0].totalAmount, '13.00');

  assert.equal(multiResult.successfulOrders[1].storeId, STORE_B);
  assert.equal(multiResult.successfulOrders[1].deliveryFee, '4.00');
  assert.equal(multiResult.successfulOrders[1].totalAmount, '24.00');

  // Both inventory balances mutated independently
  assert.equal(balanceA.onHand, 4);
  assert.equal(balanceB.onHand, 4);
});

test('P3-INV-002: 8. Multi-Store Atomicity Policy: Independent isolation vs Atomic compensation rollback on Store failure', async (t) => {
  const storeA = createMockStore(STORE_A);
  const storeB = createMockStore(STORE_B);
  const policyA = createMockPolicy(STORE_A, { flatFee: '3.00' });
  const policyB = createMockPolicy(STORE_B, { flatFee: '4.00' });

  const productA = {
    id: PROD_A, storeId: STORE_A, name: 'Item A', slug: 'item-a', price: '10.00',
    currency: 'USD', trackInventory: true, stockQuantity: 5, status: 'active',
    marketplaceCategory: 'Clothing', marketplaceVisibility: true, version: 1,
  };
  const productB = {
    id: PROD_B, storeId: STORE_B, name: 'Item B Out of Stock', slug: 'item-b', price: '20.00',
    currency: 'USD', trackInventory: true, stockQuantity: 0, status: 'active',
    marketplaceCategory: 'Clothing', marketplaceVisibility: true, version: 1,
  };

  const variantA = { id: SKU_A, productId: PROD_A, storeId: STORE_A, sku: 'SKU-A', price: '10.00', currency: 'USD', stockQuantity: 5, trackInventory: true, isDefault: true, status: 'active' };
  const variantB = { id: SKU_B, productId: PROD_B, storeId: STORE_B, sku: 'SKU-B', price: '20.00', currency: 'USD', stockQuantity: 0, trackInventory: true, isDefault: true, status: 'active' };

  const balanceA = { id: randomUUID(), storeId: STORE_A, skuId: SKU_A, sku: 'SKU-A', productId: PROD_A, onHand: 5, reserved: 0, available: 5, version: 1, async update(f) { Object.assign(this, f); return this; } };
  const balanceB = { id: randomUUID(), storeId: STORE_B, skuId: SKU_B, sku: 'SKU-B', productId: PROD_B, onHand: 0, reserved: 0, available: 0, version: 1, async update(f) { Object.assign(this, f); return this; } };

  t.mock.method(sequelize, 'transaction', async (fn) => fn(createMockTx()));

  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? storeA : (id === STORE_B ? storeB : null)));
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async (id) => (id === STORE_A ? policyA : (id === STORE_B ? policyB : null)));
  t.mock.method(Product, 'findByPk', async (id) => (id === PROD_A ? productA : (id === PROD_B ? productB : null)));
  t.mock.method(ProductVariant, 'findByPk', async (id) => (id === SKU_A ? variantA : (id === SKU_B ? variantB : null)));
  t.mock.method(ProductVariant, 'findOne', async (opt) => (opt.where.productId === PROD_A ? variantA : variantB));

  t.mock.method(Cart, 'findOne', async (opt) => ({
    id: `cart-${opt.where.storeId}`,
    buyerId: BUYER_A,
    storeId: opt.where.storeId,
    websiteId: null,
  }));

  t.mock.method(CartItem, 'findAll', async (opt) => {
    if (opt.where.cartId === `cart-${STORE_A}`) {
      return [{ id: 'ci-a', cartId: `cart-${STORE_A}`, productId: PROD_A, variantId: SKU_A, quantity: 1 }];
    }
    return [{ id: 'ci-b', cartId: `cart-${STORE_B}`, productId: PROD_B, variantId: SKU_B, quantity: 1 }];
  });
  t.mock.method(CartItem, 'destroy', async () => 1);
  t.mock.method(Cart, 'destroy', async () => 1);

  t.mock.method(InventoryBalance, 'findOne', async (opt) => (opt.where.storeId === STORE_A ? balanceA : balanceB));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => data);

  const reservations = [];
  t.mock.method(InventoryReservation, 'create', async (data) => {
    const res = { ...data, async update(f) { Object.assign(this, f); return this; } };
    reservations.push(res);
    return res;
  });
  t.mock.method(InventoryReservation, 'findByPk', async (id) => reservations.find((r) => r.id === id) || null);

  const createdOrders = [];
  t.mock.method(Order, 'findOne', async (opt) => {
    if (opt?.where?.id) {
      return createdOrders.find((o) => o.id === opt.where.id) || null;
    }
    return null;
  });
  t.mock.method(Order, 'create', async (data) => {
    const ord = { id: randomUUID(), ...data, async update(f) { Object.assign(this, f); return this; } };
    createdOrders.push(ord);
    return ord;
  });
  t.mock.method(OrderItem, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(OrderItem, 'findAll', async () => [
    { id: 'item-comp-a', productId: PROD_A, variantId: SKU_A, quantity: 1, price: '10.00' },
  ]);
  t.mock.method(Payment, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(Payment, 'findOne', async (opt) => ({
    id: randomUUID(),
    orderId: opt?.where?.orderId,
    paymentMethod: 'COD',
    status: 'pending',
    amount: '13.00',
    collectedAmount: '0.00',
    refundedAmount: '0.00',
    async update(f) { Object.assign(this, f); return this; },
  }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(OrderEvent, 'create', async (data) => data);

  // Part A: Independent mode (default) - Store A succeeds, Store B fails
  const independentResult = await checkoutService.checkoutMultiStore({
    buyerId: BUYER_A,
    checkoutKey: 'multi-partial-chk-1',
    customerInfo: { name: 'Buyer', phone: '+85512345678' },
    shippingInfo: { address: 'Address' },
    atomic: false,
    storeOrders: [
      { storeId: STORE_A, expectedTotalAmount: '13.00' },
      { storeId: STORE_B, expectedTotalAmount: '24.00' },
    ],
  });

  assert.equal(independentResult.successfulOrders.length, 1);
  assert.equal(independentResult.successfulOrders[0].storeId, STORE_A);
  assert.equal(independentResult.failedOrders.length, 1);
  assert.equal(independentResult.failedOrders[0].storeId, STORE_B);
  assert.match(independentResult.failedOrders[0].error, /Insufficient stock/);
  assert.equal(balanceA.onHand, 4, 'Store A stock was successfully committed');
  assert.equal(balanceB.onHand, 0, 'Store B stock was not modified');

  // Part B: Atomic mode - If Store B fails, whole multi-store checkout fails with compensation
  balanceA.onHand = 5;
  balanceA.available = 5;

  await assert.rejects(
    checkoutService.checkoutMultiStore({
      buyerId: BUYER_A,
      checkoutKey: 'multi-atomic-chk-2',
      customerInfo: { name: 'Buyer', phone: '+85512345678' },
      shippingInfo: { address: 'Address' },
      atomic: true,
      storeOrders: [
        { storeId: STORE_A, expectedTotalAmount: '13.00' },
        { storeId: STORE_B, expectedTotalAmount: '24.00' },
      ],
    }),
    (err) => {
      assert.match(err.message, /Multi-store checkout failed for Store/);
      return true;
    }
  );

  // Invariant: Compensated stock was returned to Store A balance
  assert.equal(balanceA.onHand, 5, 'Compensated stock returned to balance');
});

test('P3-INV-002: 9. Static Enforcement: scripts/quality/check-no-direct-stock-writes.js passes with 0 violations', () => {
  const scriptPath = path.resolve(__dirname, '../../scripts/quality/check-no-direct-stock-writes.js');
  const targetDir = path.resolve(__dirname, '../../modules/checkout');

  const output = execFileSync('node', [scriptPath, targetDir], { encoding: 'utf8' });
  assert.match(output, /Static enforcement passed/);
  assert.match(output, /Zero direct stock writes detected/);
});
