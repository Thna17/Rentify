// Turns a marketplace or storefront cart into a cash-on-delivery order in one
// transaction. Also re-exports the cart, delivery policy and order services, so
// callers keep one entry for the whole buyer flow.
const { sequelize } = require('../../config/db');
const { Cart, CartItem, StoreDeliveryPolicy, Order, OrderItem, Payment, WebsiteData } = require('../../models');
const { changeStock } = require('../inventory').sharedStockService;
const { getStoreOwnerContact } = require('./merchantContactService');
const NotificationService = require('../notifications').notificationService;
const { fail, uuid, validIdempotencyKey, requiredText, cents, dollars, eligibleStore, checkedProductAndVariant,
  orderView } = require('./marketplaceRules');
const { getDeliveryPolicy, setDeliveryPolicy } = require('./deliveryPolicyService');
const { getCart, setCartItem, updateCartItem, removeCartItem, clearCart, mergeCarts } = require('./marketplaceCartService');
const { buyerOrders, buyerOrder, buyerOrderForStore, sellerOrders, orderEvents, merchantAction,
  buyerReport } = require('./marketplaceOrderService');

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
  uuid(buyerId, 'buyer'); uuid(storeId, 'Store'); validIdempotencyKey(checkoutKey);
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
      if (total !== expectedTotal) {
        const mismatchError = new Error('Cart price or delivery fee changed; refresh before checkout');
        mismatchError.statusCode = 409;
        mismatchError.status = 409;
        mismatchError.code = 'TOTAL_MISMATCH';
        mismatchError.details = {
          expectedTotal: dollars(expectedTotal),
          calculatedTotal: dollars(total),
          subtotal: dollars(subtotal),
          deliveryFee: dollars(deliveryFee),
          taxTotal: '0.00',
          discountTotal: '0.00',
          currency: 'USD',
        };
        throw mismatchError;
      }
      if (total > 100_000_000) fail('Order total is too large');

      let storeName = store.displayName;
      if (!storeName && store.websiteId) {
        const website = await WebsiteData.findOne({
          where: { websiteId: store.websiteId },
          transaction,
          attributes: ['userData'],
        });
        storeName = website?.userData?.businessName || website?.userData?.name || null;
      }
      if (!storeName) storeName = `Store ${storeId.slice(0, 8)}`;

      const lineSnapshots = [];
      for (const { item, product, variant, price } of snapshots) {
        const lineTotalMinor = price * item.quantity;
        lineSnapshots.push({
          productId: product.id,
          productName: product.name,
          variantId: variant?.id || null,
          sku: variant?.sku || product.sku || product.slug,
          barcode: variant?.barcode || product.barcode || null,
          attributes: variant?.optionValues || {},
          unitPrice: dollars(price),
          unitPriceMinor: price,
          quantity: item.quantity,
          discount: '0.00',
          discountMinor: 0,
          tax: '0.00',
          taxMinor: 0,
          taxPolicyVersion: 'release-1-zero-tax',
          deliveryFee: '0.00',
          deliveryFeeMinor: 0,
          commission: '0.00',
          commissionMinor: 0,
          total: dollars(lineTotalMinor),
          totalMinor: lineTotalMinor,
          currency: 'USD',
          productVersion: product.version,
        });
      }

      const orderSnapshot = {
        storeId,
        storeName,
        salesChannel: channel,
        currency: 'USD',
        subtotal: dollars(subtotal),
        subtotalMinor: subtotal,
        deliveryFee: dollars(deliveryFee),
        deliveryFeeMinor: deliveryFee,
        taxTotal: '0.00',
        taxTotalMinor: 0,
        discountTotal: '0.00',
        discountTotalMinor: 0,
        commissionTotal: '0.00',
        commissionTotalMinor: 0,
        totalAmount: dollars(total),
        totalAmountMinor: total,
        deliveryPolicyVersion: policy.version,
        policyVersions: {
          delivery: policy.version,
          tax: 'release-1-zero-tax',
          pricing: 'v1',
        },
        calculatedAt: new Date().toISOString(),
        itemCount: cartItems.length,
        lines: lineSnapshots,
      };

      const order = await Order.create({
        storeId, websiteId: channel === 'storefront' ? store.websiteId : null, buyerId, checkoutKey,
        salesChannel: channel, deliveryStatus: 'pending', orderType: 'delivery',
        status: 'pending', subtotal: dollars(subtotal), totalAmount: dollars(total),
        taxTotal: '0.00', shippingFee: dollars(deliveryFee), discountTotal: '0.00', currency: 'USD',
        customerInfo: { name, phone }, shippingInfo: { address }, stockDeducted: true,
        orderSnapshot,
        metadata: {
          paymentMethod: 'cod',
          deliveryTerms: 'Seller delivers and collects cash directly',
          deliveryPolicyVersion: policy.version,
          commission: '0.00',
          snapshot: orderSnapshot,
        },
      }, { transaction });
      const items = [];
      for (let idx = 0; idx < snapshots.length; idx += 1) {
        const { item, product, variant, price } = snapshots[idx];
        const lineSnapshot = lineSnapshots[idx];
        const line = await OrderItem.create({
          orderId: order.id, productId: product.id, name: product.name,
          variantId: variant?.id || null,
          sku: variant?.sku || product.sku || product.slug, quantity: item.quantity, basePrice: dollars(price),
          price: dollars(price), total: dollars(price * item.quantity),
          baseCurrency: 'USD', currency: 'USD',
          lineSnapshot,
          itemMetadata: {
            seller: { storeId }, category: product.marketplaceCategory || product.categoryId,
            variantId: item.variantId || null,
            tax: '0.00', shipping: '0.00', commission: '0.00', productVersion: product.version,
            snapshot: lineSnapshot,
          },
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

module.exports = { getDeliveryPolicy, setDeliveryPolicy, getCart, setCartItem, updateCartItem, removeCartItem, clearCart, mergeCarts,
  checkout, buyerOrders, buyerOrder, buyerOrderForStore, sellerOrders, orderEvents, merchantAction, buyerReport, checkedProductAndVariant };
