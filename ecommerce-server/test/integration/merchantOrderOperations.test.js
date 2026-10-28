const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../../config/db');
const { Order, OrderItem, Payment, Invoice, ShippingDetail, OrderEvent, StoreAccess } = require('../../models');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const operations = require('../../modules/checkout/orderOperationsService');
const marketplaceOrders = require('../../modules/checkout/marketplaceOrderService');

const STORE = '11111111-1111-4111-8111-111111111111';
const OTHER_STORE = '22222222-2222-4222-8222-222222222222';
const ORDER = '33333333-3333-4333-8333-333333333333';
const OWNER = '44444444-4444-4444-8444-444444444444';
const ACTOR = '55555555-5555-4555-8555-555555555555';

function orderFixture(overrides = {}) {
  return {
    id: ORDER, orderNumber: 'RNT-1001', storeId: STORE, websiteId: null,
    buyerId: '66666666-6666-4666-8666-666666666666', checkoutKey: 'checkout_key_1001',
    orderType: 'online', salesChannel: 'marketplace', status: 'pending', deliveryStatus: 'pending',
    subtotal: '20.00', discountTotal: '0.00', taxTotal: '0.00', shippingFee: '2.00', totalAmount: '22.00',
    currency: 'USD', version: 3, customerInfo: { name: 'Sokha', email: 'sokha@example.com', phone: '012345678' },
    shippingInfo: { province: 'Phnom Penh', district: 'Chamkarmon', street: 'Street 123' },
    createdAt: new Date('2026-10-01T00:00:00.000Z'), updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides,
  };
}

function paymentFixture(overrides = {}) {
  return { paymentMethod: 'COD', status: 'pending', amount: '22.00', collectedAmount: '0.00', refundedAmount: '0.00', version: 0, ...overrides };
}

test('P4-MER-005: projections label every channel and preserve price/payment snapshots', () => {
  const item = { id: 'line-1', productId: 'product-1', name: 'Krama', sku: 'KRA-1', quantity: 2, price: '10.00', total: '20.00', currency: 'USD' };
  const cases = [
    [orderFixture(), null, 'marketplace'],
    [orderFixture({ salesChannel: 'storefront', websiteId: 'site-1' }), null, 'storefront'],
    [orderFixture({ orderType: 'pos', salesChannel: 'pos' }), { id: 'invoice-1' }, 'pos'],
    [orderFixture({ orderType: 'manual', salesChannel: 'storefront' }), { id: 'invoice-2', invoiceNumber: 'INV-2' }, 'invoice'],
  ];
  for (const [order, invoice, channel] of cases) {
    const view = operations.orderProjection(order, { items: [item], payment: paymentFixture(), invoice, events: [] });
    assert.equal(view.channel, channel);
    assert.equal(view.items[0].unitPrice, '10.00');
    assert.equal(view.items[0].lineTotal, '20.00');
    assert.equal(view.payment.amountDue, '22.00');
  }
});

test('P4-MER-005: completed orders minimize buyer contact and delivery details', () => {
  const view = operations.orderProjection(orderFixture({ status: 'completed', deliveryStatus: 'delivered' }), {
    payment: paymentFixture({ status: 'paid', collectedAmount: '22.00' }), items: [], events: [],
  });
  assert.equal(view.buyer.email, 's****@example.com');
  assert.equal(view.buyer.phone, '•••• 5678');
  assert.equal(view.delivery.street, null);
  assert.equal(view.delivery.minimized, true);
  assert.equal(view.payment.amountDue, '0.00');
});

test('P4-MER-005: reports are visible without changing payment or refund facts', () => {
  const payment = paymentFixture({ status: 'paid', collectedAmount: '22.00', refundedAmount: '0.00' });
  const view = operations.orderProjection(orderFixture({ status: 'fulfilled', deliveryStatus: 'delivered' }), {
    payment, items: [], events: [{ id: 'event-1', type: 'complaint', createdAt: new Date(), details: { reason: 'Damaged box', evidence: [{ id: 'file-1' }] } }],
  });
  assert.equal(view.reports.length, 1);
  assert.equal(view.reports[0].details.evidenceCount, 1);
  assert.equal(view.payment.status, 'paid');
  assert.equal(view.payment.refundedAmount, '0.00');
});

test('P4-MER-005: server offers only legal canonical actions', () => {
  assert.deepEqual(operations.allowedActions(orderFixture(), paymentFixture()).map((item) => item.code), ['delivered', 'delivery_failed']);
  assert.deepEqual(operations.allowedActions(orderFixture({ deliveryStatus: 'delivered', status: 'fulfilled' }), paymentFixture()).map((item) => item.code), ['collect_cod']);
  assert.deepEqual(operations.allowedActions(orderFixture({ orderType: 'pos', salesChannel: 'pos', status: 'completed', deliveryStatus: 'delivered' }), paymentFixture({ status: 'paid' })), []);
});

test('P4-MER-005: Store access permits owner/permitted staff and denies unpermitted or unrelated actors', async (t) => {
  t.mock.method(StoreAccess, 'findByPk', async (id) => id === STORE ? ({ storeId: STORE, ownerUserId: OWNER, websiteId: null, status: 'active' }) : null);
  const actors = [
    [{ id: OWNER, type: 'user', role: 'merchant' }, true, 200],
    [{ id: ACTOR, type: 'staff', merchantId: OWNER, permissions: ['orders'] }, true, 200],
    [{ id: ACTOR, type: 'staff', merchantId: OWNER, permissions: ['products'] }, false, 403],
    [{ id: ACTOR, type: 'user', role: 'merchant' }, false, 403],
  ];
  for (const [user, expected, expectedStatus] of actors) {
    const req = { params: { storeId: STORE }, user };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() { return this; } };
    let called = false;
    await createRequireStoreAccess({ permissions: ['orders', 'manage_orders'] })(req, res, () => { called = true; });
    assert.equal(called, expected);
    assert.equal(res.statusCode, expectedStatus);
  }
});

test('P4-MER-005: unrelated Store order is not returned', async (t) => {
  t.mock.method(Order, 'findOne', async ({ where }) => where.storeId === OTHER_STORE ? null : orderFixture());
  await assert.rejects(operations.getStoreOrder(OTHER_STORE, ORDER), (error) => error.statusCode === 404);
});

test('P4-MER-005: legal transition is idempotent and stale action conflicts', async (t) => {
  const order = orderFixture();
  order.update = async (changes) => { Object.assign(order, changes); order.version += 1; return order; };
  const payment = paymentFixture();
  let savedEvent = null;
  t.mock.method(sequelize, 'transaction', async (work) => work({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(Order, 'findOne', async ({ where }) => where.storeId === STORE ? order : null);
  t.mock.method(OrderItem, 'findAll', async () => []);
  t.mock.method(Payment, 'findOne', async () => payment);
  t.mock.method(OrderEvent, 'findOne', async ({ where }) => savedEvent?.eventKey === where.eventKey ? savedEvent : null);
  t.mock.method(OrderEvent, 'create', async (data) => { savedEvent = { id: 'event-1', createdAt: new Date(), ...data }; return savedEvent; });

  const input = { storeId: STORE, orderId: ORDER, actorId: ACTOR, eventKey: 'delivery_action_1001', action: 'delivered', details: { expectedVersion: 3 } };
  await marketplaceOrders.merchantAction(input);
  assert.equal(order.deliveryStatus, 'delivered');
  assert.equal(savedEvent.type, 'delivered');
  await marketplaceOrders.merchantAction(input);
  assert.equal(savedEvent.id, 'event-1');

  await assert.rejects(marketplaceOrders.merchantAction({ ...input, eventKey: 'delivery_action_1002', action: 'collect_cod', details: { amount: '22.00', expectedVersion: 3 } }), (error) => error.statusCode === 409);
});
