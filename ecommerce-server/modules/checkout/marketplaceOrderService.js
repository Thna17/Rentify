// Buyer and seller views of marketplace and storefront orders, merchant delivery
// and cash-on-delivery actions, and buyer reports.
const { sequelize } = require('../../config/db');
const { createHash } = require('node:crypto');
const { Op } = require('sequelize');
const { Order, OrderItem, Payment, OrderEvent } = require('../../models');
const { changeStock } = require('../inventory').sharedStockService;
const { fail, uuid, requiredText, cents, dollars, orderView } = require('./marketplaceRules');

function actionFingerprint(action, input) {
  const fields = {
    delivered: [], delivery_failed: ['reason', 'resolution'],
    retry_delivery: ['buyerAgreed'], collect_cod: ['amount'],
    confirm_refund: ['amount', 'method', 'confirmation'],
  }[action] || [];
  const values = fields.map((field) => input[field] ?? null);
  return createHash('sha256').update(JSON.stringify([action, ...values])).digest('hex');
}

async function buyerOrders(buyerId, { storeId, channel = 'marketplace' } = {}) {
  uuid(buyerId, 'buyer');
  if (storeId) uuid(storeId, 'Store');
  const orders = await Order.findAll({ where: { buyerId, salesChannel: channel,
    ...(storeId ? { storeId } : {}) },
    order: [['createdAt', 'DESC']], limit: 50 });
  return Promise.all(orders.map(async (order) => orderView(order,
    await OrderItem.findAll({ where: { orderId: order.id } }),
    await Payment.findOne({ where: { orderId: order.id } }))));
}

async function buyerOrder(buyerId, orderId, { storeId, channel = 'marketplace' } = {}) {
  uuid(buyerId, 'buyer'); uuid(orderId, 'order');
  if (storeId) uuid(storeId, 'Store');
  const order = await Order.findOne({ where: { id: orderId, buyerId, salesChannel: channel,
    ...(storeId ? { storeId } : {}) } });
  if (!order) fail('Order not found', 404);
  return orderView(order, await OrderItem.findAll({ where: { orderId } }),
    await Payment.findOne({ where: { orderId } }));
}

async function recordEvent({ orderId, storeId, actorId, eventKey, type, amount = null, details = {} }, transaction) {
  return OrderEvent.create({ orderId, storeId, actorId, eventKey, type, amount, details }, { transaction });
}

async function merchantAction({ storeId, orderId, actorId, eventKey, action, details = {} }) {
  uuid(storeId, 'Store'); uuid(orderId, 'order'); uuid(actorId, 'actor'); uuid(eventKey, 'idempotency key');
  if (!['delivered', 'delivery_failed', 'retry_delivery', 'collect_cod', 'confirm_refund'].includes(action)) fail('Invalid action');
  const fingerprint = actionFingerprint(action, details);
  const prior = await OrderEvent.findOne({ where: { eventKey } });
  if (prior) {
    if (prior.storeId !== storeId || prior.orderId !== orderId || prior.type !== action ||
        prior.actorId !== actorId || prior.details?._requestHash !== fingerprint) fail('Idempotency key conflict', 409);
    return buyerOrderForStore(storeId, orderId);
  }
  try {
    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({ where: { id: orderId, storeId,
        buyerId: { [Op.ne]: null }, checkoutKey: { [Op.ne]: null },
        salesChannel: { [Op.in]: ['marketplace', 'storefront'] } },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!order) fail('Order not found', 404);
      const replay = await OrderEvent.findOne({ where: { eventKey }, transaction });
      if (replay) {
        if (replay.storeId !== storeId || replay.orderId !== orderId || replay.type !== action ||
            replay.actorId !== actorId || replay.details?._requestHash !== fingerprint) {
          fail('Idempotency key conflict', 409);
        }
        return;
      }
      const payment = await Payment.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!payment || payment.paymentMethod !== 'COD') fail('COD payment not found', 409);
      let amount = null;
      if (action === 'delivered') {
        if (!['pending', 'retrying'].includes(order.deliveryStatus)) fail('Delivery cannot be completed', 409);
        await order.update({ deliveryStatus: 'delivered', status: 'fulfilled' }, { transaction });
      } else if (action === 'delivery_failed') {
        const reason = requiredText(details.reason, 'failure reason', 500);
        if (!['pending', 'retrying'].includes(order.deliveryStatus) || Number(payment.collectedAmount) > 0) {
          fail('Delivery cannot be failed after collection or completion', 409);
        }
        const resolution = details.resolution;
        if (!['retry', 'cancel'].includes(resolution)) fail('Choose retry or cancel');
        if (resolution === 'cancel') {
          const lines = await OrderItem.findAll({ where: { orderId }, transaction, order: [['productId', 'ASC']] });
          for (const line of lines) {
            await changeStock(line.productId, line.quantity, transaction, line.variantId || line.itemMetadata?.variantId || null);
          }
          await order.update({ deliveryStatus: 'failed', status: 'cancelled', stockDeducted: false }, { transaction });
        } else {
          await order.update({ deliveryStatus: 'failed' }, { transaction });
        }
        details = { reason, resolution };
      } else if (action === 'retry_delivery') {
        if (order.deliveryStatus !== 'failed' || order.status === 'cancelled') fail('Delivery cannot be retried', 409);
        if (details.buyerAgreed !== true) fail('Buyer agreement is required');
        await order.update({ deliveryStatus: 'retrying' }, { transaction });
        details = { buyerAgreed: true };
      } else if (action === 'collect_cod') {
        if (order.deliveryStatus !== 'delivered' || payment.status !== 'pending') fail('COD cannot be collected', 409);
        const due = cents(payment.amount);
        if (details.amount !== undefined && cents(details.amount) !== due) fail('Collected amount must equal amount due');
        amount = dollars(due);
        await payment.update({ collectedAmount: amount, collectedAt: new Date(), collectorId: actorId,
          paidAt: new Date(), status: 'paid' }, { transaction });
      } else if (action === 'confirm_refund') {
        if (payment.status !== 'paid') fail('Uncollected COD cannot be refunded', 409);
        const method = requiredText(details.method, 'refund method', 80);
        const confirmation = requiredText(details.confirmation, 'refund confirmation', 500);
        const refundCents = cents(details.amount);
        if (refundCents <= 0 || refundCents > cents(payment.collectedAmount) - cents(payment.refundedAmount)) {
          fail('Invalid refund amount', 409);
        }
        amount = dollars(refundCents);
        const newRefunded = cents(payment.refundedAmount) + refundCents;
        await payment.update({ refundedAmount: dollars(newRefunded),
          status: newRefunded === cents(payment.collectedAmount) ? 'refunded' : 'paid' }, { transaction });
        details = { method, confirmation, refundedAt: new Date().toISOString() };
      }
      await recordEvent({ orderId, storeId, actorId, eventKey, type: action, amount,
        details: { ...details, _requestHash: fingerprint } }, transaction);
    });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    const priorAfterRace = await OrderEvent.findOne({ where: { eventKey } });
    if (!priorAfterRace || priorAfterRace.storeId !== storeId || priorAfterRace.orderId !== orderId ||
        priorAfterRace.type !== action || priorAfterRace.actorId !== actorId ||
        priorAfterRace.details?._requestHash !== fingerprint) throw error;
  }
  return buyerOrderForStore(storeId, orderId);
}

async function buyerOrderForStore(storeId, orderId) {
  const order = await Order.findOne({ where: { id: orderId, storeId,
    buyerId: { [Op.ne]: null }, checkoutKey: { [Op.ne]: null },
    salesChannel: { [Op.in]: ['marketplace', 'storefront'] } } });
  if (!order) fail('Order not found', 404);
  return orderView(order, await OrderItem.findAll({ where: { orderId } }),
    await Payment.findOne({ where: { orderId } }));
}

async function sellerOrders(storeId) {
  uuid(storeId, 'Store');
  const orders = await Order.findAll({ where: { storeId,
    buyerId: { [Op.ne]: null }, checkoutKey: { [Op.ne]: null },
    salesChannel: { [Op.in]: ['marketplace', 'storefront'] } },
    order: [['createdAt', 'DESC']], limit: 50 });
  return Promise.all(orders.map(async (order) => orderView(order,
    await OrderItem.findAll({ where: { orderId: order.id } }),
    await Payment.findOne({ where: { orderId: order.id } }))));
}

async function orderEvents(storeId, orderId) {
  await buyerOrderForStore(storeId, orderId);
  return OrderEvent.findAll({ where: { storeId, orderId }, order: [['createdAt', 'ASC']] });
}

async function buyerReport({ buyerId, orderId, eventKey, type, details,
  storeId, channel = 'marketplace' }) {
  uuid(buyerId, 'buyer'); uuid(orderId, 'order'); uuid(eventKey, 'idempotency key');
  if (!['return_requested', 'complaint'].includes(type)) fail('Invalid report type');
  const order = await Order.findOne({ where: { id: orderId, buyerId, salesChannel: channel,
    ...(storeId ? { storeId } : {}) } });
  if (!order) fail('Order not found', 404);
  const reason = requiredText(details?.reason, 'reason', 1000);
  const prior = await OrderEvent.findOne({ where: { eventKey } });
  if (prior) {
    if (prior.orderId !== orderId || prior.actorId !== buyerId || prior.type !== type ||
        prior.details?.reason !== reason) fail('Idempotency key conflict', 409);
    return { id: prior.id, type: prior.type };
  }
  try {
    const event = await recordEvent({ orderId, storeId: order.storeId, actorId: buyerId,
      eventKey, type, details: { reason } });
    return { id: event.id, type: event.type };
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    const replay = await OrderEvent.findOne({ where: { eventKey } });
    if (!replay || replay.orderId !== orderId || replay.actorId !== buyerId ||
        replay.type !== type || replay.details?.reason !== reason) fail('Idempotency key conflict', 409);
    return { id: replay.id, type: replay.type };
  }
}

module.exports = { buyerOrders, buyerOrder, buyerOrderForStore, sellerOrders, orderEvents, merchantAction, buyerReport };
