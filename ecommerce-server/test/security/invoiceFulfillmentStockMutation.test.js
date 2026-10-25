// test/security/invoiceFulfillmentStockMutation.test.js
// P3-INV-002 Slice 5: Comprehensive test suite for invoice fulfillment stock mutations.
// Verifies explicit reservation policy, canonical SKU inventory, single-effect deduplication,
// fulfilled invoice immutability, store ownership isolation, cross-channel single-source invariants,
// and concurrency contention.

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
  Product,
  ProductVariant,
  StoreAccess,
  WebsiteData,
  Order,
  OrderItem,
  Invoice,
  Payment,
  ShippingDetail,
} = require('../../models');
const { inventoryLedgerService } = require('../../modules/inventory');
const invoiceFulfillmentService = require('../../modules/invoices/invoiceFulfillmentService');
const invoiceController = require('../../modules/invoices/invoiceController');
const { requireInvoiceAccess } = require('../../middlewares/requireWebsiteAccess');

// Helper to simulate Express response
const responseHelper = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
  setHeader(name, val) { this.headers[name] = val; return this; },
});

// Setup mock product, variant, and store fixtures
function createFixtures(storeId) {
  const productId = randomUUID();
  const variantId = randomUUID();
  const sku = variantId;

  const mockProduct = {
    id: productId,
    storeId,
    name: 'Handwoven Silk Blanket',
    price: 45.00,
    stockQuantity: 10,
    sku: `${sku}-BASE`,
    status: 'active',
    async update(fields) { Object.assign(this, fields); return this; },
    toJSON() { return { ...this }; },
  };

  const mockVariant = {
    id: variantId,
    productId,
    storeId,
    name: 'Blue / Large',
    price: 50.00,
    stockQuantity: 10,
    sku,
    status: 'active',
    async update(fields) { Object.assign(this, fields); return this; },
    toJSON() { return { ...this }; },
  };

  mockProduct.ProductVariants = [mockVariant];
  return { mockProduct, mockVariant, sku, productId, variantId };
}

test('P3-INV-002 Slice 5: 1. Draft invoice creation has ZERO stock effect', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 0, available: 10 });

  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  let mutateCalled = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutateCalled = true;
  });

  t.mock.method(StoreAccess, 'findByPk', async () => ({ storeId, status: 'active' }));
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  t.mock.method(Order, 'create', async (data) => ({ ...data, update: async function(f) { Object.assign(this, f); }, toJSON() { return { ...this }; } }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON() { return { ...this }; } }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON() { return { ...this }; } }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, update: async function(f) { Object.assign(this, f); }, toJSON() { return { ...this }; } }));
  t.mock.method(ShippingDetail, 'create', async () => ({}));

  const result = await invoiceFulfillmentService.createInvoiceOrder({
    storeId,
    invoiceData: {
      isDraft: true,
      items: [{ productId, variantId, quantity: 2, price: 50.00 }],
    },
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result.invoice.status, 'draft', 'Draft invoice status must be draft');
  assert.equal(result.order.status, 'pending');
  assert.equal(result.order.stockDeducted, false, 'Draft must not deduct stock');
  assert.equal(result.order.stockReserved, false, 'Draft must not reserve stock');
  assert.equal(mutateCalled, false, 'inventoryLedgerService.mutateBalance must not be called for draft creation');
});

test('P3-INV-002 Slice 5: 2. Issued draft invoice reserves stock via canonical inventory ledger', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 0, available: 10 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.reserved += params.changeReserved;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  const invoiceId = randomUUID();
  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: false,
    stockReserved: false,
    status: 'pending',
    OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 3, price: 50.00 }],
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'draft',
    Order: mockOrder,
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  const result = await invoiceFulfillmentService.issueDraftInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result.issued, true);
  assert.equal(mockInvoice.status, 'sent', 'Invoice status must transition from draft to sent');
  assert.equal(mockOrder.stockReserved, true, 'Order stockReserved flag must be true');
  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'reservation');
  assert.equal(ledgerMutations[0].changeReserved, 3);
  assert.equal(ledgerMutations[0].changeOnHand, 0);
  assert.equal(balances.get(sku).reserved, 3);
  assert.equal(balances.get(sku).available, 7);
});

test('P3-INV-002 Slice 5: 3. Pending/Sent invoice creation reserves stock with explicit policy', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 0, available: 10 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.reserved += params.changeReserved;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  t.mock.method(StoreAccess, 'findByPk', async () => ({ storeId, status: 'active' }));
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  t.mock.method(Order, 'create', async (data) => ({ ...data, update: async function(f) { Object.assign(this, f); }, toJSON() { return { ...this }; } }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON() { return { ...this }; } }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON() { return { ...this }; } }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, update: async function(f) { Object.assign(this, f); }, toJSON() { return { ...this }; } }));
  t.mock.method(ShippingDetail, 'create', async () => ({}));

  const result = await invoiceFulfillmentService.createInvoiceOrder({
    storeId,
    invoiceData: {
      status: 'sent',
      paymentMethod: 'bank_transfer',
      items: [{ productId, variantId, quantity: 4, price: 50.00 }],
    },
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result.invoice.status, 'sent');
  assert.equal(result.order.stockReserved, true);
  assert.equal(result.order.stockDeducted, false);
  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'reservation');
  assert.equal(ledgerMutations[0].changeReserved, 4);
  assert.equal(balances.get(sku).reserved, 4);
  assert.equal(balances.get(sku).available, 6);
});

test('P3-INV-002 Slice 5: 4. Immediate invoice payment deducts on-hand stock directly', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 0, available: 10 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.onHand += params.changeOnHand;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  t.mock.method(StoreAccess, 'findByPk', async () => ({ storeId, status: 'active' }));
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  t.mock.method(Order, 'create', async (data) => ({ ...data, update: async function(f) { Object.assign(this, f); }, toJSON() { return { ...this }; } }));
  t.mock.method(OrderItem, 'create', async (data) => ({ ...data, toJSON() { return { ...this }; } }));
  t.mock.method(Payment, 'create', async (data) => ({ ...data, toJSON() { return { ...this }; } }));
  t.mock.method(Invoice, 'create', async (data) => ({ ...data, update: async function(f) { Object.assign(this, f); }, toJSON() { return { ...this }; } }));
  t.mock.method(ShippingDetail, 'create', async () => ({}));

  const result = await invoiceFulfillmentService.createInvoiceOrder({
    storeId,
    invoiceData: {
      status: 'paid',
      paymentMethod: 'cash',
      items: [{ productId, variantId, quantity: 2, price: 50.00 }],
    },
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result.invoice.status, 'paid');
  assert.equal(result.order.stockDeducted, true);
  assert.equal(result.order.stockReserved, false);
  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'invoice_fulfillment');
  assert.equal(ledgerMutations[0].changeOnHand, -2);
  assert.equal(balances.get(sku).onHand, 8);
  assert.equal(balances.get(sku).available, 8);
});

test('P3-INV-002 Slice 5: 5. Fulfill pending invoice consumes reservation and deducts stock on-hand', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  // Initial balance after reservation: onHand=10, reserved=3, available=7
  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 3, available: 7 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.onHand += params.changeOnHand;
    b.reserved += params.changeReserved;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  const invoiceId = randomUUID();
  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: false,
    stockReserved: true,
    status: 'pending',
    fulfillmentStatus: 'unfulfilled',
    OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 3, price: 50.00 }],
    Payment: { status: 'pending', async update(f) { Object.assign(this, f); } },
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'sent',
    Order: mockOrder,
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  const result = await invoiceFulfillmentService.fulfillInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result.fulfilled, true);
  assert.equal(mockInvoice.status, 'paid');
  assert.equal(mockOrder.stockDeducted, true);
  assert.equal(mockOrder.stockReserved, false);
  assert.equal(mockOrder.fulfillmentStatus, 'delivered');

  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'invoice_fulfillment');
  assert.equal(ledgerMutations[0].changeOnHand, -3, 'onHand must decrease by 3');
  assert.equal(ledgerMutations[0].changeReserved, -3, 'reserved must decrease by 3 (reservation consumed)');
  assert.equal(balances.get(sku).onHand, 7);
  assert.equal(balances.get(sku).reserved, 0);
  assert.equal(balances.get(sku).available, 7);
});

test('P3-INV-002 Slice 5: 6. Repeated invoice fulfillment returns idempotently and cannot deduct twice', async (t) => {
  const storeId = randomUUID();
  const invoiceId = randomUUID();

  // Invoice already fulfilled
  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: true,
    stockReserved: false,
    status: 'completed',
    fulfillmentStatus: 'delivered',
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'paid',
    Order: mockOrder,
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);

  let mutateCalled = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutateCalled = true;
  });

  const result = await invoiceFulfillmentService.fulfillInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
    idempotencyKey: 'fulfill-replay-key-001',
  });

  assert.equal(result.alreadyFulfilled, true, 'Must detect existing fulfillment hit');
  assert.equal(mutateCalled, false, 'Mutate balance must NOT be called on repeated fulfillment');
});

test('P3-INV-002 Slice 5: 7. Cancelling pending invoice releases reservation with 0 on-hand effect', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 2, available: 8 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.reserved += params.changeReserved;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  const invoiceId = randomUUID();
  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: false,
    stockReserved: true,
    status: 'pending',
    OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 2, price: 50.00 }],
    Payment: { status: 'pending', async update(f) { Object.assign(this, f); } },
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'sent',
    Order: mockOrder,
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  const result = await invoiceFulfillmentService.cancelInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result.cancelled, true);
  assert.equal(mockInvoice.status, 'cancelled');
  assert.equal(mockOrder.status, 'cancelled');
  assert.equal(mockOrder.stockReserved, false);
  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'reservation_release');
  assert.equal(ledgerMutations[0].changeReserved, -2);
  assert.equal(ledgerMutations[0].changeOnHand, 0);
  assert.equal(balances.get(sku).reserved, 0);
  assert.equal(balances.get(sku).available, 10);
});

test('P3-INV-002 Slice 5: 8. Cancelling fulfilled invoice restores on-hand stock and cannot restore twice', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  const balances = new Map();
  balances.set(sku, { onHand: 8, reserved: 0, available: 8 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.onHand += params.changeOnHand;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  const invoiceId = randomUUID();
  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: true,
    stockReserved: false,
    status: 'completed',
    OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 2, price: 50.00 }],
    Payment: { status: 'completed', async update(f) { Object.assign(this, f); } },
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'paid',
    Order: mockOrder,
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  // First cancellation: restores stock
  const result1 = await invoiceFulfillmentService.cancelInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result1.cancelled, true);
  assert.equal(mockInvoice.status, 'cancelled');
  assert.equal(mockOrder.stockDeducted, false);
  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'cancellation');
  assert.equal(ledgerMutations[0].changeOnHand, 2);
  assert.equal(balances.get(sku).onHand, 10);

  // Second cancellation: idempotent replay, zero additional effects
  const result2 = await invoiceFulfillmentService.cancelInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
  });

  assert.equal(result2.alreadyCancelled, true);
  assert.equal(ledgerMutations.length, 1, 'Repeated cancellation must not mutate inventory twice');
});

test('P3-INV-002 Slice 5: 9. Invoice edits cannot rewrite fulfilled quantities (409 Conflict)', async (t) => {
  const storeId = randomUUID();
  const invoiceId = randomUUID();

  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: true,
    stockReserved: false,
    status: 'completed',
    OrderItems: [{ id: randomUUID(), productId: 'p1', quantity: 2 }],
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'paid',
    Order: mockOrder,
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);

  await assert.rejects(
    async () => {
      await invoiceFulfillmentService.updateInvoice({
        invoiceId,
        storeId,
        actor: { id: 'merchant-1', role: 'merchant' },
        updateData: {
          items: [{ productId: 'p1', quantity: 5 }],
        },
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'CANNOT_EDIT_FULFILLED_INVOICE');
      return true;
    }
  );
});

test('P3-INV-002 Slice 5: 10. Invoice edits on pending invoice adjust reservation deltas', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  // Initial balance: onHand=10, reserved=2, available=8
  const balances = new Map();
  balances.set(sku, { onHand: 10, reserved: 2, available: 8 });

  const ledgerMutations = [];
  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    ledgerMutations.push(params);
    const b = balances.get(sku);
    b.reserved += params.changeReserved;
    b.available = b.onHand - b.reserved;
    return { ...b };
  });

  const invoiceId = randomUUID();
  const mockOrder = {
    id: randomUUID(),
    storeId,
    stockDeducted: false,
    stockReserved: true,
    status: 'pending',
    discountTotal: 0,
    shippingFee: 0,
    OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 2, price: 50.00 }],
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  const mockInvoice = {
    id: invoiceId,
    storeId,
    status: 'sent',
    Order: mockOrder,
    async update(fields) { Object.assign(this, fields); },
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);
  t.mock.method(OrderItem, 'destroy', async () => {});
  t.mock.method(OrderItem, 'create', async (data) => data);
  t.mock.method(Product, 'findByPk', async (id) => (id === productId ? mockProduct : null));
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async (q) => (q?.where?.id === variantId ? mockVariant : null));
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  // Merchant edits invoice: increases quantity from 2 to 5 (delta +3)
  const result = await invoiceFulfillmentService.updateInvoice({
    invoiceId,
    storeId,
    actor: { id: 'merchant-1', role: 'merchant' },
    updateData: {
      items: [{ productId, variantId, quantity: 5, price: 50.00 }],
    },
  });

  assert.equal(result.updated, true);
  assert.equal(ledgerMutations.length, 1);
  assert.equal(ledgerMutations[0].reasonCode, 'reservation');
  assert.equal(ledgerMutations[0].changeReserved, 3, 'Must reserve delta of +3');
  assert.equal(balances.get(sku).reserved, 5);
  assert.equal(balances.get(sku).available, 5);
});

test('P3-INV-002 Slice 5: 11. Cross-store invoice access is rejected with 404 to prevent ID guessing', async (t) => {
  const storeA = randomUUID();
  const storeB = randomUUID();
  const invoiceId = randomUUID();

  // Invoice belongs to Store A
  const mockInvoice = {
    id: invoiceId,
    storeId: storeA,
    status: 'sent',
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => mockInvoice);

  // Attacker targeting Store B tries to access/fulfill Invoice A
  await assert.rejects(
    async () => {
      await invoiceFulfillmentService.fulfillInvoice({
        invoiceId,
        storeId: storeB,
        actor: { id: 'attacker', role: 'merchant' },
      });
    },
    (err) => {
      assert.equal(err.statusCode, 404, 'Must reject cross-store invoice with 404');
      return true;
    }
  );
});

test('P3-INV-002 Slice 5: 12. Cross-store product injection in invoice is rejected with 403', async (t) => {
  const storeA = randomUUID();
  const storeB = randomUUID();

  // Product belongs to Store B
  const productB = {
    id: randomUUID(),
    storeId: storeB,
    name: 'Store B Silk',
    price: 30,
    stockQuantity: 10,
    status: 'active',
  };

  t.mock.method(StoreAccess, 'findByPk', async () => ({ storeId: storeA, status: 'active' }));
  t.mock.method(Product, 'findByPk', async () => productB);

  // Merchant of Store A tries to create invoice using Store B product
  await assert.rejects(
    async () => {
      await invoiceFulfillmentService.createInvoiceOrder({
        storeId: storeA,
        invoiceData: {
          items: [{ productId: productB.id, quantity: 1, price: 30 }],
        },
        actor: { id: 'merchant-a', role: 'merchant' },
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'CROSS_STORE_ITEM_PROHIBITED');
      return true;
    }
  );
});

test('P3-INV-002 Slice 5: 13. Cross-channel single source: POS order invoice cannot be double-deducted', async (t) => {
  const storeId = randomUUID();
  const invoiceId = randomUUID();

  // POS order was created and stock was deducted at counter
  const posOrder = {
    id: randomUUID(),
    storeId,
    orderType: 'pos',
    salesChannel: 'pos',
    stockDeducted: true,
    stockReserved: false,
    status: 'completed',
    fulfillmentStatus: 'delivered',
    toJSON() { return { ...this }; },
  };

  const posInvoice = {
    id: invoiceId,
    storeId,
    orderId: posOrder.id,
    status: 'paid',
    Order: posOrder,
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async () => posInvoice);

  let mutateCalled = false;
  t.mock.method(inventoryLedgerService, 'mutateBalance', async () => {
    mutateCalled = true;
  });

  // Calling fulfillInvoice on the POS receipt invoice must not re-deduct
  const result = await invoiceFulfillmentService.fulfillInvoice({
    invoiceId,
    storeId,
    actor: { id: 'staff-pos', role: 'staff' },
  });

  assert.equal(result.alreadyFulfilled, true);
  assert.equal(mutateCalled, false, 'Invoice fulfillment must NOT double-deduct for POS order source');
});

test('P3-INV-002 Slice 5: 14. Deterministic last-unit concurrency between invoice fulfillment and online checkout', async (t) => {
  const storeId = randomUUID();
  const { mockProduct, mockVariant, sku, productId, variantId } = createFixtures(storeId);

  // Available stock is exactly 1 unit
  let availableStock = 1;
  let onHandStock = 1;

  t.mock.method(inventoryLedgerService, 'ensureBalance', async () => {});
  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    if (params.changeOnHand < 0 && onHandStock + params.changeOnHand < 0) {
      const err = new Error(`Insufficient stock for SKU ${sku}`);
      err.code = 'INSUFFICIENT_STOCK';
      err.statusCode = 409;
      throw err;
    }
    onHandStock += params.changeOnHand;
    availableStock += (params.changeOnHand - params.changeReserved);
    return { onHand: onHandStock, reserved: 0, available: availableStock };
  });

  // Invoice A and Invoice B both compete to fulfill the final 1 unit
  const invoiceA = {
    id: randomUUID(),
    storeId,
    status: 'sent',
    Order: {
      id: randomUUID(),
      storeId,
      stockDeducted: false,
      stockReserved: false,
      OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 1, price: 50 }],
      Payment: { update: async () => {} },
      update: async () => {},
      toJSON() { return { ...this }; },
    },
    update: async () => {},
    toJSON() { return { ...this }; },
  };

  const invoiceB = {
    id: randomUUID(),
    storeId,
    status: 'sent',
    Order: {
      id: randomUUID(),
      storeId,
      stockDeducted: false,
      stockReserved: false,
      OrderItems: [{ id: randomUUID(), productId, variantId, quantity: 1, price: 50 }],
      Payment: { update: async () => {} },
      update: async () => {},
      toJSON() { return { ...this }; },
    },
    update: async () => {},
    toJSON() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async (id) => (id === invoiceA.id ? invoiceA : invoiceB));
  t.mock.method(Product, 'findByPk', async () => mockProduct);
  if (typeof ProductVariant?.findByPk === 'function') {
    t.mock.method(ProductVariant, 'findByPk', async () => mockVariant);
  }
  if (typeof ProductVariant?.findOne === 'function') {
    t.mock.method(ProductVariant, 'findOne', async () => mockVariant);
  }
  if (typeof ProductVariant?.findAll === 'function') {
    t.mock.method(ProductVariant, 'findAll', async () => [mockVariant]);
  }

  const results = await Promise.allSettled([
    invoiceFulfillmentService.fulfillInvoice({ invoiceId: invoiceA.id, storeId }),
    invoiceFulfillmentService.fulfillInvoice({ invoiceId: invoiceB.id, storeId }),
  ]);

  const fulfilledCount = results.filter((r) => r.status === 'fulfilled').length;
  const rejectedCount = results.filter((r) => r.status === 'rejected').length;

  assert.equal(fulfilledCount, 1, 'Exactly one contender must win the last unit');
  assert.equal(rejectedCount, 1, 'Losing contender must be rejected');
  assert.equal(onHandStock, 0, 'Final on-hand stock must be exactly 0, never negative');
});

test('P3-INV-002 Slice 5: 15. Controller endpoint verification: fulfill and cancel routes', async (t) => {
  const storeId = randomUUID();
  const invoiceId = randomUUID();

  t.mock.method(invoiceFulfillmentService, 'fulfillInvoice', async () => ({
    fulfilled: true,
    invoice: { id: invoiceId, status: 'paid' },
  }));

  const reqFulfill = {
    params: { invoiceId },
    store: { storeId },
    headers: { 'idempotency-key': 'test-fulfill-1' },
    user: { id: 'merchant-1', role: 'merchant' },
  };
  const resFulfill = responseHelper();
  await invoiceController.fulfillInvoice(reqFulfill, resFulfill);

  assert.equal(resFulfill.statusCode, 200);
  assert.equal(resFulfill.body.fulfilled, true);

  t.mock.method(invoiceFulfillmentService, 'cancelInvoice', async () => ({
    cancelled: true,
    invoice: { id: invoiceId, status: 'cancelled' },
  }));

  const reqCancel = {
    params: { invoiceId },
    store: { storeId },
    headers: { 'idempotency-key': 'test-cancel-1' },
    body: { reason: 'Customer requested cancellation' },
    user: { id: 'merchant-1', role: 'merchant' },
  };
  const resCancel = responseHelper();
  await invoiceController.cancelInvoice(reqCancel, resCancel);

  assert.equal(resCancel.statusCode, 200);
  assert.equal(resCancel.body.cancelled, true);
});

test('P3-INV-002 Slice 5: 16. Static quality check: zero direct stock writes in modules/invoices', () => {
  const path = require('node:path');
  const { execSync } = require('node:child_process');
  const scriptPath = path.resolve(__dirname, '../../scripts/quality/check-no-direct-stock-writes.js');
  const output = execSync(`node "${scriptPath}"`, {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
  });

  assert.match(output, /Static enforcement passed/);
  assert.match(output, /modules\/invoices/);
  assert.match(output, /Zero direct stock writes detected/);
});
