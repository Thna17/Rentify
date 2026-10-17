import { getProductImages } from '@rentify/storefront/commerce';
import { safeUrl } from '@rentify/storefront/content';

/**
 * Receipt snapshot built from the order-creation response, in the same shape
 * as the customer receipt endpoint (`GET /api/order/websites/my-orders/:id`).
 *
 * The confirmation page uses it only when that endpoint cannot return the
 * order. Fields are copied by allowlist: the creation response also carries
 * the payment's raw `transactionData` (merchant Bakong account and business
 * name), which must never be kept in browser state.
 */
export const buildReceiptSnapshot = (result, cartLines = [], shippingDetails = {}) => {
  const order = result?.order;
  if (!order?.id) return null;
  const payment = result.payment;
  const transaction = payment?.transactionData || {};
  const lineFor = (item) =>
    cartLines.find((line) => line.productId === item.productId && (line.variantId || null) === (item.variantId || null)) ||
    cartLines.find((line) => line.productId === item.productId);

  return {
    id: order.id,
    orderNumber: order.orderNumber || null,
    status: order.status || 'pending',
    totalAmount: order.totalAmount,
    currency: order.currency || 'USD',
    createdAt: order.createdAt || null,
    OrderItems: (Array.isArray(result.orderItems) ? result.orderItems : []).map((item, index) => {
      const line = lineFor(item);
      const name = line?.Product?.name || '';
      return {
        id: item.id || `${item.productId}-${index}`,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        Product: { id: item.productId, name, images: getProductImages(line?.Product, name).slice(0, 1) },
      };
    }),
    shippingDetail: {
      name: shippingDetails.name || '',
      phone: shippingDetails.phone || '',
      province: shippingDetails.province || '',
      district: shippingDetails.district || '',
      commune: shippingDetails.commune || '',
      street: shippingDetails.street || '',
      note: shippingDetails.note || '',
    },
    payment: payment
      ? {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          qrCodeUrl: safeUrl(transaction.qrCodeUrl),
          rawQR: typeof transaction.rawQR === 'string' ? transaction.rawQR : null,
        }
      : null,
  };
};
