// test/integration/posConcurrencyAndIdempotency.test.js
// Validates P4-POS-001 requirements:
// 1. POS Idempotency: Retrying creates only one sale, returning existing order replay.
// 2. Concurrency & Canonical Stock: Competing for the final unit produces only one successful allocation.
// 3. Staff Authorization: Unauthorized staff without pos permission cannot transact.
// 4. Marketplace-Only Merchants: POS works for store without websiteId.
// 5. Cancellation & Return Boundaries: Completed orders can be returned restoring stock; double returns fail.

const test = require('node:test');
const assert = require('node:assert/strict');
const OrderController = require('../../modules/orders/OrderController');
const { Product, Order, OrderItem, Payment, Invoice, Customer, StoreAccess, PaymentGatewayConfig } = require('../../models');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const { changeStock } = require('../../modules/inventory/sharedStockService');
const { sequelize } = require('../../config/db');

const responseHelper = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
  setHeader(name, val) { this.headers[name] = val; return this; },
});

test('P4-POS-001: POS Idempotency - Retrying with identical Idempotency-Key returns existing sale without duplicate stock deduction', async (t) => {
  const mockTx = { commit: async () => {}, rollback: async () => {}, LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(sequelize, 'transaction', async () => mockTx);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);
  const storeId = '11111111-2222-3333-4444-555555555555';
  const productId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const checkoutKey = 'pos-sale-key-xyz-12345';

  let currentStock = 10;
  let deductCount = 0;

  const mockProduct = {
    id: productId,
    storeId,
    websiteId: null,
    name: 'Khmer Ceramic Mug',
    price: 15.00,
    status: 'active',
    trackInventory: true,
    stockQuantity: currentStock,
    productType: 'physical',
    version: 1,
    ProductVariants: [],
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) currentStock = changes.stockQuantity;
      Object.assign(this, changes);
      return this;
    }
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = currentStock;
      return mockProduct;
    }
    return null;
  });

  const existingOrders = new Map();
  const existingPayments = new Map();
  const existingInvoices = new Map();

  t.mock.method(Order, 'findOne', async ({ where }) => {
    if (where.checkoutKey && existingOrders.has(where.checkoutKey)) {
      return existingOrders.get(where.checkoutKey);
    }
    return null;
  });

  t.mock.method(Order, 'create', async (data) => {
    const record = {
      ...data,
      id: 'pos-order-id-1',
      orderNumber: 'POS-ORD-001',
      update: async function(changes) {
        Object.assign(this, changes);
        return this;
      },
      toJSON: function() { return { ...this }; }
    };
    if (data.checkoutKey) {
      existingOrders.set(data.checkoutKey, record);
    }
    deductCount++;
    return record;
  });

  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON: () => ({ ...data }) }));

  t.mock.method(Payment, 'findOne', async ({ where }) => {
    if (where.orderId) return existingPayments.get(where.orderId) || null;
    return null;
  });

  t.mock.method(Payment, 'create', async (data) => {
    const record = {
      ...data,
      id: 'pos-pay-id-1',
      toJSON: function() { return { ...this }; }
    };
    existingPayments.set(data.orderId, record);
    return record;
  });

  t.mock.method(Invoice, 'findOne', async ({ where }) => {
    if (where.orderId) return existingInvoices.get(where.orderId) || null;
    return null;
  });

  t.mock.method(Invoice, 'create', async (data) => {
    const record = {
      ...data,
      id: 'pos-inv-id-1',
      toJSON: function() { return { ...this }; }
    };
    existingInvoices.set(data.orderId, record);
    return record;
  });

  t.mock.method(StoreAccess, 'findByPk', async (id) => {
    if (id === storeId) {
      return { storeId, status: 'active', ownerUserId: 'merchant-owner-1', websiteId: null };
    }
    return null;
  });

  // First attempt: should succeed and create order
  const req1 = {
    params: { storeId },
    get: (header) => (header.toLowerCase() === 'idempotency-key' ? checkoutKey : null),
    body: {
      checkoutKey,
      items: [{ productId, quantity: 2, price: 15.00 }],
      paymentMethod: 'cash',
      currency: 'USD',
    },
    user: { id: 'cashier-1', type: 'user', role: 'merchant' },
    store: { storeId, status: 'active', ownerUserId: 'merchant-owner-1' },
  };
  const res1 = responseHelper();
  await OrderController.createPOSOrder(req1, res1);

  assert.equal(res1.statusCode, 201);
  assert.equal(res1.body.success, true);
  assert.equal(res1.body.order.id, 'pos-order-id-1');
  assert.equal(deductCount, 1);

  // Second attempt with SAME checkoutKey: should replay existing order (status 200, idempotentReplay: true)
  const req2 = {
    params: { storeId },
    get: (header) => (header.toLowerCase() === 'idempotency-key' ? checkoutKey : null),
    body: {
      checkoutKey,
      items: [{ productId, quantity: 2, price: 15.00 }],
      paymentMethod: 'cash',
      currency: 'USD',
    },
    user: { id: 'cashier-1', type: 'user', role: 'merchant' },
    store: { storeId, status: 'active', ownerUserId: 'merchant-owner-1' },
  };
  const res2 = responseHelper();
  await OrderController.createPOSOrder(req2, res2);

  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.success, true);
  assert.equal(res2.body.idempotentReplay, true);
  assert.equal(res2.body.order.id, 'pos-order-id-1');
  assert.equal(deductCount, 1, 'Stock deduction should not execute a second time upon retry');
});

test('P4-POS-001: POS Idempotency Race - UniqueConstraintError on checkoutKey resolves gracefully to idempotent replay', async (t) => {
  const storeId = '11111111-2222-3333-4444-555555555555';
  const productId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const checkoutKey = 'pos-race-key-999';

  const mockTx = { commit: async () => {}, rollback: async () => {}, LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(sequelize, 'transaction', async () => mockTx);
  t.mock.method(PaymentGatewayConfig, 'findAll', async () => []);

  t.mock.method(Product, 'findByPk', async (id) => ({
    id,
    storeId,
    name: 'Khmer Ceramic Mug',
    price: 15.00,
    status: 'active',
    trackInventory: true,
    stockQuantity: 10,
    productType: 'physical',
    ProductVariants: [],
  }));

  const committedOrder = {
    id: 'pos-committed-order-race',
    storeId,
    checkoutKey,
    orderNumber: 'POS-RACE-001',
    status: 'completed',
    totalAmount: 15.00,
    toJSON: function() { return { ...this }; }
  };

  let callCount = 0;
  t.mock.method(Order, 'findOne', async ({ where }) => {
    callCount++;
    // First lookup in createPOSOrder: simulates not found yet (race in progress)
    if (callCount === 1) return null;
    // Catch block lookup: committed order is found
    return committedOrder;
  });

  t.mock.method(Order, 'create', async () => {
    const err = new Error('Validation error: uq_orders_checkout_key must be unique');
    err.name = 'SequelizeUniqueConstraintError';
    throw err;
  });

  t.mock.method(Payment, 'findOne', async () => ({ id: 'pay-race-1', status: 'completed', toJSON: () => ({ id: 'pay-race-1' }) }));
  t.mock.method(Invoice, 'findOne', async () => ({ id: 'inv-race-1', status: 'paid', toJSON: () => ({ id: 'inv-race-1' }) }));

  const req = {
    params: { storeId },
    get: (header) => (header.toLowerCase() === 'idempotency-key' ? checkoutKey : null),
    body: {
      checkoutKey,
      items: [{ productId, quantity: 1, price: 15.00 }],
      paymentMethod: 'cash',
    },
    user: { id: 'cashier-1', type: 'user', role: 'merchant' },
    store: { storeId, status: 'active', ownerUserId: 'merchant-owner-1' },
  };
  const res = responseHelper();
  await OrderController.createPOSOrder(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.idempotentReplay, true);
  assert.equal(res.body.order.id, 'pos-committed-order-race');
});

test('P4-POS-001: Concurrency & Canonical Stock - Competing for the final unit produces exactly one allocation', async (t) => {
  const productId = 'prod-last-unit-1';
  let stockQuantity = 1;

  const mockTransaction1 = { LOCK: { UPDATE: 'UPDATE' } };
  const mockTransaction2 = { LOCK: { UPDATE: 'UPDATE' } };

  const mockProduct = {
    id: productId,
    name: 'Unique Silk Tapestry',
    status: 'active',
    trackInventory: true,
    stockQuantity: 1,
    version: 1,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) {
        stockQuantity = changes.stockQuantity;
        this.stockQuantity = changes.stockQuantity;
      }
      return this;
    }
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = stockQuantity;
      return mockProduct;
    }
    return null;
  });

  // Transaction 1 claims the last unit
  const result1 = await changeStock(productId, -1, mockTransaction1);
  assert.equal(result1.stockQuantity, 0);
  assert.equal(stockQuantity, 0);

  // Transaction 2 attempts to claim another unit while stock is 0: must fail with stock limit error
  await assert.rejects(
    async () => {
      await changeStock(productId, -1, mockTransaction2);
    },
    (err) => {
      assert.match(err.message, /Only 0 left in stock/);
      return true;
    }
  );

  assert.equal(stockQuantity, 0, 'Stock must never become negative');
});

test('P4-POS-001: Staff Authorization - Unauthorized staff without pos permission cannot transact', async (t) => {
  const storeId = 'store-auth-test-1';
  const ownerId = 'merchant-owner-1';
  const storeRecord = { storeId, ownerUserId: ownerId, status: 'active', websiteId: null };

  const middleware = createRequireStoreAccess({
    findStore: async () => storeRecord,
    permissions: ['pos', 'manage_pos'],
  });

  // 1. Staff WITH pos permission: Allowed
  const permittedStaffReq = {
    params: { storeId },
    user: { id: 'staff-1', type: 'staff', merchantId: ownerId, permissions: ['pos'] },
  };
  const permittedRes = responseHelper();
  let nextCalledPermitted = false;
  await middleware(permittedStaffReq, permittedRes, () => { nextCalledPermitted = true; });
  assert.equal(nextCalledPermitted, true);
  assert.equal(permittedStaffReq.store.storeId, storeId);

  // 2. Staff WITHOUT pos permission: Rejected with 403
  const unauthorizedStaffReq = {
    params: { storeId },
    user: { id: 'staff-2', type: 'staff', merchantId: ownerId, permissions: ['orders'] }, // only orders, no pos
  };
  const unauthorizedRes = responseHelper();
  let nextCalledUnauthorized = false;
  await middleware(unauthorizedStaffReq, unauthorizedRes, () => { nextCalledUnauthorized = true; });
  assert.equal(nextCalledUnauthorized, false);
  assert.equal(unauthorizedRes.statusCode, 403);
  assert.match(unauthorizedRes.body.error, /Store access denied/);
});

test('P4-POS-001: Cancellation & Return Boundary - Completed POS sale can be returned restoring stock; double returns fail', async (t) => {
  const mockTx = { commit: async () => {}, rollback: async () => {}, LOCK: { UPDATE: 'UPDATE' } };
  t.mock.method(sequelize, 'transaction', async () => mockTx);

  const storeId = 'store-return-test-1';
  const productId = 'prod-return-item-1';
  const orderId = 'pos-order-to-return-1';

  let currentStock = 3;

  const mockProduct = {
    id: productId,
    name: 'Organic Honey',
    status: 'active',
    trackInventory: true,
    stockQuantity: currentStock,
    version: 1,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) {
        currentStock = changes.stockQuantity;
        this.stockQuantity = changes.stockQuantity;
      }
      return this;
    }
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = currentStock;
      return mockProduct;
    }
    return null;
  });

  let orderStatus = 'completed';
  const mockOrder = {
    id: orderId,
    storeId,
    orderType: 'pos',
    status: orderStatus,
    stockDeducted: true,
    totalAmount: 30.00,
    OrderItems: [
      { productId, quantity: 2, price: 15.00 }
    ],
    Payment: {
      id: 'pay-ret-1',
      status: 'completed',
      update: async function(changes) { Object.assign(this, changes); return this; }
    },
    Invoice: {
      id: 'inv-ret-1',
      status: 'paid',
      update: async function(changes) { Object.assign(this, changes); return this; }
    },
    update: async function(changes) {
      if (changes.status) orderStatus = changes.status;
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this, status: orderStatus }; }
  };

  t.mock.method(Order, 'findOne', async () => mockOrder);

  // First return attempt: should succeed and restore 2 units of stock
  const returnReq1 = {
    params: { storeId, orderId },
    body: { reason: 'Customer changed mind' },
    store: { storeId, status: 'active' },
  };
  const returnRes1 = responseHelper();
  await OrderController.processPOSReturn(returnReq1, returnRes1);

  assert.equal(returnRes1.statusCode, 200);
  assert.equal(returnRes1.body.success, true);
  assert.equal(orderStatus, 'refunded');
  assert.equal(currentStock, 5, 'Inventory must be restored by the returned quantity (3 + 2 = 5)');
  assert.equal(mockOrder.Payment.status, 'refunded');

  // Second return attempt on the same order: must fail with 409 conflict boundary
  const returnReq2 = {
    params: { storeId, orderId },
    body: { reason: 'Duplicate return attempt' },
    store: { storeId, status: 'active' },
  };
  const returnRes2 = responseHelper();
  await OrderController.processPOSReturn(returnReq2, returnRes2);

  assert.equal(returnRes2.statusCode, 409);
  assert.match(returnRes2.body.error, /already been refunded or returned/);
  assert.equal(currentStock, 5, 'Stock must not be restored twice');
});
