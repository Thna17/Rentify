const { Order, OrderItem, Payment } = require('../../../models');
const { fail, uuid } = require('./errors');
const payway = require('./paywayGateway');

/**
 * Paying a marketplace order with ABA PayWay (test-only, PAYWAY_ENABLED=true).
 * Ported from KhmerCraft payments.service. The rule that matters: a payment is never marked
 * paid from the browser returning or from a webhook's own claim — resolvePayment asks ABA first.
 * Paying does not advance the order status; the seller still fulfils it like any other order.
 */

const METHOD = 'ABA_PAYWAY';
const marketplaceUrl = () => (process.env.MARKETPLACE_URL || 'http://localhost:4500').replace(/\/+$/, '');

async function loadBuyerOrder(buyerId, orderId) {
  uuid(buyerId, 'buyer');
  uuid(orderId, 'order');
  const order = await Order.findOne({ where: { id: orderId, buyerId } });
  if (!order) fail('Order not found', 404, 'ORDER_NOT_FOUND');
  const payment = await Payment.findOne({ where: { orderId: order.id } });
  if (!payment || payment.paymentMethod !== METHOD) {
    fail('This order was not placed with ABA PayWay', 400, 'WRONG_PAYMENT_METHOD');
  }
  return { order, payment };
}

/** Opens a PayWay transaction for the order and returns the KHQR. Each call mints a new tran_id. */
async function createCheckout(buyerId, orderId) {
  const { order, payment } = await loadBuyerOrder(buyerId, orderId);
  if (payment.status === 'paid') fail('This order is already paid', 409, 'ALREADY_PAID');
  if (order.status === 'cancelled') fail('This order was cancelled', 409, 'ORDER_CANCELLED');

  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  const tranId = payway.generateTranId();
  const reference = order.orderNumber || order.id;
  const transaction = await payway.createTransaction({
    tranId,
    amount: Number(order.totalAmount),
    shipping: Number(order.shippingFee || 0),
    items: items.map((item) => ({ name: item.name, quantity: item.quantity, price: Number(item.price) })),
    firstName: order.customerInfo?.name || 'Buyer',
    phone: order.customerInfo?.phone || '',
    returnParams: reference,
    successUrl: `${marketplaceUrl()}/checkout/aba/${order.id}?returned=1`,
    cancelUrl: `${marketplaceUrl()}/orders/${order.id}?payment=cancelled`,
  });

  const history = Array.isArray(payment.transactionData?.attempts) ? payment.transactionData.attempts : [];
  await payment.update({
    transactionId: tranId,
    transactionData: {
      gateway: 'aba_payway',
      attempts: [...history, { tranId, createdAt: new Date().toISOString(), expiresAt: transaction.expiresAt }],
    },
  });

  return { ...transaction, orderId: order.id, orderNumber: order.orderNumber || null };
}

/**
 * The single place a PayWay result is written, so the webhook and the page's polling agree.
 * Only ABA's own check-transaction answer is trusted.
 */
async function resolvePayment(order, payment) {
  if (payment.status === 'paid' || !payment.transactionId) return payment;
  const result = await payway.checkTransaction(payment.transactionId, { amount: payment.amount, currency: payment.currency || 'USD' });
  if (result === 'PENDING') return payment;

  const next = { PAID: 'paid', FAILED: 'failed', REFUNDED: 'refunded' }[result];
  if (!next || next === payment.status) return payment;

  const now = new Date();
  const changes = { status: next };
  if (next === 'paid') Object.assign(changes, { collectedAmount: payment.amount, collectedAt: now, paidAt: now });
  if (next === 'refunded') Object.assign(changes, { refundedAmount: payment.amount });
  await payment.update(changes);

  // Payment's afterUpdate hook records the paid usage event; OrderEvent stays owned by the orders module
  return payment;
}

/** What the payment page polls while the buyer is in the ABA app (webhooks can't reach localhost). */
async function getStatus(buyerId, orderId) {
  const { order, payment } = await loadBuyerOrder(buyerId, orderId);
  await resolvePayment(order, payment);
  return {
    orderId: order.id,
    orderNumber: order.orderNumber || null,
    paymentStatus: payment.status,
    paid: payment.status === 'paid',
    amount: String(payment.amount),
    currency: payment.currency || 'USD',
  };
}

/**
 * Local mock only: stands in for the buyer paying in the ABA app. The paid status is still
 * written by resolvePayment, through the same check the real gateway goes through.
 */
async function approveMockPayment(buyerId, orderId) {
  const { payment } = await loadBuyerOrder(buyerId, orderId);
  if (!payment.transactionId) fail('Open the payment QR first', 409, 'PAYWAY_MOCK_UNKNOWN');
  payway.approveMockTransaction(payment.transactionId);
  return getStatus(buyerId, orderId);
}

/** PayWay's webhook: treated as "go check now", never as the result itself. */
async function handleCallback(payload = {}) {
  const tranId = String(payload.tran_id || '');
  if (!tranId) fail('Missing tran_id', 400, 'VALIDATION_ERROR');
  const payment = await Payment.findOne({ where: { transactionId: tranId, paymentMethod: METHOD } });
  if (!payment) {
    // Acknowledge anyway: PayWay retries non-2xx forever and that changes nothing
    console.warn('[payway] callback for unknown tran_id:', tranId);
    return;
  }
  const order = await Order.findByPk(payment.orderId);
  if (order) await resolvePayment(order, payment);
}

module.exports = { METHOD, createCheckout, getStatus, approveMockPayment, handleCallback };
