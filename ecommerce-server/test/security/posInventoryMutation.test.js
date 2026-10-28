'use strict';

// test/security/posInventoryMutation.test.js
// Verification suite for P3-INV-002 Slice 4: Point-of-sale stock mutations.
// Verifies:
// 1. POS sales use canonical SKU inventory.
// 2. Store and staff authorization comes from Phase 2 policy.
// 3. Sale deduction occurs exactly once.
// 4. Voids and approved cancellations compensate exactly once.
// 5. Offline/manual KHQR recording must not duplicate stock effects.
// 6. Barcode lookup resolves within Store scope.
// 7. Last-unit conflict is deterministic (no negative balance).
// 8. Retried receipt creation cannot duplicate deduction.
// 9. POS and online checkout contend against the same balance.
// 10. Remove direct stock mutation from POS controllers/models (static enforcement).

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

const {
  inventoryLedgerService,
  InsufficientStockError,
} = require('../../modules/inventory');

const {
  createPOSOrder,
  lookupPOSBarcode,
  voidPOSOrder,
  recordManualKHQR,
} = require('../../modules/orders/OrderController');

const {
  cancelOrder,
  ORDER_STATES,
} = require('../../modules/orders/orderStateMachineService');

const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');

const {
  Product,
  ProductVariant,
  StoreAccess,
  WebsiteData,
  Order,
  OrderItem,
  Payment,
  Invoice,
  PaymentGatewayConfig,
  Customer,
} = require('../../models');

ProductVariant.update = async () => [1];
Product.update = async () => [1];

// Fixtures
const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const OWNER_A = '33333333-3333-4333-8333-333333333333';
const OWNER_B = '44444444-4444-4444-8444-444444444444';

const PROD_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SKU_A = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BARCODE_A = '8850123456789';

const PROD_B = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SKU_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const BARCODE_B = '8850987654321';

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

function mockTxSupport(t, mockTx) {
  t.mock.method(sequelize, 'transaction', async (fn) => {
    if (typeof fn === 'function') {
      return await fn(mockTx);
    }
    return mockTx;
  });
}

function responseHelper() {
  return {
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
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
  };
}

test('P3-INV-002: 1. POS cash sale deducts canonical SKU inventory with pos_sale and pos_order sourceType', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const store = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const variant = { id: SKU_A, storeId: STORE_A, productId: PROD_A, sku: 'SILK-RED', barcode: BARCODE_A, price: '15.00', currency: 'USD', status: 'active', stockQuantity: 50 };
  const product = { id: PROD_A, storeId: STORE_A, name: 'Silk Scarf', price: '15.00', currency: 'USD', status: 'active', defaultSkuId: SKU_A, version: 1, ProductVariants: [variant] };

  let onHand = 10;
  const recordedMutations = [];

  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(Product, 'findByPk', async () => product);
  t.mock.method(ProductVariant, 'findByPk', async () => variant);
  t.mock.method(ProductVariant, 'findOne', async () => variant);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Customer, 'findOne', async () => null);
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => ({ onHand, reserved: 0, available: onHand }));
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    recordedMutations.push(params);
    onHand += params.changeOnHand;
    return {
      balance: { onHand, reserved: 0, available: onHand },
      ledgerEntry: { id: randomUUID(), ...params },
    };
  });

  const createdOrders = [];
  t.mock.method(Order, 'create', async (data) => {
    const o = {
      id: randomUUID(),
      ...data,
      async update(up) { Object.assign(this, up); return this; },
      toJSON() { return { ...this }; },
    };
    createdOrders.push(o);
    return o;
  });
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, toJSON: () => data }));

  const req = {
    params: { storeId: STORE_A },
    body: {
      items: [{ productId: PROD_A, variantId: SKU_A, quantity: 2, price: '15.00' }],
      paymentMethod: 'cash',
      currency: 'USD',
    },
    user: { id: 'staff-cashier-1', type: 'staff', permissions: ['pos'] },
    headers: {},
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.order.status, 'completed');
  assert.equal(res.body.order.stockDeducted, true);
  assert.equal(res.body.order.salesChannel, 'pos');
  assert.equal(res.body.order.cashierId, 'staff-cashier-1');

  // Verify canonical ledger mutation
  assert.equal(recordedMutations.length, 1);
  assert.equal(recordedMutations[0].storeId, STORE_A);
  assert.equal(recordedMutations[0].skuId, SKU_A);
  assert.equal(recordedMutations[0].changeOnHand, -2);
  assert.equal(recordedMutations[0].changeReserved, 0);
  assert.equal(recordedMutations[0].reasonCode, 'pos_sale');
  assert.equal(recordedMutations[0].sourceType, 'pos_order');
  assert.match(recordedMutations[0].idempotencyKey, /^pos-deduct-/);
  assert.equal(onHand, 8);
});

test('P3-INV-002: 2. POS card sale deducts canonical SKU inventory immediately', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const store = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const variant = { id: SKU_A, storeId: STORE_A, productId: PROD_A, sku: 'SILK-RED', barcode: BARCODE_A, price: '20.00', currency: 'USD', status: 'active', stockQuantity: 50 };
  const product = { id: PROD_A, storeId: STORE_A, name: 'Silk Scarf', price: '20.00', currency: 'USD', status: 'active', defaultSkuId: SKU_A, version: 1, ProductVariants: [variant] };

  let onHand = 5;
  const recordedMutations = [];

  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(Product, 'findByPk', async () => product);
  t.mock.method(ProductVariant, 'findByPk', async () => variant);
  t.mock.method(ProductVariant, 'findOne', async () => variant);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Customer, 'findOne', async () => null);
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => ({ onHand, reserved: 0, available: onHand }));
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    recordedMutations.push(params);
    onHand += params.changeOnHand;
    return { balance: { onHand, reserved: 0, available: onHand } };
  });

  t.mock.method(Order, 'create', async (data) => ({
    id: randomUUID(),
    ...data,
    async update(up) { Object.assign(this, up); return this; },
    toJSON() { return { ...this }; },
  }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, toJSON: () => data }));

  const req = {
    params: { storeId: STORE_A },
    body: {
      items: [{ productId: PROD_A, variantId: SKU_A, quantity: 1, price: '20.00' }],
      paymentMethod: 'card',
      currency: 'USD',
    },
    user: { id: OWNER_A, type: 'user', role: 'merchant' },
    headers: {},
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.order.status, 'completed');
  assert.equal(res.body.order.stockDeducted, true);
  assert.equal(recordedMutations.length, 1);
  assert.equal(recordedMutations[0].changeOnHand, -1);
  assert.equal(recordedMutations[0].reasonCode, 'pos_sale');
  assert.equal(onHand, 4);
});

test('P3-INV-002: 3. Counter KHQR fallback records KHQR_COUNTER and deducts stock exactly once', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const store = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const variant = { id: SKU_A, storeId: STORE_A, productId: PROD_A, sku: 'SILK-RED', barcode: BARCODE_A, price: '10.00', currency: 'USD', status: 'active', stockQuantity: 50 };
  const product = { id: PROD_A, storeId: STORE_A, name: 'Silk Scarf', price: '10.00', currency: 'USD', status: 'active', defaultSkuId: SKU_A, version: 1, ProductVariants: [variant] };

  let onHand = 8;
  const recordedMutations = [];

  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(Product, 'findByPk', async () => product);
  t.mock.method(ProductVariant, 'findByPk', async () => variant);
  t.mock.method(ProductVariant, 'findOne', async () => variant);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Customer, 'findOne', async () => null);
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => ({ onHand, reserved: 0, available: onHand }));
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    recordedMutations.push(params);
    onHand += params.changeOnHand;
    return { balance: { onHand, reserved: 0, available: onHand } };
  });

  t.mock.method(Order, 'create', async (data) => ({
    id: randomUUID(),
    ...data,
    async update(up) { Object.assign(this, up); return this; },
    toJSON() { return { ...this }; },
  }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, toJSON: () => data }));

  const req = {
    params: { storeId: STORE_A },
    body: {
      items: [{ productId: PROD_A, variantId: SKU_A, quantity: 3, price: '10.00' }],
      paymentMethod: 'khqr',
      currency: 'USD',
    },
    user: { id: 'staff-cashier-2', type: 'staff', permissions: ['pos'] },
    headers: {},
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.order.status, 'completed');
  assert.equal(res.body.order.stockDeducted, true);
  assert.equal(res.body.payment.transactionData.posData.method, 'KHQR_COUNTER');
  assert.equal(recordedMutations.length, 1, 'Stock must be deducted exactly once during counter KHQR fallback');
  assert.equal(recordedMutations[0].changeOnHand, -3);
  assert.equal(onHand, 5);
});

test('P3-INV-002: 4. Store and staff authorization: Staff with pos permission allowed; unpermitted/suspended rejected with 403', async (t) => {
  const storeA = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const middleware = createRequireStoreAccess({
    findStore: async (id) => (id === STORE_A ? storeA : null),
    permissions: ['pos', 'manage_pos'],
  });

  // 1. Staff with pos permission -> allowed
  {
    const req = {
      params: { storeId: STORE_A },
      user: { id: 'staff-1', type: 'staff', merchantId: OWNER_A, permissions: ['pos'] },
    };
    const res = responseHelper();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }

  // 2. Staff without pos permission (e.g. only products) -> rejected 403
  {
    const req = {
      params: { storeId: STORE_A },
      user: { id: 'staff-2', type: 'staff', merchantId: OWNER_A, permissions: ['products'] },
    };
    const res = responseHelper();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Store access denied/);
  }

  // 3. Unrelated merchant (Owner B on Store A) -> rejected 403
  {
    const req = {
      params: { storeId: STORE_A },
      user: { id: OWNER_B, type: 'user', role: 'merchant' },
    };
    const res = responseHelper();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  }

  // 4. Suspended merchant -> rejected 403
  {
    const req = {
      params: { storeId: STORE_A },
      user: { id: OWNER_A, type: 'user', role: 'merchant', status: 'suspended' },
    };
    const res = responseHelper();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Account is suspended/);
  }

  // 5. Unauthenticated user -> rejected 401
  {
    const req = {
      params: { storeId: STORE_A },
      user: null,
    };
    const res = responseHelper();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
  }
});

test('P3-INV-002: 5. Store-scoped barcode lookup resolves Product, SKU, and available stock within Store', async (t) => {
  const product = { id: PROD_A, storeId: STORE_A, name: 'Silk Scarf', price: '15.00', currency: 'USD', status: 'active', defaultSkuId: SKU_A, barcode: BARCODE_A };
  const variant = {
    id: SKU_A,
    storeId: STORE_A,
    productId: PROD_A,
    sku: 'SILK-RED',
    barcode: BARCODE_A,
    price: '15.00',
    title: 'Red',
    optionValues: { color: 'Red' },
    Product: product,
  };

  t.mock.method(ProductVariant, 'findOne', async (options) => {
    if (options?.where?.storeId === STORE_A && options?.where?.barcode === BARCODE_A) {
      return variant;
    }
    return null;
  });
  t.mock.method(inventoryLedgerService, 'getBalance', async (storeId, skuId) => {
    assert.equal(storeId, STORE_A);
    assert.equal(skuId, SKU_A);
    return { onHand: 14, reserved: 2, available: 12 };
  });

  const req = {
    params: { storeId: STORE_A },
    query: { barcode: BARCODE_A },
  };
  const res = responseHelper();

  await lookupPOSBarcode(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.product.id, PROD_A);
  assert.equal(res.body.variant.id, SKU_A);
  assert.equal(res.body.skuId, SKU_A);
  assert.equal(res.body.variant.barcode, BARCODE_A);
  assert.equal(res.body.stockOnHand, 14);
  assert.equal(res.body.stockAvailable, 12);
});

test('P3-INV-002: 6. Barcode lookup cross-store isolation: Querying Store A with Store B barcode returns 404', async (t) => {
  t.mock.method(ProductVariant, 'findOne', async (options) => {
    // Only matches when storeId is STORE_B
    if (options?.where?.storeId === STORE_B && options?.where?.barcode === BARCODE_B) {
      return { id: SKU_B, storeId: STORE_B, barcode: BARCODE_B };
    }
    return null;
  });
  t.mock.method(Product, 'findOne', async () => null);

  const req = {
    params: { storeId: STORE_A },
    query: { barcode: BARCODE_B },
  };
  const res = responseHelper();

  await lookupPOSBarcode(req, res);

  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /not found in this store/i);
});

test('P3-INV-002: 7. Barcode-only item in POS order creation resolves within store and deducts canonical stock', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const store = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const variant = {
    id: SKU_A,
    storeId: STORE_A,
    productId: PROD_A,
    sku: 'SILK-RED',
    barcode: BARCODE_A,
    price: '18.00',
    currency: 'USD',
    status: 'active',
    stockQuantity: 50,
  };
  const product = {
    id: PROD_A,
    storeId: STORE_A,
    name: 'Silk Scarf',
    price: '18.00',
    currency: 'USD',
    status: 'active',
    defaultSkuId: SKU_A,
    version: 1,
    ProductVariants: [variant],
  };
  variant.Product = product;

  let onHand = 10;
  const recordedMutations = [];

  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(Product, 'findByPk', async () => product);
  t.mock.method(ProductVariant, 'findByPk', async () => variant);
  t.mock.method(ProductVariant, 'findOne', async (options) => {
    if (options?.where?.barcode === BARCODE_A) return variant;
    return null;
  });
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Customer, 'findOne', async () => null);
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => ({ onHand, reserved: 0, available: onHand }));
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    recordedMutations.push(params);
    onHand += params.changeOnHand;
    return { balance: { onHand, reserved: 0, available: onHand } };
  });

  t.mock.method(Order, 'create', async (data) => ({
    id: randomUUID(),
    ...data,
    async update(up) { Object.assign(this, up); return this; },
    toJSON() { return { ...this }; },
  }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, toJSON: () => data }));

  // Cashier passes only { barcode, quantity }
  const req = {
    params: { storeId: STORE_A },
    body: {
      items: [{ barcode: BARCODE_A, quantity: 2 }],
      paymentMethod: 'cash',
      currency: 'USD',
    },
    user: { id: 'cashier-scan-1', type: 'staff', permissions: ['pos'] },
    headers: {},
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.order.status, 'completed');
  assert.equal(recordedMutations.length, 1);
  assert.equal(recordedMutations[0].skuId, SKU_A);
  assert.equal(recordedMutations[0].changeOnHand, -2);
  assert.equal(onHand, 8);
});

test('P3-INV-002: 8. Cross-Store barcode in order creation is rejected with 404/400 and zero stock mutation', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const store = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(ProductVariant, 'findOne', async (options) => {
    // Only exists in Store B
    if (options?.where?.storeId === STORE_B && options?.where?.barcode === BARCODE_B) {
      return { id: SKU_B, storeId: STORE_B, barcode: BARCODE_B };
    }
    return null;
  });
  t.mock.method(Product, 'findOne', async () => null);

  let mutationsCalled = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutationsCalled = true;
  });

  const req = {
    params: { storeId: STORE_A },
    body: {
      items: [{ barcode: BARCODE_B, quantity: 1 }],
      paymentMethod: 'cash',
    },
    user: { id: 'staff-1', type: 'staff', permissions: ['pos'] },
    headers: {},
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /not found in this store/i);
  assert.equal(mutationsCalled, false, 'No inventory mutation may occur on rejected barcode');
});

test('P3-INV-002: 9. Retried receipt creation is idempotent: duplicate Idempotency-Key returns existing order without re-deducting', async (t) => {
  const store = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const RECEIPT_KEY = 'receipt-terminal-101-tx999';

  const existingOrder = {
    id: 'ord-pos-existing-1',
    storeId: STORE_A,
    checkoutKey: RECEIPT_KEY,
    status: 'completed',
    stockDeducted: true,
    totalAmount: '30.00',
    currency: 'USD',
    toJSON() { return { ...this }; },
  };
  const existingPayment = { id: 'pay-pos-1', orderId: existingOrder.id, status: 'completed', toJSON() { return { ...this }; } };
  const existingInvoice = { id: 'inv-pos-1', orderId: existingOrder.id, invoiceNumber: 'POS-INV-101', toJSON() { return { ...this }; } };

  t.mock.method(StoreAccess, 'findByPk', async () => store);
  t.mock.method(Order, 'findOne', async (options) => {
    if (options?.where?.checkoutKey === RECEIPT_KEY && options?.where?.storeId === STORE_A) {
      return existingOrder;
    }
    return null;
  });
  t.mock.method(Payment, 'findOne', async () => existingPayment);
  t.mock.method(Invoice, 'findOne', async () => existingInvoice);

  let mutationAttempted = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutationAttempted = true;
  });

  const req = {
    params: { storeId: STORE_A },
    headers: { 'idempotency-key': RECEIPT_KEY },
    body: {
      items: [{ productId: PROD_A, variantId: SKU_A, quantity: 2, price: '15.00' }],
      paymentMethod: 'cash',
    },
    user: { id: 'staff-1', type: 'staff', permissions: ['pos'] },
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.idempotentReplay, true);
  assert.equal(res.body.order.id, existingOrder.id);
  assert.equal(mutationAttempted, false, 'Idempotent replay must not mutate inventory again');
});

test('P3-INV-002: 10. Manual KHQR recording is idempotent: calling manual-khqr on already-deducted order does not double deduct', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const orderId = 'pos-ord-khqr-pending-1';
  const orderRecord = {
    id: orderId,
    storeId: STORE_A,
    status: 'completed',
    stockDeducted: true, // Already deducted!
    OrderItems: [{ id: 'item-1', productId: PROD_A, variantId: SKU_A, quantity: 2 }],
    async update(fields) { Object.assign(this, fields); return this; },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Order, 'findOne', async () => orderRecord);
  t.mock.method(Order, 'findByPk', async () => orderRecord);
  t.mock.method(Payment, 'findOne', async () => null);
  t.mock.method(Payment, 'create', async () => ({ toJSON: () => ({ status: 'completed' }) }));

  let stockMutationCount = 0;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    stockMutationCount += 1;
  });

  const req = {
    params: { storeId: STORE_A, orderId },
    headers: { 'idempotency-key': 'manual-khqr-retry-key' },
    user: { id: 'staff-cashier-1', type: 'staff' },
  };
  const res = responseHelper();

  await recordManualKHQR(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(stockMutationCount, 0, 'No stock mutation may happen when order.stockDeducted is already true');
});

test('P3-INV-002: 11. POS void restores deducted stock exactly once via cancellation and pos_order sourceType', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const orderId = 'pos-ord-completed-void-1';
  let onHand = 3;
  const recordedMutations = [];

  const orderRecord = {
    id: orderId,
    storeId: STORE_A,
    status: 'completed',
    deliveryStatus: 'delivered',
    stockDeducted: true,
    OrderItems: [
      { id: 'item-1', productId: PROD_A, variantId: SKU_A, quantity: 2 },
    ],
    async update(fields) { Object.assign(this, fields); return this; },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Order, 'findOne', async () => orderRecord);
  t.mock.method(Order, 'findByPk', async () => orderRecord);
  t.mock.method(ProductVariant, 'findByPk', async () => ({ id: SKU_A, storeId: STORE_A }));
  t.mock.method(Payment, 'update', async () => [1]);
  t.mock.method(Invoice, 'update', async () => [1]);

  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    recordedMutations.push(params);
    onHand += params.changeOnHand;
    return { balance: { onHand, reserved: 0, available: onHand } };
  });

  const req = {
    params: { storeId: STORE_A, orderId },
    body: { reason: 'Customer changed mind at register' },
    headers: { 'idempotency-key': 'void-req-101' },
    user: { id: 'staff-cashier-1', type: 'staff' },
  };
  const res = responseHelper();

  await voidPOSOrder(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(orderRecord.status, 'cancelled');
  assert.equal(orderRecord.stockDeducted, false);

  assert.equal(recordedMutations.length, 1);
  assert.equal(recordedMutations[0].skuId, SKU_A);
  assert.equal(recordedMutations[0].changeOnHand, 2, 'Restored stock quantity on void');
  assert.equal(recordedMutations[0].changeReserved, 0);
  assert.equal(recordedMutations[0].reasonCode, 'cancellation');
  assert.equal(recordedMutations[0].sourceType, 'pos_order');
  assert.equal(onHand, 5);
});

test('P3-INV-002: 12. Retrying POS void is an idempotent no-op and does not restore stock twice', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const orderId = 'pos-ord-already-voided';
  const orderRecord = {
    id: orderId,
    storeId: STORE_A,
    status: 'cancelled', // Already cancelled!
    deliveryStatus: 'cancelled',
    stockDeducted: false,
    toJSON() { return { ...this }; },
  };

  t.mock.method(Order, 'findOne', async () => orderRecord);

  let mutationAttempted = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutationAttempted = true;
  });

  const req = {
    params: { storeId: STORE_A, orderId },
    headers: { 'idempotency-key': 'void-retry-999' },
    user: { id: 'staff-1', type: 'staff' },
  };
  const res = responseHelper();

  await voidPOSOrder(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.alreadyVoided, true);
  assert.equal(mutationAttempted, false, 'No stock compensation on duplicate void');
});

test('P3-INV-002: 13. Deterministic last-unit concurrency: POS sale and Marketplace checkout compete for 1 unit; exactly 1 winner, no negative balance', async (t) => {
  const mockStore = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const mockVariant = { id: SKU_A, storeId: STORE_A, productId: PROD_A, sku: 'EXCL-SILK', barcode: BARCODE_A, price: '50.00', currency: 'USD', status: 'active', stockQuantity: 1 };
  const mockProduct = { id: PROD_A, storeId: STORE_A, name: 'Exclusive Silk Scarf', price: '50.00', currency: 'USD', status: 'active', defaultSkuId: SKU_A, version: 1, ProductVariants: [mockVariant] };

  // Shared state: exactly 1 unit available
  const balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'EXCL-SILK',
    productId: PROD_A,
    onHand: 1,
    reserved: 0,
    available: 1,
    version: 1,
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
      const mockTx = createMockTx();
      if (typeof fn === 'function') {
        return await fn(mockTx);
      }
      return mockTx;
    } finally {
      releaseRowLock();
    }
  });

  t.mock.method(StoreAccess, 'findByPk', async () => mockStore);
  t.mock.method(Product, 'findByPk', async () => mockProduct);
  t.mock.method(ProductVariant, 'findByPk', async () => mockVariant);
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Customer, 'findOne', async () => null);
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => balanceRecord);

  // Authoritative balance mutation logic respecting lock
  t.mock.method(inventoryLedgerService, 'mutateBalance', async ({ changeOnHand, changeReserved }) => {
    const newOnHand = balanceRecord.onHand + changeOnHand;
    const newReserved = balanceRecord.reserved + changeReserved;
    const newAvailable = newOnHand - newReserved;

    if (newOnHand < 0 || newReserved > newOnHand || newAvailable < 0) {
      const err = new InsufficientStockError(`Insufficient stock: requested change ${changeOnHand}, available was ${balanceRecord.available}`);
      err.statusCode = 409;
      throw err;
    }

    balanceRecord.onHand = newOnHand;
    balanceRecord.reserved = newReserved;
    balanceRecord.available = newAvailable;
    return { balance: { ...balanceRecord } };
  });

  // Authoritative stock reservation logic (used by marketplace checkout)
  t.mock.method(inventoryLedgerService, 'createReservation', async ({ quantity }) => {
    if (balanceRecord.available < quantity) {
      const err = new InsufficientStockError(`Insufficient available stock: requested ${quantity}, available was ${balanceRecord.available}`);
      err.statusCode = 409;
      throw err;
    }
    balanceRecord.reserved += quantity;
    balanceRecord.available = balanceRecord.onHand - balanceRecord.reserved;
    return { reservation: { id: randomUUID(), quantity }, balance: { ...balanceRecord } };
  });

  t.mock.method(Order, 'create', async (data) => ({
    id: randomUUID(),
    ...data,
    async update(up) { Object.assign(this, up); return this; },
    toJSON() { return { ...this }; },
  }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, toJSON: () => data }));

  // Simulate concurrent execution: POS Sale vs Online Marketplace Reservation
  const posReq = {
    params: { storeId: STORE_A },
    body: { items: [{ productId: PROD_A, variantId: SKU_A, quantity: 1, price: '50.00' }], paymentMethod: 'cash' },
    user: { id: 'pos-cashier', type: 'staff', permissions: ['pos'] },
    headers: {},
  };
  const posRes = responseHelper();

  const posPromise = createPOSOrder(posReq, posRes).then(() => ({ channel: 'pos', status: posRes.statusCode, error: posRes.body?.error }));
  const onlinePromise = inventoryLedgerService.createReservation({
    storeId: STORE_A,
    skuId: SKU_A,
    quantity: 1,
    checkoutKey: 'online-concurrent-key',
  })
    .then(() => ({ channel: 'online', status: 200, error: null }))
    .catch((err) => ({ channel: 'online', status: err.statusCode || 409, error: err.message }));

  const results = await Promise.all([posPromise, onlinePromise]);

  const winner = results.find((r) => r.status === 200 || r.status === 201);
  const loser = results.find((r) => r.status === 409);

  assert.ok(winner, 'Exactly one concurrent attempt must win');
  assert.ok(loser, 'Exactly one concurrent attempt must lose with 409 conflict');
  assert.equal(balanceRecord.onHand >= 0, true, 'Balance on hand must never be negative');
  assert.equal(balanceRecord.available, 0, 'No remaining available stock');
});

test('P3-INV-002: 14. Cross-Store productId in POS order creation is rejected with 403 and zero stock mutation', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const storeA = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  // Product belongs to Store B
  const foreignProduct = { id: PROD_B, storeId: STORE_B, name: 'Foreign Product', price: '25.00', currency: 'USD', status: 'active', defaultSkuId: SKU_B };

  t.mock.method(StoreAccess, 'findByPk', async () => storeA);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Product, 'findByPk', async () => foreignProduct);

  let mutationAttempted = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutationAttempted = true;
  });

  const req = {
    params: { storeId: STORE_A },
    body: {
      items: [{ productId: PROD_B, quantity: 1, price: '25.00' }],
      paymentMethod: 'cash',
    },
    user: { id: 'staff-1', type: 'staff', permissions: ['pos'] },
    headers: {},
  };
  const res = responseHelper();

  await createPOSOrder(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /does not belong to store/i);
  assert.equal(mutationAttempted, false, 'No inventory mutation may occur on foreign product');
});

test('P3-INV-002: 15. orderStateMachineService.cancelOrder voids completed POS sale and restores stock with pos_order sourceType', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const orderId = 'pos-ord-completed-sm-void';
  let onHand = 2;
  const recordedMutations = [];

  const posOrder = {
    id: orderId,
    storeId: STORE_A,
    salesChannel: 'pos',
    orderType: 'pos',
    status: 'completed',
    fulfillmentStatus: 'delivered',
    stockDeducted: true,
    OrderItems: [
      { id: 'item-sm-1', productId: PROD_A, variantId: SKU_A, quantity: 2 },
    ],
    async update(fields) { Object.assign(this, fields); return this; },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Order, 'findByPk', async () => posOrder);
  t.mock.method(ProductVariant, 'findByPk', async () => ({ id: SKU_A, storeId: STORE_A }));
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    recordedMutations.push(params);
    onHand += params.changeOnHand;
    return { balance: { onHand, reserved: 0, available: onHand } };
  });

  const actor = { id: OWNER_A, role: 'merchant' };
  const result = await cancelOrder(orderId, {
    actor,
    reason: 'Register cashier void via state machine',
    idempotencyKey: 'sm-void-pos-101',
  });

  assert.equal(result.order.status, 'cancelled');
  assert.equal(posOrder.status, 'cancelled');
  assert.equal(posOrder.stockDeducted, false);
  assert.equal(recordedMutations.length, 1);
  assert.equal(recordedMutations[0].changeOnHand, 2);
  assert.equal(recordedMutations[0].reasonCode, 'cancellation');
  assert.equal(recordedMutations[0].sourceType, 'pos_order');
  assert.equal(onHand, 4);

  // Duplicate cancel attempt must fail with ORDER_ALREADY_CANCELLED
  await assert.rejects(
    async () => cancelOrder(orderId, { actor, reason: 'Duplicate', idempotencyKey: 'sm-void-pos-102' }),
    (err) => err.code === 'ORDER_ALREADY_CANCELLED'
  );
  assert.equal(recordedMutations.length, 1, 'Stock must not be restored twice on duplicate cancellation');
});

test('P3-INV-002: 16. Multi-channel alternating contention: POS and online checkouts deduct from same canonical balance', async (t) => {
  const mockTx = createMockTx();
  mockTxSupport(t, mockTx);

  const mockStore = { storeId: STORE_A, ownerUserId: OWNER_A, status: 'active' };
  const mockVariant = { id: SKU_A, storeId: STORE_A, productId: PROD_A, sku: 'SHARED-SKU', barcode: BARCODE_A, price: '10.00', currency: 'USD', status: 'active', stockQuantity: 5 };
  const mockProduct = { id: PROD_A, storeId: STORE_A, name: 'Shared Item', price: '10.00', currency: 'USD', status: 'active', defaultSkuId: SKU_A, version: 1, ProductVariants: [mockVariant] };

  // Shared state: 5 units on hand
  const balance = { onHand: 5, reserved: 0, available: 5 };

  t.mock.method(StoreAccess, 'findByPk', async () => mockStore);
  t.mock.method(Product, 'findByPk', async () => mockProduct);
  t.mock.method(ProductVariant, 'findByPk', async () => mockVariant);
  t.mock.method(ProductVariant, 'findOne', async () => mockVariant);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  t.mock.method(Customer, 'findOne', async () => null);
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => balance);

  t.mock.method(inventoryLedgerService, 'mutateBalance', async ({ changeOnHand, changeReserved }) => {
    const newOnHand = balance.onHand + changeOnHand;
    const newReserved = balance.reserved + changeReserved;
    const newAvailable = newOnHand - newReserved;

    if (newOnHand < 0 || newReserved > newOnHand || newAvailable < 0) {
      const err = new InsufficientStockError(`Insufficient stock: requested change ${changeOnHand}, available was ${balance.available}`);
      err.statusCode = 409;
      throw err;
    }

    balance.onHand = newOnHand;
    balance.reserved = newReserved;
    balance.available = newAvailable;
    return { balance: { ...balance } };
  });

  t.mock.method(Order, 'create', async (data) => ({
    id: randomUUID(),
    ...data,
    async update(up) { Object.assign(this, up); return this; },
    toJSON() { return { ...this }; },
  }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON: () => data }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, toJSON: () => data }));

  // 1. POS sells 2 units -> balance: 5 - 2 = 3
  {
    const req = {
      params: { storeId: STORE_A },
      body: { items: [{ productId: PROD_A, variantId: SKU_A, quantity: 2, price: '10.00' }], paymentMethod: 'cash' },
      user: { id: 'cashier-1', type: 'staff', permissions: ['pos'] },
      headers: {},
    };
    const res = responseHelper();
    await createPOSOrder(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(balance.onHand, 3);
  }

  // 2. Online checkout reserves 2 units -> balance available: 3 - 2 = 1
  {
    balance.reserved += 2;
    balance.available = balance.onHand - balance.reserved;
    assert.equal(balance.available, 1);
  }

  // 3. POS sells 1 unit -> balance onHand: 3 - 1 = 2, available: 2 - 2 = 0
  {
    const req = {
      params: { storeId: STORE_A },
      body: { items: [{ productId: PROD_A, variantId: SKU_A, quantity: 1, price: '10.00' }], paymentMethod: 'cash' },
      user: { id: 'cashier-1', type: 'staff', permissions: ['pos'] },
      headers: {},
    };
    const res = responseHelper();
    await createPOSOrder(req, res);
    assert.equal(res.statusCode, 201);
    assert.equal(balance.onHand, 2);
    assert.equal(balance.available, 0);
  }

  // 4. Another POS attempt to sell 1 unit fails with 409 INSUFFICIENT_STOCK
  {
    const req = {
      params: { storeId: STORE_A },
      body: { items: [{ productId: PROD_A, variantId: SKU_A, quantity: 1, price: '10.00' }], paymentMethod: 'cash' },
      user: { id: 'cashier-1', type: 'staff', permissions: ['pos'] },
      headers: {},
    };
    const res = responseHelper();
    await createPOSOrder(req, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'INSUFFICIENT_STOCK');
    assert.equal(balance.onHand, 2);
  }
});

test('P3-INV-002: 17. Static Enforcement: scripts/quality/check-no-direct-stock-writes.js checks modules/checkout and modules/orders with 0 violations', () => {
  const scriptPath = path.resolve(__dirname, '../../scripts/quality/check-no-direct-stock-writes.js');
  const output = execSync(`node "${scriptPath}"`, {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
  });

  assert.match(output, /Static enforcement passed/);
  assert.match(output, /modules\/checkout/);
  assert.match(output, /modules\/orders/);
  assert.match(output, /Zero direct stock writes detected/);
});
