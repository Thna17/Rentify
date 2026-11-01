// Validation, money and eligibility rules shared by marketplace and storefront
// carts, checkout and orders.
const { Product, ProductVariant, StoreAccess, WebsiteData } = require('../../models');
const { parseMinor, formatDecimal, Money, assertSupportedOnlineCurrency } = require('../../utils/money');

function fail(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode;
  if (code) error.code = code;
  throw error;
}

function uuid(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    fail(`Invalid ${label}`);
  }
  return value;
}

function validIdempotencyKey(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(value.trim())) {
    fail('Invalid idempotency key');
  }
  return value.trim();
}

function requiredText(value, label, max = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`Invalid ${label}`);
  return value.trim();
}

function cents(value) {
  try {
    return parseMinor(value, 'USD', { allowNegative: false });
  } catch (err) {
    fail('Invalid product price', 409);
  }
}

function dollars(value) {
  if (typeof value === 'string' && /^\d+\.\d{2}$/.test(value)) return value;
  const num = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return formatDecimal(Number.isSafeInteger(num) ? num : 0, 'USD');
}

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
  const { publicationEligibilityService } = require('../catalog');
  if (typeof publicationEligibilityService?.evaluateChannel === 'function') {
    const deliveryPolicy = store?.deliveryPolicy || { flatFee: '0.00' };
    const website = store?.websiteId ? { status: 'active', websiteId: store.websiteId } : undefined;
    const res = publicationEligibilityService.evaluateChannel({
      product,
      store,
      website,
      deliveryPolicy,
      channel,
    });
    return res.eligible;
  }
  if (channel === 'storefront') {
    return product && product.storeId === store.storeId && product.websiteId === store.websiteId &&
      product.status === 'active' && (product.moderationStatus === 'approved' || !product.moderationStatus);
  }
  const vis = product?.marketplaceVisibility ?? null;
  return product && product.storeId === store.storeId && product.status === 'active' &&
    (product.moderationStatus === 'approved' || !product.moderationStatus) &&
    Boolean(product.marketplaceCategory) &&
    (vis === true || (vis === null && store.marketplaceEnabled));
}

async function checkedProductAndVariant(productId, variantId, store, transaction, channel = 'marketplace') {
  const product = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!product || (product.moderationStatus && product.moderationStatus !== 'approved') || !eligibleProduct(product, store, channel)) {
    fail('Product is not available on this sales channel', 409, 'PRODUCT_NOT_ELIGIBLE');
  }

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

  const itemCurrency = String(variant?.currency || product?.currency || 'USD').toUpperCase();
  if (itemCurrency === 'KHR') {
    fail('KHR online checkout is disabled in Release 1. Online checkout is USD only.', 400, 'KHR_CHECKOUT_DISABLED');
  }

  const unitPrice = variant ? variant.price : product.price;
  return { product, variant, unitPrice, currency: itemCurrency };
}

function normalizePaymentMethod(method) {
  if (!method) return 'COD';
  const m = String(method).trim().toUpperCase();
  if (m === 'CUTLUY' || m === 'KHQR') return 'KHQR';
  if (m === 'CASH') return 'CASH';
  if (m === 'COD') return 'COD';
  return m;
}

function normalizePaymentStatus(status) {
  if (!status) return 'pending';
  const s = String(status).trim().toLowerCase();
  if (s === 'completed' || s === 'paid') return 'paid';
  if (s === 'failed') return 'failed';
  if (s === 'expired') return 'expired';
  return s;
}

function orderView(order, items, payment) {
  const normMethod = normalizePaymentMethod(payment?.paymentMethod || order.metadata?.paymentMethod || 'COD');
  const normStatus = normalizePaymentStatus(payment?.status || (order.status === 'cancelled' ? 'failed' : 'pending'));
  return {
    id: order.id, orderNumber: order.orderNumber, storeId: order.storeId, websiteId: order.websiteId,
    buyerId: order.buyerId, status: order.status, deliveryStatus: order.deliveryStatus,
    fulfillmentStatus: order.fulfillmentStatus || 'unfulfilled',
    returnStatus: order.returnStatus || 'none',
    salesChannel: order.salesChannel, subtotal: order.subtotal,
    deliveryFee: order.shippingFee, totalAmount: order.totalAmount, currency: order.currency,
    customerInfo: order.customerInfo, shippingInfo: order.shippingInfo,
    paymentMethod: normMethod,
    paymentStatus: normStatus,
    snapshot: order.orderSnapshot || null,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId, name: item.name, quantity: item.quantity,
      price: item.price, total: item.total, currency: item.currency || order.currency || 'USD',
      seller: item.itemMetadata?.seller,
      category: item.itemMetadata?.category,
      snapshot: item.lineSnapshot || null,
    })),
    payment: payment && {
      id: payment.id,
      paymentMethod: normMethod,
      method: normMethod,
      status: normStatus,
      amount: payment.amount,
      amountDue: payment.amount,
      collectedAmount: payment.collectedAmount,
      refundedAmount: payment.refundedAmount,
      rawQR: payment.transactionData?.rawQR || null,
      qrCodeUrl: payment.transactionData?.qrCodeUrl || payment.transactionData?.checkoutUrl || null,
    },
  };
}

module.exports = {
  fail,
  uuid,
  validIdempotencyKey,
  requiredText,
  cents,
  dollars,
  deliveryFeeCents,
  eligibleStore,
  eligibleProduct,
  checkedProductAndVariant,
  orderView,
  normalizePaymentMethod,
  normalizePaymentStatus,
  Money,
  parseMinor,
  formatDecimal,
  assertSupportedOnlineCurrency,
};
