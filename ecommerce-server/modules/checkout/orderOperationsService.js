const { Op } = require('sequelize');
const { Order, OrderItem, Payment, Invoice, ShippingDetail, OrderEvent } = require('../../models');
const { fail, uuid, normalizePaymentMethod, normalizePaymentStatus } = require('./marketplaceRules');

const CHANNELS = new Set(['marketplace', 'storefront', 'pos', 'invoice']);
const STATUSES = new Set([
  'pending', 'confirmed', 'processing', 'cancelled', 'completed', 'fulfilled',
  'refunded', 'preparing', 'ready_for_pickup', 'out_for_delivery',
]);
const ACTIVE_DELIVERY_STATUSES = new Set(['pending', 'retrying']);

function maskEmail(value) {
  if (!value || typeof value !== 'string' || !value.includes('@')) return null;
  const [local, domain] = value.trim().split('@');
  return `${local.slice(0, 1)}${'*'.repeat(Math.min(Math.max(local.length - 1, 2), 6))}@${domain}`;
}

function maskPhone(value) {
  if (!value) return null;
  const text = String(value).trim();
  const suffix = text.replace(/\D/g, '').slice(-4);
  return suffix ? `•••• ${suffix}` : null;
}

function channelFor(order, invoice) {
  if (order.orderType === 'pos' || order.salesChannel === 'pos') return 'pos';
  if (order.orderType === 'manual' || order.salesChannel === 'invoice') return 'invoice';
  if (order.salesChannel === 'marketplace') return 'marketplace';
  if (order.salesChannel === 'storefront' || order.websiteId) return 'storefront';
  return invoice ? 'invoice' : 'storefront';
}

function paymentFacts(order, payment) {
  if (!payment) {
    return { method: null, status: 'not_recorded', codState: 'not_applicable', amount: '0.00', amountDue: '0.00', collectedAmount: '0.00', refundedAmount: '0.00' };
  }
  const amount = Number(payment.amount || order.totalAmount || 0);
  const collected = Number(payment.collectedAmount || 0);
  const refunded = Number(payment.refundedAmount || 0);
  const normMethod = normalizePaymentMethod(payment.paymentMethod);
  const normStatus = normalizePaymentStatus(payment.status);
  const isCod = normMethod === 'COD';
  const settled = ['completed', 'paid', 'refunded'].includes(payment.status);
  const due = settled ? 0 : Math.max(0, amount - collected);
  let codState = 'not_applicable';
  if (isCod) {
    if (payment.status === 'refunded') codState = 'refunded';
    else if (refunded > 0) codState = 'partially_refunded';
    else if (collected > 0 || ['paid', 'completed'].includes(payment.status)) codState = 'collected';
    else codState = 'due_on_delivery';
  }
  return {
    method: normMethod, status: normStatus, codState,
    amount: amount.toFixed(2), amountDue: due.toFixed(2),
    collectedAmount: collected.toFixed(2), refundedAmount: refunded.toFixed(2),
  };
}

function allowedActions(order, payment) {
  const actions = [];
  const method = String(payment?.paymentMethod || '').toUpperCase();
  const supportedDelivery = ['marketplace', 'storefront'].includes(order.salesChannel) &&
    order.buyerId && order.checkoutKey && method === 'COD';
  if (!supportedDelivery) return actions;
  if (ACTIVE_DELIVERY_STATUSES.has(order.deliveryStatus)) {
    actions.push({ code: 'delivered', risk: 'normal', requiresReason: false, requiresEvidence: false });
    actions.push({ code: 'delivery_failed', risk: 'high', requiresReason: true, requiresEvidence: false });
  }
  if (order.deliveryStatus === 'failed' && order.status !== 'cancelled') {
    actions.push({ code: 'retry_delivery', risk: 'high', requiresReason: false, requiresEvidence: true });
  }
  if (order.deliveryStatus === 'delivered' && payment.status === 'pending') {
    actions.push({ code: 'collect_cod', risk: 'high', requiresReason: false, requiresEvidence: true });
  }
  if (payment.status === 'paid' && Number(payment.collectedAmount || 0) > Number(payment.refundedAmount || 0)) {
    actions.push({ code: 'confirm_refund', risk: 'high', requiresReason: true, requiresEvidence: true });
  }
  return actions;
}

function eventView(event) {
  const details = event.details || {};
  const evidence = Array.isArray(details.evidence) ? details.evidence : [];
  return {
    id: event.id, type: event.type, amount: event.amount, createdAt: event.createdAt,
    details: {
      reason: details.reason || null,
      resolution: details.resolution || null,
      method: details.method || null,
      confirmation: details.confirmation || null,
      evidenceCount: evidence.length,
    },
  };
}

function orderProjection(order, related = {}) {
  const items = related.items || order.OrderItems || [];
  const payment = related.payment || order.Payment || null;
  const invoice = related.invoice || order.Invoice || null;
  const shipping = related.shipping || order.ShippingDetail || null;
  const events = related.events || order.OrderEvents || [];
  const channel = channelFor(order, invoice);
  const activeDelivery = ['pending', 'confirmed', 'processing', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status) &&
    order.deliveryStatus !== 'delivered';
  const customer = order.customerInfo || {};
  const shippingSnapshot = shipping || order.shippingInfo || {};
  const phone = customer.phone || customer.phoneNumber || shippingSnapshot.phone;
  const reports = events.filter((event) => ['return_requested', 'complaint', 'merchant_report'].includes(event.type));
  const createdEvent = {
    id: `${order.id}:created`, type: 'order_created', amount: null,
    createdAt: order.createdAt, details: {},
  };
  const timeline = events.some((event) => event.type === 'order_created') ? events : [createdEvent, ...events];
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    version: order.version,
    channel,
    status: order.status,
    fulfillmentStatus: order.deliveryStatus || order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    currency: order.currency || 'USD',
    totals: {
      subtotal: String(order.subtotal || '0.00'), discount: String(order.discountTotal || '0.00'),
      tax: String(order.taxTotal || '0.00'), shipping: String(order.shippingFee || '0.00'),
      total: String(order.totalAmount || '0.00'),
    },
    paymentMethod: paymentFacts(order, payment).method,
    paymentStatus: paymentFacts(order, payment).status,
    payment: paymentFacts(order, payment),
    buyer: {
      name: customer.name || shippingSnapshot.name || (channel === 'pos' ? 'Walk-in customer' : 'Customer'),
      email: maskEmail(customer.email || shippingSnapshot.email),
      phone: activeDelivery ? (phone || null) : maskPhone(phone),
    },
    delivery: {
      province: shippingSnapshot.province || null,
      district: shippingSnapshot.district || null,
      commune: shippingSnapshot.commune || null,
      street: activeDelivery ? (shippingSnapshot.street || shippingSnapshot.address || null) : null,
      note: activeDelivery ? (shippingSnapshot.note || null) : null,
      trackingNumber: order.trackingNumber || null,
      estimatedDelivery: order.estimatedDelivery || null,
      minimized: !activeDelivery,
    },
    items: items.map((item) => ({
      id: item.id, productId: item.productId, variantId: item.variantId || null,
      name: item.name || 'Product', sku: item.sku || null, variantName: item.variantName || null,
      selectedOptions: item.selectedOptions || {}, quantity: item.quantity,
      unitPrice: String(item.price), lineTotal: String(item.total), currency: item.currency || order.currency || 'USD',
      fulfilledQuantity: item.fulfilledQuantity || 0,
    })),
    invoice: invoice ? {
      id: invoice.id, number: invoice.invoiceNumber, status: invoice.status, dueDate: invoice.dueDate,
      documentPath: `/api/invoice/invoices/${invoice.id}/pdf`,
    } : null,
    receipt: channel === 'pos' && invoice ? { documentPath: `/api/invoice/invoices/${invoice.id}/pdf` } : null,
    reports: reports.map(eventView),
    timeline: timeline.map(eventView),
    allowedActions: allowedActions(order, payment),
  };
}

function parseFilters(query = {}) {
  const channel = query.channel && query.channel !== 'all' ? String(query.channel) : null;
  const status = query.status && query.status !== 'all' ? String(query.status) : null;
  if (channel && !CHANNELS.has(channel)) fail('Invalid channel filter');
  if (status && !STATUSES.has(status)) fail('Invalid status filter');
  const dateFrom = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : null;
  const dateTo = query.dateTo ? new Date(`${query.dateTo}T23:59:59.999Z`) : null;
  if ((dateFrom && Number.isNaN(dateFrom.valueOf())) || (dateTo && Number.isNaN(dateTo.valueOf())) || (dateFrom && dateTo && dateFrom > dateTo)) {
    fail('Invalid date range');
  }
  const search = String(query.search || '').trim().slice(0, 100).toLowerCase();
  return { channel, status, dateFrom, dateTo, search };
}

async function relatedFor(order) {
  const [items, payment, invoice, shipping, events] = await Promise.all([
    OrderItem.findAll({ where: { orderId: order.id }, order: [['createdAt', 'ASC']] }),
    Payment.findOne({ where: { orderId: order.id } }),
    Invoice.findOne({ where: { orderId: order.id } }),
    ShippingDetail.findOne({ where: { orderId: order.id } }),
    OrderEvent.findAll({ where: { orderId: order.id, storeId: order.storeId }, order: [['createdAt', 'ASC']] }),
  ]);
  return { items, payment, invoice, shipping, events };
}

async function relatedForOrders(orders) {
  const orderIds = orders.map((order) => order.id);
  if (!orderIds.length) return new Map();
  const where = { orderId: { [Op.in]: orderIds } };
  const [items, payments, invoices, shippingRows, events] = await Promise.all([
    OrderItem.findAll({ where, order: [['createdAt', 'ASC']] }),
    Payment.findAll({ where }),
    Invoice.findAll({ where }),
    ShippingDetail.findAll({ where }),
    OrderEvent.findAll({ where, order: [['createdAt', 'ASC']] }),
  ]);
  const related = new Map(orderIds.map((id) => [id, { items: [], payment: null, invoice: null, shipping: null, events: [] }]));
  for (const item of items) related.get(item.orderId)?.items.push(item);
  for (const payment of payments) related.get(payment.orderId).payment = payment;
  for (const invoice of invoices) related.get(invoice.orderId).invoice = invoice;
  for (const shipping of shippingRows) related.get(shipping.orderId).shipping = shipping;
  for (const event of events) related.get(event.orderId)?.events.push(event);
  return related;
}

async function listStoreOrders(storeId, query = {}) {
  uuid(storeId, 'Store');
  const filters = parseFilters(query);
  const where = { storeId };
  if (filters.status) where.status = filters.status;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt[Op.gte] = filters.dateFrom;
    if (filters.dateTo) where.createdAt[Op.lte] = filters.dateTo;
  }
  const rows = await Order.findAll({ where, order: [['createdAt', 'DESC']], limit: 250 });
  const related = await relatedForOrders(rows);
  const projected = rows.map((order) => orderProjection(order, related.get(order.id)));
  const orders = projected.filter((order) => {
    if (filters.channel && order.channel !== filters.channel) return false;
    if (!filters.search) return true;
    return [order.orderNumber, order.buyer.name, order.buyer.email, order.buyer.phone]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(filters.search));
  });
  return { orders, total: orders.length, capped: rows.length === 250 };
}

async function getStoreOrder(storeId, orderId) {
  uuid(storeId, 'Store'); uuid(orderId, 'order');
  const order = await Order.findOne({ where: { id: orderId, storeId } });
  if (!order) fail('Order not found', 404);
  return orderProjection(order, await relatedFor(order));
}

module.exports = {
  maskEmail, maskPhone, channelFor, paymentFacts, allowedActions, eventView,
  orderProjection, parseFilters, relatedForOrders, listStoreOrders, getStoreOrder,
};
