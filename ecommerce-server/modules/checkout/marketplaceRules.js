// Validation, money and eligibility rules shared by marketplace and storefront
// carts, checkout and orders.
const { Product, ProductVariant, StoreAccess, WebsiteData } = require('../../models');

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

module.exports = { fail, uuid, requiredText, cents, dollars, deliveryFeeCents, eligibleStore, eligibleProduct,
  checkedProductAndVariant, orderView };
