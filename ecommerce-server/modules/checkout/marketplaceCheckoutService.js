const { sequelize } = require('../../config/db');
const { createHash } = require('node:crypto');
const { Op } = require('sequelize');
const { Cart, CartItem, Product, ProductVariant, StoreAccess, StoreDeliveryPolicy,
  Order, OrderItem, Payment, OrderEvent, WebsiteData } = require('../../models');
const { changeStock } = require('../inventory').sharedStockService;
const { getStoreOwnerContact } = require('./merchantContactService');
const NotificationService = require('../notifications').notificationService;

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

async function eligibleStore(storeId, transaction, channel = 'marketplace') {
  const store = await StoreAccess.findByPk(storeId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!store || store.status !== 'active') fail('Store is not active', 409);
  if (channel === 'storefront') {
    const website = store.websiteId && await WebsiteData.findOne({
      where: { websiteId: store.websiteId, storeId, status: 'active' }, transaction,
    });
    if (!website) fail('Storefront is not available for checkout', 409);
    return store;
  }
  if (store.marketplaceApprovalStatus !== 'approved' ||
      store.marketplaceEntitlement !== 'pilot' || store.needsCategoryReview) {
    fail('This seller is not available for marketplace checkout', 409);
  }
  return store;
}

function eligibleProduct(product, store, channel = 'marketplace') {
  if (channel === 'storefront') {
    return product && product.storeId === store.storeId && product.websiteId === store.websiteId &&
      product.status === 'active';
  }
  const vis = product?.marketplaceVisibility ?? null;
  return product && product.storeId === store.storeId && product.status === 'active' &&
    Boolean(product.marketplaceCategory) &&
    (vis === true || (vis === null && store.marketplaceEnabled));
}

async function checkedProductAndVariant(productId, variantId, store, transaction, channel = 'marketplace') {
  const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!eligibleProduct(product, store, channel)) fail('Product is not available on this sales channel', 409);

  let variant = null;
  if (variantId) {
    variant = await ProductVariant.findOne({
      where: { id: variantId, productId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!variant || variant.status !== 'active') {
      fail('Selected product variant is not available', 409);
    }
  }

  const unitPrice = variant ? variant.price : product.price;
  return { product, variant, unitPrice };
}

async function checkedProduct(productId, store, transaction, channel = 'marketplace') {
  const { product } = await checkedProductAndVariant(productId, null, store, transaction, channel);
  return product;
}

function normalizeBuyerOrSession(buyerOrOptions) {
  if (typeof buyerOrOptions === 'object' && buyerOrOptions !== null) {
    return {
      buyerId: buyerOrOptions.buyerId || null,
      sessionId: buyerOrOptions.sessionId || null,
    };
  }
  return { buyerId: buyerOrOptions || null, sessionId: null };
}

async function getCart(buyerOrOptions, storeId, channel = 'marketplace') {
  const { buyerId, sessionId } = normalizeBuyerOrSession(buyerOrOptions);
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  if (storeId) uuid(storeId, 'Store');
  if (channel === 'storefront' && !storeId) fail('Store is required');

  const cartWhere = {
    websiteId: null,
    ...(storeId ? { storeId } : {}),
  };
  if (buyerId) {
    cartWhere.buyerId = buyerId;
  } else {
    cartWhere.sessionId = sessionId;
  }

  const carts = await Cart.findAll({
    where: cartWhere,
    include: [{ model: CartItem, as: 'CartItems' }],
    order: [['createdAt', 'ASC']],
  });
  return Promise.all(carts.map(async (cart) => {
    const productIds = cart.CartItems.map((item) => item.productId);
    const variantIds = cart.CartItems.map((item) => item.variantId).filter(Boolean);
    const [store, policy, products, variants] = await Promise.all([
      StoreAccess.findByPk(cart.storeId),
      StoreDeliveryPolicy.findByPk(cart.storeId),
      Product.findAll({ where: { id: productIds } }),
      ProductVariant.findAll({ where: { id: variantIds } }),
    ]);
    const byId = new Map(products.map((product) => [product.id, product]));
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const issues = [];
    const websiteReady = channel !== 'storefront' || (store?.websiteId && await WebsiteData.findOne({
      where: { websiteId: store.websiteId, storeId: cart.storeId, status: 'active' },
    }));
    if (!store || store.status !== 'active' || !websiteReady || (channel === 'marketplace' &&
        (store.marketplaceApprovalStatus !== 'approved' || store.marketplaceEntitlement !== 'pilot' ||
         store.needsCategoryReview))) issues.push('Seller is not available for checkout');
    if (!policy) issues.push('Seller has not posted a delivery fee');
    let subtotal = 0;
    const items = cart.CartItems.map((item) => {
      const product = byId.get(item.productId);
      const variant = item.variantId ? variantById.get(item.variantId) : null;
      let available = false;
      if (store && eligibleProduct(product, store, channel)) {
        if (variant) {
          available = variant.status === 'active' &&
            (!variant.trackInventory || variant.stockQuantity >= item.quantity);
        } else {
          available = !product.trackInventory || product.stockQuantity >= item.quantity;
        }
      }
      if (!available) issues.push(`Product ${item.productId} is unavailable or has insufficient stock`);
      const effectivePrice = variant ? variant.price : (product ? product.price : null);
      const currentPrice = effectivePrice ? dollars(cents(effectivePrice)) : null;
      if (currentPrice) subtotal += cents(currentPrice) * item.quantity;
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currentPrice,
        available: Boolean(available),
        product: product ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images || [],
          price: product.price,
          trackInventory: product.trackInventory,
          allowBackorders: product.allowBackorders,
          stockQuantity: product.stockQuantity,
          productType: product.productType,
        } : null,
        variant: variant ? {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          optionValues: variant.optionValues,
        } : null,
      };
    });
    if (!items.length) issues.push('Cart is empty');
    const fee = policy ? cents(policy.flatFee) : null;
    return {
      id: cart.id,
      storeId: cart.storeId,
      websiteId: channel === 'storefront' ? store?.websiteId : null,
      items,
      subtotal: dollars(subtotal),
      deliveryFee: items.length === 0 ? '0.00' : (fee === null ? null : dollars(fee)),
      totalAmount: fee === null || issues.length ? null : dollars(subtotal + fee),
      currency: 'USD',
      deliveryPolicyVersion: policy?.version ?? null,
      checkoutReady: issues.length === 0,
      issues,
    };
  }));
}

async function setCartItem({
  buyerId, sessionId, storeId, productId, variantId, quantity, mode = 'set', channel = 'marketplace',
}) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  uuid(productId, 'product');
  if (variantId) uuid(variantId, 'variant');
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999) fail('Invalid quantity');

  await sequelize.transaction(async (transaction) => {
    if (!storeId) {
      const p = await Product.findByPk(productId, { transaction, attributes: ['id', 'storeId'] });
      if (!p) fail('Product not found', 404);
      storeId = p.storeId;
    }
    uuid(storeId, 'Store');

    const store = await eligibleStore(storeId, transaction, channel);

    const cartWhere = {
      storeId,
      websiteId: null,
      ...(buyerId ? { buyerId } : { sessionId }),
    };

    let cart = await Cart.findOne({
      where: cartWhere,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const itemWhere = {
      cartId: cart ? cart.id : null,
      productId,
      variantId: variantId || null,
    };
    const item = cart ? await CartItem.findOne({ where: itemWhere, transaction }) : null;

    let targetQuantity = quantity;
    if (mode === 'add') {
      targetQuantity = (item ? item.quantity : 0) + quantity;
      if (targetQuantity > 999) targetQuantity = 999;
    }

    const { product, variant, unitPrice } = targetQuantity
      ? await checkedProductAndVariant(productId, variantId, store, transaction, channel)
      : { product: null, variant: null, unitPrice: null };

    if (targetQuantity) {
      if (variant && variant.trackInventory && targetQuantity > variant.stockQuantity) {
        fail('Insufficient stock', 409);
      } else if (!variant && product && product.trackInventory && targetQuantity > product.stockQuantity) {
        fail('Insufficient stock', 409);
      }
    }

    if (!cart && targetQuantity) {
      cart = await Cart.create({
        buyerId: buyerId || null,
        sessionId: buyerId ? null : sessionId,
        storeId,
        websiteId: null,
        currency: 'USD',
      }, { transaction });
    }
    if (!cart) return;

    if (!targetQuantity) {
      if (item) await item.destroy({ transaction });
      const remaining = await CartItem.count({ where: { cartId: cart.id }, transaction });
      if (remaining === 0) await cart.destroy({ transaction });
    } else if (item) {
      await item.update({ quantity: targetQuantity, unitPrice }, { transaction });
    } else {
      await CartItem.create({
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity: targetQuantity,
        unitPrice,
      }, { transaction });
    }
  });

  return getCart({ buyerId, sessionId }, null, channel);
}

async function updateCartItem({
  buyerId, sessionId, itemId, storeId, productId, variantId, quantity, channel = 'marketplace',
}) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  if (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999)) {
    fail('Invalid quantity');
  }

  if (itemId) {
    uuid(itemId, 'item');
    await sequelize.transaction(async (transaction) => {
      const item = await CartItem.findByPk(itemId, {
        include: [{
          model: Cart,
          where: {
            websiteId: null,
            ...(buyerId ? { buyerId } : { sessionId }),
          },
        }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!item) fail('Cart item not found', 404);
      const cartId = item.cartId;
      if (quantity === 0) {
        await item.destroy({ transaction });
        const remaining = await CartItem.count({ where: { cartId }, transaction });
        if (remaining === 0) await Cart.destroy({ where: { id: cartId }, transaction });
      } else if (quantity !== undefined) {
        const cart = item.Cart;
        const store = await eligibleStore(cart.storeId, transaction, channel);
        const { variant, product, unitPrice } = await checkedProductAndVariant(
          item.productId, item.variantId, store, transaction, channel,
        );
        if (variant && variant.trackInventory && quantity > variant.stockQuantity) {
          fail('Insufficient stock', 409);
        } else if (!variant && product && product.trackInventory && quantity > product.stockQuantity) {
          fail('Insufficient stock', 409);
        }
        await item.update({ quantity, unitPrice }, { transaction });
      }
    });
    return getCart({ buyerId, sessionId }, null, channel);
  }

  return setCartItem({ buyerId, sessionId, storeId, productId, variantId, quantity, channel });
}

async function removeCartItem({ buyerId, sessionId, storeId, productId, variantId, itemId, channel = 'marketplace' }) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');

  await sequelize.transaction(async (transaction) => {
    if (itemId) {
      uuid(itemId, 'item');
      const item = await CartItem.findByPk(itemId, {
        include: [{
          model: Cart,
          where: {
            websiteId: null,
            ...(buyerId ? { buyerId } : { sessionId }),
          },
        }],
        transaction,
      });
      if (item) {
        const cartId = item.cartId;
        await item.destroy({ transaction });
        const remaining = await CartItem.count({ where: { cartId }, transaction });
        if (remaining === 0) await Cart.destroy({ where: { id: cartId }, transaction });
        return;
      }
      if (productId !== itemId) {
        return;
      }
    }

    if (!productId) fail('Item ID or Product ID is required');
    uuid(productId, 'product');
    if (!storeId) {
      const p = await Product.findByPk(productId, { transaction, attributes: ['id', 'storeId'] });
      if (p) storeId = p.storeId;
    }
    if (storeId) uuid(storeId, 'Store');

    const cart = await Cart.findOne({
      where: {
        websiteId: null,
        ...(storeId ? { storeId } : {}),
        ...(buyerId ? { buyerId } : { sessionId }),
      },
      transaction,
    });
    if (!cart) return;

    const itemWhere = {
      cartId: cart.id,
      productId,
      ...(variantId ? { variantId } : {}),
    };
    await CartItem.destroy({ where: itemWhere, transaction });
    const remaining = await CartItem.count({ where: { cartId: cart.id }, transaction });
    if (remaining === 0) await cart.destroy({ transaction });
  });

  return getCart({ buyerId, sessionId }, null, channel);
}

async function clearCart({ buyerId, sessionId, storeId, channel = 'marketplace' }) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  if (storeId) uuid(storeId, 'Store');

  await sequelize.transaction(async (transaction) => {
    const carts = await Cart.findAll({
      where: {
        websiteId: null,
        ...(storeId ? { storeId } : {}),
        ...(buyerId ? { buyerId } : { sessionId }),
      },
      transaction,
    });
    const cartIds = carts.map((c) => c.id);
    if (cartIds.length) {
      await CartItem.destroy({ where: { cartId: cartIds }, transaction });
      await Cart.destroy({ where: { id: cartIds }, transaction });
    }
  });

  return getCart({ buyerId, sessionId }, null, channel);
}

async function mergeCarts({ buyerId, sessionId }) {
  uuid(buyerId, 'buyer');
  if (!sessionId) return getCart({ buyerId });

  await sequelize.transaction(async (transaction) => {
    const guestCarts = await Cart.findAll({
      where: { sessionId, websiteId: null },
      include: [{ model: CartItem, as: 'CartItems' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const guestCart of guestCarts) {
      let buyerCart = await Cart.findOne({
        where: { buyerId, storeId: guestCart.storeId, websiteId: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!buyerCart) {
        await guestCart.update({ buyerId, sessionId: null }, { transaction });
        continue;
      }

      for (const guestItem of guestCart.CartItems) {
        const itemWhere = {
          cartId: buyerCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId || null,
        };
        const existingItem = await CartItem.findOne({ where: itemWhere, transaction });
        if (existingItem) {
          await existingItem.update({
            quantity: Math.min(999, existingItem.quantity + guestItem.quantity),
          }, { transaction });
        } else {
          await guestItem.update({ cartId: buyerCart.id }, { transaction });
        }
      }
      await guestCart.destroy({ transaction });
    }
  });

  return getCart({ buyerId });
}

function orderView(order, items, payment) {
  return {
    id: order.id, orderNumber: order.orderNumber, storeId: order.storeId, websiteId: order.websiteId,
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

async function checkout({ buyerId, storeId, checkoutKey, expectedTotalAmount, customerInfo, shippingInfo,
  channel = 'marketplace' }) {
  uuid(buyerId, 'buyer'); uuid(storeId, 'Store'); uuid(checkoutKey, 'idempotency key');
  if (expectedTotalAmount === undefined || expectedTotalAmount === null) fail('Expected cart total is required');
  const expectedTotal = cents(expectedTotalAmount);
  const name = requiredText(customerInfo?.name, 'customer name', 120);
  const phone = requiredText(customerInfo?.phone, 'contact phone', 40);
  const address = requiredText(shippingInfo?.address, 'delivery address', 500);
  const matchesRequest = (order) => order.storeId === storeId && order.salesChannel === channel &&
    order.customerInfo?.name === name && order.customerInfo?.phone === phone &&
    order.shippingInfo?.address === address && cents(order.totalAmount) === expectedTotal;
  const existing = await findOrderByKey(checkoutKey, buyerId);
  if (existing) {
    if (!matchesRequest(existing)) fail('Checkout key was already used for a different request', 409);
    return existing;
  }
  let justCreated = false;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const store = await eligibleStore(storeId, transaction, channel);
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
        const { product, variant, unitPrice } = await checkedProductAndVariant(
          item.productId, item.variantId, store, transaction, channel,
        );
        if (variant && variant.trackInventory && variant.stockQuantity < item.quantity) {
          fail('Insufficient stock', 409);
        } else if (!variant && product.trackInventory && product.stockQuantity < item.quantity) {
          fail('Insufficient stock', 409);
        }
        const price = cents(unitPrice);
        subtotal += price * item.quantity;
        if (!Number.isSafeInteger(subtotal) || subtotal > 100_000_000) fail('Order total is too large');
        snapshots.push({ item, product, variant, price });
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
        storeId, websiteId: channel === 'storefront' ? store.websiteId : null, buyerId, checkoutKey,
        salesChannel: channel, deliveryStatus: 'pending', orderType: 'delivery',
        status: 'pending', subtotal: dollars(subtotal), totalAmount: dollars(total),
        taxTotal: '0.00', shippingFee: dollars(deliveryFee), discountTotal: '0.00', currency: 'USD',
        customerInfo: { name, phone }, shippingInfo: { address }, stockDeducted: true,
        metadata: { paymentMethod: 'cod', deliveryTerms: 'Seller delivers and collects cash directly',
          deliveryPolicyVersion: policy.version, commission: '0.00' },
      }, { transaction });
      const items = [];
      for (const { item, product, variant, price } of snapshots) {
        const line = await OrderItem.create({
          orderId: order.id, productId: product.id, name: product.name,
          sku: variant?.sku || product.slug, quantity: item.quantity, basePrice: dollars(price),
          price: dollars(price), total: dollars(price * item.quantity),
          baseCurrency: 'USD', currency: 'USD',
          itemMetadata: { seller: { storeId }, category: product.marketplaceCategory || product.categoryId,
            variantId: item.variantId || null,
            tax: '0.00', shipping: '0.00', commission: '0.00', productVersion: product.version },
        }, { transaction });
        items.push(line);
        await changeStock(product.id, -item.quantity, transaction, item.variantId || null);
      }
      const payment = await Payment.create({
        orderId: order.id, storeId, amount: dollars(total), currency: 'USD',
        paymentMethod: 'COD', status: 'pending', collectedAmount: '0.00', refundedAmount: '0.00',
      }, { transaction });
      await CartItem.destroy({ where: { cartId: cart.id }, transaction });
      await Cart.destroy({ where: { id: cart.id }, transaction });
      justCreated = true;
      return orderView(order, items, payment);
    });
    if (justCreated) notifyStoreOfNewOrder(result);
    return result;
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

/**
 * Marketplace orders had no merchant notification at all — the seller only
 * found out when they happened to check Marketplace Orders. Fired after
 * checkout() commits, never lets a notification failure affect the buyer's
 * response (the order already exists either way).
 */
async function notifyStoreOfNewOrder(order) {
  try {
    const contact = await getStoreOwnerContact(order.storeId);
    await NotificationService.sendNewOrderNotification(contact, order, order.items);
  } catch (error) {
    console.error(`Marketplace order notification failed (order ${order.id}):`, error.message);
  }
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

module.exports = { getDeliveryPolicy, setDeliveryPolicy, getCart, setCartItem, updateCartItem, removeCartItem, clearCart, mergeCarts,
  checkout, buyerOrders, buyerOrder, buyerOrderForStore, sellerOrders, orderEvents, merchantAction, buyerReport, checkedProductAndVariant };
