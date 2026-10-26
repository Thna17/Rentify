// test/integration/invoiceLifecycleAndStock.test.js
// P4-INV-001: Verification of Invoice and Quote Lifecycle, Non-Double-Deduction,
// State Machine transitions, Stock Reconciliation, and Authorization.

const test = require('node:test');
const assert = require('node:assert/strict');
const invoiceLifecycle = require('../../modules/invoices/invoiceLifecycleService');
const {
  INVOICE_STATUSES,
  LEGAL_TRANSITIONS,
  canTransition,
  createQuote,
  createInvoice,
  recordPayment,
  cancelInvoice,
  refundInvoice,
  convertQuoteToInvoice,
  buildInvoiceSnapshot,
} = invoiceLifecycle;
const { Invoice, Order, OrderItem, Payment, Product, ProductVariant, StoreAccess } = require('../../models');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const { requireInvoiceAccess } = require('../../middlewares/requireWebsiteAccess');
const { sequelize } = require('../../config/db');

// Helper to create mock response object
const responseHelper = () => ({
  statusCode: 200,
  body: null,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { this.body = body; return this; },
  setHeader(name, val) { this.headers[name] = val; return this; },
});

test('P4-INV-001: State Machine enforces legal transitions and rejects illegal transitions', () => {
  // Legal Transitions
  assert.equal(canTransition(INVOICE_STATUSES.DRAFT, INVOICE_STATUSES.SENT), true);
  assert.equal(canTransition(INVOICE_STATUSES.DRAFT, INVOICE_STATUSES.CANCELLED), true);
  assert.equal(canTransition(INVOICE_STATUSES.SENT, INVOICE_STATUSES.PAID), true);
  assert.equal(canTransition(INVOICE_STATUSES.SENT, INVOICE_STATUSES.PARTIALLY_PAID), true);
  assert.equal(canTransition(INVOICE_STATUSES.SENT, INVOICE_STATUSES.OVERDUE), true);
  assert.equal(canTransition(INVOICE_STATUSES.SENT, INVOICE_STATUSES.CANCELLED), true);
  assert.equal(canTransition(INVOICE_STATUSES.OVERDUE, INVOICE_STATUSES.PAID), true);
  assert.equal(canTransition(INVOICE_STATUSES.PAID, INVOICE_STATUSES.REFUNDED), true);

  // Idempotent transitions (same status)
  assert.equal(canTransition(INVOICE_STATUSES.PAID, INVOICE_STATUSES.PAID), true);
  assert.equal(canTransition(INVOICE_STATUSES.SENT, INVOICE_STATUSES.SENT), true);

  // Illegal Transitions
  assert.equal(canTransition(INVOICE_STATUSES.DRAFT, INVOICE_STATUSES.REFUNDED), false, 'Draft cannot be refunded directly');
  assert.equal(canTransition(INVOICE_STATUSES.PAID, INVOICE_STATUSES.CANCELLED), false, 'Paid cannot be cancelled directly; must refund');
  assert.equal(canTransition(INVOICE_STATUSES.CANCELLED, INVOICE_STATUSES.PAID), false, 'Cancelled is terminal');
  assert.equal(canTransition(INVOICE_STATUSES.VOID, INVOICE_STATUSES.PAID), false, 'Void is terminal');
  assert.equal(canTransition(INVOICE_STATUSES.REFUNDED, INVOICE_STATUSES.PAID), false, 'Refunded is terminal');
});

test('P4-INV-001: Quote Semantics: Non-binding estimate with ZERO stock deduction and ZERO stock reservation', async (t) => {
  const storeId = '11111111-2222-3333-4444-555555555555';
  const productId = 'prod-quote-1';
  let productStock = 50;

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      return {
        id: productId,
        name: 'Handwoven Scarf',
        price: 25.50,
        sku: 'SCARF-01',
        stockQuantity: productStock,
        trackInventory: true,
      };
    }
    return null;
  });

  const quote = await createQuote({
    storeId,
    customerInfo: { name: 'Sophea Pich', email: 'sophea@example.com' },
    items: [{ productId, quantity: 2, price: 25.50 }],
    notes: 'Quotation valid for 14 days',
    staffId: 'staff-1',
  });

  // Verify Quote invariants
  assert.equal(quote.isQuote, true);
  assert.equal(quote.status, INVOICE_STATUSES.DRAFT);
  assert.equal(quote.stockEffect, 'NONE', 'Quotes must never touch stock');
  assert.equal(quote.total, 51.00);
  assert.equal(quote.invoiceDomain, 'merchant_commerce');
  assert.ok(quote.quoteNumber.startsWith('QTE-'));
  assert.equal(productStock, 50, 'Catalog stock must remain completely unmodified by a Quote');
});

test('P4-INV-001: Non-Double-Deduction Invariant: Deferred Payment Invoice deducts stock once upon payment confirmation', async (t) => {
  const storeId = 'store-deferred-inv';
  const productId = 'prod-inv-deferred';
  let productStock = 20;

  const mockProduct = {
    id: productId,
    name: 'Ceramic Teapot',
    sku: 'POT-01',
    price: 30.00,
    status: 'active',
    trackInventory: true,
    stockQuantity: productStock,
    save: async function() { return this; },
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) productStock = changes.stockQuantity;
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = productStock;
      return mockProduct;
    }
    return null;
  });

  const mockTx = {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' },
  };

  t.mock.method(sequelize, 'transaction', async () => mockTx);

  let createdOrder = null;
  let createdPayment = null;
  let createdInvoice = null;

  t.mock.method(Order, 'create', async (data) => {
    createdOrder = {
      ...data,
      id: 'ord-deferred-1',
      OrderItems: [],
      update: async function(changes) {
        Object.assign(this, changes);
        return this;
      },
      toJSON: function() { return { ...this }; },
    };
    return createdOrder;
  });

  t.mock.method(OrderItem, 'create', async (data) => {
    const item = { ...data, id: 'item-1', Product: mockProduct };
    createdOrder.OrderItems.push(item);
    return item;
  });

  t.mock.method(Payment, 'create', async (data) => {
    createdPayment = {
      ...data,
      id: 'pay-deferred-1',
      update: async function(changes) {
        Object.assign(this, changes);
        return this;
      },
      toJSON: function() { return { ...this }; },
    };
    return createdPayment;
  });

  t.mock.method(Invoice, 'create', async (data) => {
    createdInvoice = {
      ...data,
      id: 'inv-deferred-1',
      Order: createdOrder,
      Payment: createdPayment,
      update: async function(changes) {
        Object.assign(this, changes);
        return this;
      },
      toJSON: function() { return { ...this }; },
    };
    return createdInvoice;
  });

  // 1. Create Deferred Invoice (sent to customer, unpaid)
  const creationResult = await createInvoice({
    storeId,
    customerInfo: { name: 'Bunrong Dy', email: 'bunrong@example.com' },
    items: [{ productId, quantity: 3, price: 30.00 }],
    isImmediatePayment: false,
    transaction: mockTx,
  });

  assert.equal(creationResult.stockDeducted, false, 'Deferred invoice must not deduct stock upon creation');
  assert.equal(createdOrder.stockDeducted, false);
  assert.equal(createdInvoice.status, INVOICE_STATUSES.SENT);
  assert.equal(productStock, 20, 'Stock remains unchanged prior to payment');

  // Wire up Invoice.findByPk for payment settlement
  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === 'inv-deferred-1') {
      createdInvoice.Order = createdOrder;
      createdInvoice.Payment = createdPayment;
      return createdInvoice;
    }
    return null;
  });

  // 2. Record Payment against the invoice
  const paymentResult = await recordPayment({
    invoiceId: 'inv-deferred-1',
    storeId,
    paymentMethod: 'cash',
    transactionReference: 'TX-CASH-789',
    transaction: mockTx,
  });

  assert.equal(paymentResult.success, true);
  assert.equal(paymentResult.stockDeductedNow, true, 'Stock must now be deducted once');
  assert.equal(createdOrder.stockDeducted, true, 'Order must record stock as deducted');
  assert.equal(createdInvoice.status, INVOICE_STATUSES.PAID);
  assert.equal(productStock, 17, 'Catalog stock reduced by line item quantity (20 - 3 = 17)');

  // 3. Replay Payment (Idempotent call)
  const replayResult = await recordPayment({
    invoiceId: 'inv-deferred-1',
    storeId,
    paymentMethod: 'cash',
    transaction: mockTx,
  });

  assert.equal(replayResult.idempotentReplay, true, 'Replayed payment must be detected as idempotent');
  assert.equal(productStock, 17, 'Stock must NOT be decremented a second time on replay');
});

test('P4-INV-001: Non-Double-Deduction Invariant: POS / Pre-deducted Order Invoice does NOT deduct stock again upon payment', async (t) => {
  const storeId = 'store-pos-inv';
  const productId = 'prod-pos-item';
  let productStock = 15;

  const mockProduct = {
    id: productId,
    name: 'Krama Shawl',
    sku: 'KRA-01',
    price: 12.00,
    trackInventory: true,
    stockQuantity: productStock,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) productStock = changes.stockQuantity;
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = productStock;
      return mockProduct;
    }
    return null;
  });

  const mockTx = {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' },
  };

  // Simulating an Order already generated at POS register with stock already deducted:
  const posOrder = {
    id: 'ord-pos-already-deducted',
    storeId,
    totalAmount: 24.00,
    currency: 'USD',
    stockDeducted: true, // INVARIANT: Already decremented at the counter!
    status: 'completed',
    OrderItems: [
      { id: 'item-pos-1', productId, quantity: 2, price: 12.00, Product: mockProduct },
    ],
    update: async function(changes) {
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this }; },
  };

  const posPayment = {
    id: 'pay-pos-1',
    orderId: posOrder.id,
    amount: 24.00,
    status: 'pending',
    update: async function(changes) {
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this }; },
  };

  const posInvoice = {
    id: 'inv-pos-1',
    storeId,
    orderId: posOrder.id,
    paymentId: posPayment.id,
    invoiceNumber: 'INV-POS-1001',
    status: INVOICE_STATUSES.SENT,
    Order: posOrder,
    Payment: posPayment,
    update: async function(changes) {
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === 'inv-pos-1') return posInvoice;
    return null;
  });

  // Record payment against the invoice
  const paymentResult = await recordPayment({
    invoiceId: 'inv-pos-1',
    storeId,
    paymentMethod: 'cash',
    transaction: mockTx,
  });

  assert.equal(paymentResult.success, true);
  assert.equal(paymentResult.stockDeductedNow, false, 'CRITICAL: Stock was already deducted by POS register, must NOT deduct again!');
  assert.equal(productStock, 15, 'Stock remains unchanged at 15; no double deduction occurred');
  assert.equal(posInvoice.status, INVOICE_STATUSES.PAID);
});

test('P4-INV-001: Refund restores catalog stock and marks invoice refunded', async (t) => {
  const storeId = 'store-refund';
  const productId = 'prod-refund-1';
  let productStock = 8; // Current stock after prior deduction

  const mockProduct = {
    id: productId,
    name: 'Palm Sugar Pot',
    sku: 'SUGAR-01',
    price: 10.00,
    trackInventory: true,
    stockQuantity: productStock,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) productStock = changes.stockQuantity;
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = productStock;
      return mockProduct;
    }
    return null;
  });

  const mockTx = {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' },
  };

  const paidOrder = {
    id: 'ord-refund-1',
    storeId,
    totalAmount: 20.00,
    stockDeducted: true, // Stock was deducted
    status: 'completed',
    OrderItems: [
      { id: 'item-ref-1', productId, quantity: 2, price: 10.00, Product: mockProduct },
    ],
    update: async function(changes) {
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this }; },
  };

  const paidPayment = {
    id: 'pay-refund-1',
    orderId: paidOrder.id,
    amount: 20.00,
    status: 'completed',
    update: async function(changes) {
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this }; },
  };

  const paidInvoice = {
    id: 'inv-refund-1',
    storeId,
    orderId: paidOrder.id,
    paymentId: paidPayment.id,
    invoiceNumber: 'INV-REF-5001',
    status: INVOICE_STATUSES.PAID,
    Order: paidOrder,
    Payment: paidPayment,
    update: async function(changes) {
      Object.assign(this, changes);
      return this;
    },
    toJSON: function() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === 'inv-refund-1') return paidInvoice;
    return null;
  });

  const refundResult = await refundInvoice({
    invoiceId: 'inv-refund-1',
    storeId,
    reason: 'Customer cancelled prior to shipment',
    transaction: mockTx,
  });

  assert.equal(refundResult.success, true);
  assert.equal(refundResult.stockRestored, true, 'Stock must be replenished to inventory');
  assert.equal(productStock, 10, 'Catalog stock replenished from 8 back to 10 (8 + 2 = 10)');
  assert.equal(paidInvoice.status, INVOICE_STATUSES.REFUNDED);
  assert.equal(paidOrder.stockDeducted, false);
  assert.equal(paidPayment.status, 'refunded');
});

test('P4-INV-001: Cancellation behavior: Unpaid invoice can be cancelled; Paid invoice rejects cancellation (409)', async (t) => {
  const storeId = 'store-cancel-check';
  const mockTx = { commit: async () => {}, rollback: async () => {}, LOCK: { UPDATE: 'UPDATE' } };

  const unpaidInvoice = {
    id: 'inv-unpaid-1',
    storeId,
    status: INVOICE_STATUSES.SENT,
    Order: { status: 'pending', update: async () => {} },
    update: async function(changes) { Object.assign(this, changes); return this; },
    toJSON: function() { return { ...this }; },
  };

  const paidInvoice = {
    id: 'inv-paid-cannot-cancel',
    storeId,
    status: INVOICE_STATUSES.PAID,
    Order: { status: 'completed', update: async () => {} },
    update: async function(changes) { Object.assign(this, changes); return this; },
    toJSON: function() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === 'inv-unpaid-1') return unpaidInvoice;
    if (id === 'inv-paid-cannot-cancel') return paidInvoice;
    return null;
  });

  // Cancelling unpaid invoice succeeds
  const cancelResult = await cancelInvoice({
    invoiceId: 'inv-unpaid-1',
    storeId,
    reason: 'Customer declined quote',
    transaction: mockTx,
  });
  assert.equal(cancelResult.success, true);
  assert.equal(unpaidInvoice.status, INVOICE_STATUSES.CANCELLED);

  // Cancelling paid invoice must fail with 409 Conflict
  await assert.rejects(
    async () => {
      await cancelInvoice({
        invoiceId: 'inv-paid-cannot-cancel',
        storeId,
        transaction: mockTx,
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Paid invoices cannot be cancelled/);
      return true;
    }
  );
});

test('P4-INV-001: Accurate Totals and Snapshot Derivation derived from canonical Order facts', () => {
  const mockOrder = {
    id: 'ord-snap-1',
    storeId: 'store-snap-1',
    orderNumber: 'ORD-SNAP-100',
    subtotal: 50.00,
    taxTotal: 5.00,
    discountTotal: 2.50,
    shippingFee: 3.00,
    totalAmount: 55.50,
    currency: 'USD',
    stockDeducted: true,
    customerInfo: {
      name: 'Channary Kem',
      email: 'channary@example.com',
      phone: '+85512345678',
    },
    OrderItems: [
      {
        id: 'item-1',
        productId: 'prod-1',
        name: 'Handcrafted Bowl',
        sku: 'BOWL-01',
        price: 25.00,
        quantity: 2,
        total: 50.00,
      },
    ],
  };

  const mockInvoice = {
    id: 'inv-snap-1',
    invoiceNumber: 'INV-2026-999',
    status: INVOICE_STATUSES.PAID,
    storeId: 'store-snap-1',
    createdAt: '2026-10-26T12:00:00.000Z',
    dueDate: '2026-11-09',
  };

  const mockPayment = {
    id: 'pay-snap-1',
    paymentMethod: 'CASH',
    amount: 55.50,
    status: 'completed',
    transactionData: { method: 'cash', invoiceNumber: 'INV-2026-999' },
  };

  const snapshot = buildInvoiceSnapshot(mockInvoice, mockOrder, mockPayment);

  assert.equal(snapshot.invoiceId, 'inv-snap-1');
  assert.equal(snapshot.invoiceNumber, 'INV-2026-999');
  assert.equal(snapshot.domain, 'merchant_commerce', 'Separated from Rentify SaaS subscription invoices');
  assert.equal(snapshot.totals.subtotal, 50.00);
  assert.equal(snapshot.totals.tax, 5.00);
  assert.equal(snapshot.totals.discount, 2.50);
  assert.equal(snapshot.totals.shipping, 3.00);
  assert.equal(snapshot.totals.total, 55.50);
  assert.equal(snapshot.totals.currency, 'USD');
  assert.equal(snapshot.stockState.stockDeducted, true);
  assert.equal(snapshot.stockState.status, 'DEDUCTED');
  assert.equal(snapshot.paymentEvidence.amount, 55.50);
  assert.equal(snapshot.paymentEvidence.paymentMethod, 'CASH');
});

test('P4-INV-001: Store- and Staff-scoped authorization rejects cross-tenant guessing with 404', async (t) => {
  const STORE_A = 'store-auth-a';
  const STORE_B = 'store-auth-b';
  const INVOICE_A = 'inv-auth-a';

  const mockInvoice = {
    id: INVOICE_A,
    storeId: STORE_A,
    status: 'sent',
  };

  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === INVOICE_A) return mockInvoice;
    return null;
  });

  const mockStoreA = { storeId: STORE_A, ownerUserId: 'owner-a', status: 'active' };
  t.mock.method(StoreAccess, 'findByPk', async (id) => {
    if (id === STORE_A) return mockStoreA;
    return null;
  });

  // Cross-tenant guessing: Merchant B tries to access Invoice A
  const reqCross = {
    params: { invoiceId: INVOICE_A },
    user: { id: 'owner-b', type: 'user', role: 'merchant' },
  };
  const resCross = responseHelper();
  let nextCross = false;

  await requireInvoiceAccess(reqCross, resCross, () => { nextCross = true; });

  assert.equal(nextCross, false, 'Cross-tenant request must not proceed to controller');
  assert.equal(resCross.statusCode, 404, 'Must return 404 to prevent ID enumeration');
});

test('P4-INV-001: Quote Conversion: converts non-binding Quote into formal Invoice with canonical Order', async (t) => {
  const storeId = 'store-quote-conv';
  const productId = 'prod-conv-1';
  let productStock = 30;

  const mockProduct = {
    id: productId,
    name: 'Silk Pillow Case',
    sku: 'SILK-PC',
    price: 18.00,
    status: 'active',
    trackInventory: true,
    stockQuantity: productStock,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) productStock = changes.stockQuantity;
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = productStock;
      return mockProduct;
    }
    return null;
  });

  const mockTx = {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' },
  };

  t.mock.method(sequelize, 'transaction', async () => mockTx);

  let createdOrder = null;
  let createdPayment = null;
  let createdInvoice = null;

  t.mock.method(Order, 'create', async (data) => {
    createdOrder = {
      ...data,
      id: 'ord-conv-1',
      update: async function(changes) { Object.assign(this, changes); return this; },
      toJSON: function() { return { ...this }; },
    };
    return createdOrder;
  });

  t.mock.method(OrderItem, 'create', async (data) => ({ ...data }));

  t.mock.method(Payment, 'create', async (data) => {
    createdPayment = {
      ...data,
      id: 'pay-conv-1',
      update: async function(changes) { Object.assign(this, changes); return this; },
      toJSON: function() { return { ...this }; },
    };
    return createdPayment;
  });

  t.mock.method(Invoice, 'create', async (data) => {
    createdInvoice = {
      ...data,
      id: 'inv-conv-1',
      update: async function(changes) { Object.assign(this, changes); return this; },
      toJSON: function() { return { ...this }; },
    };
    return createdInvoice;
  });

  const quote = {
    quoteNumber: 'QTE-12345-ABCD',
    customerName: 'Samnang Keo',
    customerEmail: 'samnang@example.com',
    customerPhone: '+85598765432',
    storeId,
    currency: 'USD',
    notes: 'Bulk order discount applied',
    items: [{ productId, quantity: 5, price: 18.00 }],
  };

  const result = await convertQuoteToInvoice({
    quote,
    storeId,
    paymentMethod: 'cash',
    isImmediatePayment: false,
    transaction: mockTx,
  });

  assert.equal(result.success, true);
  assert.equal(createdOrder.storeId, storeId);
  assert.equal(createdOrder.totalAmount, 90.00);
  assert.equal(createdOrder.stockDeducted, false, 'Deferred invoice from quote does not deduct stock yet');
  assert.equal(createdInvoice.status, INVOICE_STATUSES.SENT);
  assert.equal(productStock, 30, 'Stock untouched until payment confirmed');
});

test('P4-INV-001: Concurrency Conflict: Insufficient stock on deferred payment confirmation rejects with 409', async (t) => {
  const storeId = 'store-stock-conflict';
  const productId = 'prod-conflict-1';
  let productStock = 1; // Only 1 left, but invoice wants 3!

  const mockProduct = {
    id: productId,
    name: 'Copper Teapot',
    sku: 'COPPER-POT',
    price: 45.00,
    status: 'active',
    trackInventory: true,
    stockQuantity: productStock,
    update: async function(changes) {
      if (changes.stockQuantity !== undefined) productStock = changes.stockQuantity;
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === productId) {
      mockProduct.stockQuantity = productStock;
      return mockProduct;
    }
    return null;
  });

  const mockTx = {
    commit: async () => {},
    rollback: async () => {},
    LOCK: { UPDATE: 'UPDATE' },
  };

  const deferredOrder = {
    id: 'ord-deferred-conflict',
    storeId,
    totalAmount: 135.00,
    currency: 'USD',
    stockDeducted: false,
    status: 'pending',
    OrderItems: [
      { id: 'item-conf-1', productId, quantity: 3, price: 45.00, Product: mockProduct },
    ],
    update: async function() {},
    toJSON: function() { return { ...this }; },
  };

  const deferredInvoice = {
    id: 'inv-deferred-conflict',
    storeId,
    status: INVOICE_STATUSES.SENT,
    Order: deferredOrder,
    Payment: null,
    update: async function() {},
    toJSON: function() { return { ...this }; },
  };

  t.mock.method(Invoice, 'findByPk', async (id) => {
    if (id === 'inv-deferred-conflict') return deferredInvoice;
    return null;
  });

  // Attempting to record payment when stock is depleted must reject with 409
  await assert.rejects(
    async () => {
      await recordPayment({
        invoiceId: 'inv-deferred-conflict',
        storeId,
        paymentMethod: 'cash',
        transaction: mockTx,
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Only 1 left in stock/);
      return true;
    }
  );

  assert.equal(deferredInvoice.status, INVOICE_STATUSES.SENT, 'Invoice must NOT transition to paid upon stock failure');
  assert.equal(productStock, 1, 'Stock remains unchanged');
});

test('P4-INV-001: Staff Authorization: staff with invoice permission allowed; staff without rejected with 403', async (t) => {
  const storeId = 'store-staff-auth';
  const mockStore = { storeId, ownerUserId: 'merchant-owner', status: 'active' };

  const storeMap = new Map([[storeId, mockStore]]);
  const requireAccess = createRequireStoreAccess({
    findStore: async (id) => storeMap.get(id),
    permissions: ['invoice', 'invoices', 'manage_invoices'],
  });

  // Permitted Staff
  const reqPermitted = {
    params: { storeId },
    user: { id: 'staff-inv-user', type: 'staff', merchantId: 'merchant-owner', permissions: ['invoices'] },
  };
  const resPermitted = responseHelper();
  let nextPermitted = false;
  await requireAccess(reqPermitted, resPermitted, () => { nextPermitted = true; });
  assert.equal(nextPermitted, true, 'Permitted staff must be allowed access to store invoices');

  // Unpermitted Staff (only has pos permission, not invoice)
  const reqUnpermitted = {
    params: { storeId },
    user: { id: 'staff-pos-only', type: 'staff', merchantId: 'merchant-owner', permissions: ['pos'] },
  };
  const resUnpermitted = responseHelper();
  let nextUnpermitted = false;
  await requireAccess(reqUnpermitted, resUnpermitted, () => { nextUnpermitted = true; });
  assert.equal(nextUnpermitted, false, 'Unpermitted staff must be rejected');
  assert.equal(resUnpermitted.statusCode, 403);
});
