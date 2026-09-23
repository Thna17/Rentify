const { sequelize } = require('../config/db');
const { createHash } = require('node:crypto');
const { Cart, CartItem, Product, ProductVariant, StoreAccess, StoreDeliveryPolicy,
  Order, OrderItem, Payment, OrderEvent } = require('../models');
const { changeStock } = require('./sharedStockService');

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function uuid(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    fail(`Invalid ${label}`);
  }
  return value;
}

function requiredText(value, label, max = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`Invalid ${label}`);
  return value.trim();
}

function cents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(String(value))) fail('Invalid product price', 409);
  return Math.round(amount * 100);
}

function dollars(value) { return (value / 100).toFixed(2); }

function deliveryFeeCents(value) {
  const fee = cents(value);
  if (fee > 100_000) fail('Delivery fee must be no more than 1000.00');
  return fee;
}

async function getDeliveryPolicy(storeId) {
  uuid(storeId, 'Store');
  const policy = await StoreDeliveryPolicy.findByPk(storeId);
  return policy ? { storeId, flatFee: policy.flatFee, currency: policy.currency,
    version: policy.version } : null;
}

async function setDeliveryPolicy(storeId, { flatFee, expectedVersion } = {}) {
  uuid(storeId, 'Store');
  const fee = dollars(deliveryFeeCents(flatFee));
  return sequelize.transaction(async (transaction) => {
    const store = await StoreAccess.findByPk(storeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!store || store.status !== 'active') fail('Store is not active', 403);
    const policy = await StoreDeliveryPolicy.findByPk(storeId, {
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!policy) {
      if (expectedVersion !== undefined && expectedVersion !== null) fail('Delivery policy version has changed', 409);
      const created = await StoreDeliveryPolicy.create({ storeId, flatFee: fee, currency: 'USD', version: 1 },
        { transaction });
      return { storeId, flatFee: created.flatFee, currency: created.currency, version: created.version };
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== policy.version) {
      fail('Delivery policy version has changed; refresh and retry', 409);
    }
    await policy.update({ flatFee: fee, version: policy.version + 1 }, { transaction });
    return { storeId, flatFee: policy.flatFee, currency: policy.currency, version: policy.version };
  });
}

function actionFingerprint(action, input) {
  const fields = {
    delivered: [], delivery_failed: ['reason', 'resolution'],
    retry_delivery: ['buyerAgreed'], collect_cod: ['amount'],
    confirm_refund: ['amount', 'method', 'confirmation'],
  }[action] || [];
  const values = fields.map((field) => input[field] ?? null);
  return createHash('sha256').update(JSON.stringify([action, ...values])).digest('hex');
}

async function eligibleStore(storeId, transaction) {
  const store = await StoreAccess.findByPk(storeId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!store || store.status !== 'active' || store.marketplaceApprovalStatus !== 'approved' ||
      store.marketplaceEntitlement !== 'pilot' || store.needsCategoryReview) {
    fail('This seller is not available for marketplace checkout', 409);
  }
  return store;
}

function eligibleProduct(product, store) {
  return product && product.storeId === store.storeId && product.status === 'active' &&
    Boolean(product.marketplaceCategory) &&
    (product.marketplaceVisibility === true ||
      (product.marketplaceVisibility === null && store.marketplaceEnabled));
}

async function checkedProduct(productId, store, transaction) {
  const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!eligibleProduct(product, store)) fail('Product is not available on the marketplace', 409);
  if (await ProductVariant.count({ where: { productId }, transaction })) {
    fail('Variant products are not supported by marketplace COD checkout yet', 409);
  }
  return product;
}

async function getCart(buyerId, storeId) {
  uuid(buyerId, 'buyer');
  if (storeId) uuid(storeId, 'Store');
  const carts = await Cart.findAll({
    where: { buyerId, websiteId: null, ...(storeId ? { storeId } : {}) },
    include: [{ model: CartItem, as: 'CartItems' }],
    order: [['createdAt', 'ASC']],
  });
  return Promise.all(carts.map(async (cart) => {
    const productIds = cart.CartItems.map((item) => item.productId);
    const [store, policy, products, variants] = await Promise.all([
      StoreAccess.findByPk(cart.storeId),
      StoreDeliveryPolicy.findByPk(cart.storeId),
      Product.findAll({ where: { id: productIds } }),
      ProductVariant.findAll({ where: { productId: productIds }, attributes: ['productId'] }),
    ]);
    const byId = new Map(products.map((product) => [product.id, product]));
    const variantProductIds = new Set(variants.map((variant) => variant.productId));
    const issues = [];
    if (!store || store.status !== 'active' || store.marketplaceApprovalStatus !== 'approved' ||
        store.marketplaceEntitlement !== 'pilot' || store.needsCategoryReview) {
      issues.push('Seller is not available for marketplace checkout');
    }
    if (!policy) issues.push('Seller has not posted a delivery fee');
    let subtotal = 0;
    const items = cart.CartItems.map((item) => {
      const product = byId.get(item.productId);
      const available = store && eligibleProduct(product, store) &&
        !variantProductIds.has(item.productId) &&
        (!product.trackInventory || product.stockQuantity >= item.quantity);
      if (!available) issues.push(`Product ${item.productId} is unavailable or has insufficient stock`);
      const currentPrice = product ? dollars(cents(product.price)) : null;
      if (currentPrice) subtotal += cents(currentPrice) * item.quantity;
      return { productId: item.productId, quantity: item.quantity,
        unitPrice: item.unitPrice, currentPrice, available: Boolean(available) };
    });
    if (!items.length) issues.push('Cart is empty');
    const fee = policy ? cents(policy.flatFee) : null;
    return { id: cart.id, storeId: cart.storeId, items,
      subtotal: dollars(subtotal), deliveryFee: fee === null ? null : dollars(fee),
      totalAmount: fee === null || issues.length ? null : dollars(subtotal + fee),
      currency: 'USD', deliveryPolicyVersion: policy?.version ?? null,
      checkoutReady: issues.length === 0, issues };
  }));
}

async function setCartItem({ buyerId, storeId, productId, quantity }) {
  uuid(buyerId, 'buyer'); uuid(storeId, 'Store'); uuid(productId, 'product');
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999) fail('Invalid quantity');
  await sequelize.transaction(async (transaction) => {
    const store = await eligibleStore(storeId, transaction);
    const product = quantity ? await checkedProduct(productId, store, transaction) : null;
    if (product && product.trackInventory && quantity > product.stockQuantity) fail('Insufficient stock', 409);
    let cart = await Cart.findOne({
      where: { buyerId, storeId, websiteId: null }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!cart && quantity) {
      cart = await Cart.create({ buyerId, storeId, websiteId: null, currency: 'USD' }, { transaction });
    }
    if (!cart) return;
    const item = await CartItem.findOne({ where: { cartId: cart.id, productId }, transaction });
    if (!quantity) {
      if (item) await item.destroy({ transaction });
    } else if (item) {
      await item.update({ quantity, unitPrice: product.price }, { transaction });
    } else {
      await CartItem.create({ cartId: cart.id, productId, quantity, unitPrice: product.price }, { transaction });
    }
  });
  return getCart(buyerId, storeId);
}

function orderView(order, items, payment) {
  return {
    id: order.id, orderNumber: order.orderNumber, storeId: order.storeId,
    buyerId: order.buyerId, status: order.status, deliveryStatus: order.deliveryStatus,
    salesChannel: order.salesChannel, subtotal: order.subtotal,
    deliveryFee: order.shippingFee, totalAmount: order.totalAmount, currency: order.currency,
    customerInfo: order.customerInfo, shippingInfo: order.shippingInfo,
    items: items.map((item) => ({
      productId: item.productId, name: item.name, quantity: item.quantity,
      price: item.price, total: item.total, seller: item.itemMetadata?.seller,
      category: item.itemMetadata?.category,
    })),
    payment: payment && {
      method: payment.paymentMethod, status: payment.status, amountDue: payment.amount,
      collectedAmount: payment.collectedAmount, refundedAmount: payment.refundedAmount,
    },
  };
}

async function findOrderByKey(checkoutKey, buyerId, transaction = null) {
  const order = await Order.findOne({ where: { checkoutKey }, transaction });
  if (!order) return null;
  if (order.buyerId !== buyerId) fail('Checkout key belongs to another buyer', 409);
  const [items, payment] = await Promise.all([
    OrderItem.findAll({ where: { orderId: order.id }, transaction }),
    Payment.findOne({ where: { orderId: order.id }, transaction }),
  ]);
  return orderView(order, items, payment);
}

async function checkout({ buyerId, storeId, checkoutKey, expectedTotalAmount, customerInfo, shippingInfo }) {
  uuid(buyerId, 'buyer'); uuid(storeId, 'Store'); uuid(checkoutKey, 'idempotency key');
  if (expectedTotalAmount === undefined || expectedTotalAmount === null) fail('Expected cart total is required');
  const expectedTotal = cents(expectedTotalAmount);
  const name = requiredText(customerInfo?.name, 'customer name', 120);
  const phone = requiredText(customerInfo?.phone, 'contact phone', 40);
  const address = requiredText(shippingInfo?.address, 'delivery address', 500);
  const matchesRequest = (order) => order.storeId === storeId &&
    order.customerInfo?.name === name && order.customerInfo?.phone === phone &&
    order.shippingInfo?.address === address && cents(order.totalAmount) === expectedTotal;
  const existing = await findOrderByKey(checkoutKey, buyerId);
  if (existing) {
    if (!matchesRequest(existing)) fail('Checkout key was already used for a different request', 409);
    return existing;
  }
  try {
    return await sequelize.transaction(async (transaction) => {
      const store = await eligibleStore(storeId, transaction);
      const committedReplay = await findOrderByKey(checkoutKey, buyerId, transaction);
      if (committedReplay) {
        if (!matchesRequest(committedReplay)) fail('Checkout key was already used for a different request', 409);
        return committedReplay;
      }
      const cart = await Cart.findOne({
        where: { buyerId, storeId, websiteId: null }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!cart) fail('Cart is empty', 409);
      const cartItems = await CartItem.findAll({ where: { cartId: cart.id }, transaction });
      if (!cartItems.length) fail('Cart is empty', 409);
      // Deterministic locking prevents a pair of checkouts with reverse line
      // order from deadlocking. The database row lock is the stock boundary.
      cartItems.sort((a, b) => a.productId.localeCompare(b.productId));
      const snapshots = [];
      let subtotal = 0;
      for (const item of cartItems) {
        if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) fail('Invalid quantity');
        const product = await checkedProduct(item.productId, store, transaction);
        if (product.trackInventory && product.stockQuantity < item.quantity) fail('Insufficient stock', 409);
        const price = cents(product.price);
        subtotal += price * item.quantity;
        if (!Number.isSafeInteger(subtotal) || subtotal > 100_000_000) fail('Order total is too large');
        snapshots.push({ item, product, price });
      }
      const policy = await StoreDeliveryPolicy.findByPk(storeId, {
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!policy || policy.currency !== 'USD') fail('Seller has not posted a USD delivery fee', 409);
      const deliveryFee = cents(policy.flatFee);
      const total = subtotal + deliveryFee;
      if (total !== expectedTotal) fail('Cart price or delivery fee changed; refresh before checkout', 409);
      if (total > 100_000_000) fail('Order total is too large');
      const order = await Order.create({
        storeId, websiteId: null, buyerId, checkoutKey,
        salesChannel: 'marketplace', deliveryStatus: 'pending', orderType: 'delivery',
        status: 'pending', subtotal: dollars(subtotal), totalAmount: dollars(total),
        taxTotal: '0.00', shippingFee: dollars(deliveryFee), discountTotal: '0.00', currency: 'USD',
        customerInfo: { name, phone }, shippingInfo: { address }, stockDeducted: true,
        metadata: { paymentMethod: 'cod', deliveryTerms: 'Seller delivers and collects cash directly',
          deliveryPolicyVersion: policy.version, commission: '0.00' },
      }, { transaction });
      const items = [];
      for (const { item, product, price } of snapshots) {
        const line = await OrderItem.create({
          orderId: order.id, productId: product.id, name: product.name,
          sku: product.slug, quantity: item.quantity, basePrice: dollars(price),
          price: dollars(price), total: dollars(price * item.quantity),
          baseCurrency: 'USD', currency: 'USD',
          itemMetadata: { seller: { storeId }, category: product.marketplaceCategory,
            tax: '0.00', shipping: '0.00', commission: '0.00', productVersion: product.version },
        }, { transaction });
        items.push(line);
        await changeStock(product.id, -item.quantity, transaction);
      }
      const payment = await Payment.create({
        orderId: order.id, storeId, amount: dollars(total), currency: 'USD',
        paymentMethod: 'COD', status: 'pending', collectedAmount: '0.00', refundedAmount: '0.00',
      }, { transaction });
      await CartItem.destroy({ where: { cartId: cart.id }, transaction });
      return orderView(order, items, payment);
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const replay = await findOrderByKey(checkoutKey, buyerId);
      if (replay) {
        if (!matchesRequest(replay)) fail('Checkout key was already used for a different request', 409);
        return replay;
      }
    }
    throw error;
  }
}

async function buyerOrders(buyerId) {
  uuid(buyerId, 'buyer');
  const orders = await Order.findAll({ where: { buyerId, salesChannel: 'marketplace' },
    order: [['createdAt', 'DESC']], limit: 50 });
  return Promise.all(orders.map(async (order) => orderView(order,
    await OrderItem.findAll({ where: { orderId: order.id } }),
    await Payment.findOne({ where: { orderId: order.id } }))));
}

async function buyerOrder(buyerId, orderId) {
  uuid(buyerId, 'buyer'); uuid(orderId, 'order');
  const order = await Order.findOne({ where: { id: orderId, buyerId, salesChannel: 'marketplace' } });
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
      const order = await Order.findOne({ where: { id: orderId, storeId, salesChannel: 'marketplace' },
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
          for (const line of lines) await changeStock(line.productId, line.quantity, transaction);
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
  const order = await Order.findOne({ where: { id: orderId, storeId, salesChannel: 'marketplace' } });
  if (!order) fail('Order not found', 404);
  return orderView(order, await OrderItem.findAll({ where: { orderId } }),
    await Payment.findOne({ where: { orderId } }));
}

async function sellerOrders(storeId) {
  uuid(storeId, 'Store');
  const orders = await Order.findAll({ where: { storeId, salesChannel: 'marketplace' },
    order: [['createdAt', 'DESC']], limit: 50 });
  return Promise.all(orders.map(async (order) => orderView(order,
    await OrderItem.findAll({ where: { orderId: order.id } }),
    await Payment.findOne({ where: { orderId: order.id } }))));
}

async function orderEvents(storeId, orderId) {
  await buyerOrderForStore(storeId, orderId);
  return OrderEvent.findAll({ where: { storeId, orderId }, order: [['createdAt', 'ASC']] });
}

async function buyerReport({ buyerId, orderId, eventKey, type, details }) {
  uuid(buyerId, 'buyer'); uuid(orderId, 'order'); uuid(eventKey, 'idempotency key');
  if (!['return_requested', 'complaint'].includes(type)) fail('Invalid report type');
  const order = await Order.findOne({ where: { id: orderId, buyerId, salesChannel: 'marketplace' } });
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

module.exports = { getDeliveryPolicy, setDeliveryPolicy, getCart, setCartItem, checkout, buyerOrders, buyerOrder,
  buyerOrderForStore, sellerOrders, orderEvents, merchantAction, buyerReport };
