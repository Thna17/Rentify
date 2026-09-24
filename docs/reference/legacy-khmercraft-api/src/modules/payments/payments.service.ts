import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Order, { IOrder } from '../../../models/Order';
import { IUser } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { env } from '../../config/env';

/**
 * ABA PayWay integration — the "Purchase" hosted-checkout flow.
 *
 * The request shape, hash field order, and the check-transaction-2 response
 * shape below were confirmed against ABA's own live API reference at
 * developer.payway.com.kh while this was written (Ecommerce Checkout >
 * Purchase / Check transaction) — not reconstructed from memory. Two things
 * still can't be verified without a real merchant account, though:
 *   1. Get sandbox credentials (PAYWAY_MERCHANT_ID / PAYWAY_API_KEY) from
 *      ABA's sandbox registration (sandbox.payway.com.kh/register-sandbox)
 *      and put them in apps/api/.env.local — never in chat, never committed.
 *   2. PAYWAY_CALLBACK_URL must be a URL ABA's servers can reach — a tunnel
 *      (ngrok/cloudflared) to this API in dev, the real API host in
 *      production. localhost will never receive the callback.
 * Run one real sandbox checkout once credentials exist; if PayWay responds
 * "invalid hash", re-check `buildPurchaseHash` against the current docs
 * first, since that's the one thing ABA has revised before.
 */

const requireCredentials = () => {
  if (!env.paywayMerchantId || !env.paywayApiKey) {
    throw new AppError(
      500,
      'ABA PayWay is not configured on this server yet',
      'PAYWAY_NOT_CONFIGURED',
    );
  }
  return { merchantId: env.paywayMerchantId, apiKey: env.paywayApiKey };
};

/** YYYYMMDDHHmmss in UTC, the timestamp format PayWay's API expects. */
const paywayTimestamp = (date = new Date()): string =>
  date.toISOString().replace(/[-:T]/g, '').slice(0, 14);

const base64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');

const hmacSha512Base64 = (payload: string, key: string): string =>
  crypto.createHmac('sha512', key).update(payload).digest('base64');

/**
 * The Purchase request's hash: HMAC-SHA512 of every field concatenated in
 * this exact order (unused fields are still included, as empty strings —
 * omitting them from the string is a different, also-wrong hash, not a
 * shorter valid one).
 */
const buildPurchaseHash = (
  fields: {
    reqTime: string;
    merchantId: string;
    tranId: string;
    amount: string;
    items: string;
    shipping: string;
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    type: string;
    paymentOption: string;
    returnUrl: string;
    cancelUrl: string;
    continueSuccessUrl: string;
    returnDeeplink: string;
    currency: string;
    customFields: string;
    returnParams: string;
    payout: string;
    lifetime: string;
    additionalParams: string;
    googlePayToken: string;
    skipSuccessPage: string;
  },
  apiKey: string,
): string =>
  hmacSha512Base64(
    fields.reqTime +
      fields.merchantId +
      fields.tranId +
      fields.amount +
      fields.items +
      fields.shipping +
      fields.firstname +
      fields.lastname +
      fields.email +
      fields.phone +
      fields.type +
      fields.paymentOption +
      fields.returnUrl +
      fields.cancelUrl +
      fields.continueSuccessUrl +
      fields.returnDeeplink +
      fields.currency +
      fields.customFields +
      fields.returnParams +
      fields.payout +
      fields.lifetime +
      fields.additionalParams +
      fields.googlePayToken +
      fields.skipSuccessPage,
    apiKey,
  );

/**
 * tran_id is capped at 20 characters by PayWay — generated fresh per attempt
 * (not derived from the order number, which alone can already be close to
 * that limit) so a retried payment gets a new id. Matching it back to the
 * order goes through `paymentTranId` on the Order document instead.
 */
const generateTranId = (): string =>
  `KC${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`
    .toUpperCase()
    .slice(0, 20);

const loadOwnedPendingOrder = async (
  user: IUser,
  orderId: string,
): Promise<InstanceType<typeof Order>> => {
  const order = mongoose.isValidObjectId(orderId)
    ? await Order.findById(orderId)
    : await Order.findOne({ orderNumber: orderId.toUpperCase() });

  if (!order || String(order.buyerId) !== String(user._id)) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.paymentMethod !== 'ABA_PAYWAY') {
    throw new AppError(
      400,
      'This order was not placed with ABA PayWay',
      'WRONG_PAYMENT_METHOD',
    );
  }

  if (order.paymentStatus === 'PAID') {
    throw new AppError(400, 'This order is already paid', 'ALREADY_PAID');
  }

  return order;
};

/**
 * Builds the params + hash for the hosted checkout form. The web app POSTs
 * these fields (as returned, verbatim) to `checkoutUrl` to hand the buyer off
 * to PayWay's own payment page — this never touches card details itself.
 */
export const createCheckoutSession = async (user: IUser, orderId: string) => {
  const { merchantId, apiKey } = requireCredentials();
  const order = await loadOwnedPendingOrder(user, orderId);

  const tranId = generateTranId();
  const reqTime = paywayTimestamp();

  const items = base64(
    JSON.stringify(
      order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.price,
      })),
    ),
  );

  const successUrl = `${env.webUrl}/order-success?order=${encodeURIComponent(order.orderNumber)}`;
  const cancelUrl = `${env.webUrl}/checkout?order=${encodeURIComponent(order.orderNumber)}&payment=cancelled`;

  const fields = {
    reqTime,
    merchantId,
    tranId,
    amount: order.totalAmount.toFixed(2),
    items,
    shipping: '',
    firstname: order.buyerName,
    lastname: '',
    email: '',
    phone: order.buyerPhone,
    type: 'purchase',
    paymentOption: '', // '' lets the buyer pick card / KHQR / ABA account on PayWay's own page
    returnUrl: base64(env.paywayCallbackUrl), // server-to-server webhook, see payments.controller.ts#callback
    cancelUrl: base64(cancelUrl),
    continueSuccessUrl: base64(successUrl),
    returnDeeplink: '',
    currency: 'USD',
    customFields: '',
    returnParams: '',
    payout: '',
    lifetime: '',
    additionalParams: '',
    googlePayToken: '',
    skipSuccessPage: '',
  };

  const hash = buildPurchaseHash(fields, apiKey);

  order.paymentTranId = tranId;
  await order.save();

  return {
    checkoutUrl: `${env.paywayBaseUrl}/api/payment-gateway/v1/payments/purchase`,
    // Field names exactly as PayWay's form expects them (snake_case), so the
    // frontend can render this straight into hidden form inputs.
    fields: {
      req_time: fields.reqTime,
      merchant_id: fields.merchantId,
      tran_id: fields.tranId,
      amount: fields.amount,
      items: fields.items,
      firstname: fields.firstname,
      phone: fields.phone,
      type: fields.type,
      return_url: fields.returnUrl,
      cancel_url: fields.cancelUrl,
      continue_success_url: fields.continueSuccessUrl,
      currency: fields.currency,
      hash,
    },
  };
};

/**
 * Asks PayWay directly what a transaction's real status is, rather than
 * trusting the webhook payload's own signature — the callback's exact
 * "prove this came from PayWay" field set is the part of their docs most
 * likely to have moved since this was written, whereas this request is
 * signed the same well-documented way as the Purchase request above, which
 * this codebase fully controls. Treat the webhook as "go check now", not as
 * proof by itself.
 */
/**
 * Confirmed against ABA's live Developer Suite docs (developer.payway.com.kh)
 * while building this — not a guess. The response nests the actual payment
 * result under `data`; the top-level `status` object is just the API call's
 * own request-status wrapper ({code, message, tran_id}), not the payment
 * outcome — an earlier version of this function read the wrong field.
 */
const PAYMENT_STATUS_CODES = {
  APPROVED: 0,
  PENDING: 2,
  DECLINED: 3,
  REFUNDED: 4,
  CANCELLED: 7,
} as const;

const checkTransactionStatus = async (
  tranId: string,
): Promise<'PAID' | 'FAILED' | 'PENDING' | 'REFUNDED'> => {
  const { merchantId, apiKey } = requireCredentials();
  const reqTime = paywayTimestamp();
  const hash = hmacSha512Base64(reqTime + merchantId + tranId, apiKey);

  const response = await fetch(
    `${env.paywayBaseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        req_time: reqTime,
        merchant_id: merchantId,
        tran_id: tranId,
        hash,
      }),
    },
  );

  const body: unknown = await response.json().catch(() => null);
  // Logged in full so a real sandbox transaction is easy to inspect if a
  // future ABA API revision shifts this shape again.
  console.info('[payway] check-transaction response:', JSON.stringify(body));

  const data =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>)['data']
      : undefined;
  const code =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>)['payment_status_code']
      : undefined;

  switch (code) {
    case PAYMENT_STATUS_CODES.APPROVED:
      return 'PAID';
    case PAYMENT_STATUS_CODES.DECLINED:
    case PAYMENT_STATUS_CODES.CANCELLED:
      return 'FAILED';
    case PAYMENT_STATUS_CODES.REFUNDED:
      return 'REFUNDED';
    default:
      return 'PENDING';
  }
};

const appendStatusEvent = (order: IOrder, note: string) => {
  order.statusHistory.push({
    status: order.orderStatus,
    at: new Date(),
    by: 'SYSTEM',
    note,
  });
};

/**
 * Handles PayWay's webhook. Never trusts the payload's own claimed status —
 * looks the order up by tran_id, then independently asks PayWay what really
 * happened before writing anything.
 */
export const handleCallback = async (payload: Record<string, unknown>) => {
  const tranId = String(payload['tran_id'] ?? '');
  if (!tranId) {
    throw new AppError(400, 'Missing tran_id', 'VALIDATION_ERROR');
  }

  const order = await Order.findOne({ paymentTranId: tranId });
  if (!order) {
    // Acknowledge anyway: PayWay retries a webhook that doesn't get a 2xx,
    // and retrying forever changes nothing for a tran_id that will never
    // match an order.
    console.warn('[payway] callback for unknown tran_id:', tranId);
    return;
  }

  if (order.paymentStatus === 'PAID') {
    return; // already settled — a duplicate/retried webhook is a no-op
  }

  const status = await checkTransactionStatus(tranId);

  if (status === 'PAID') {
    order.paymentStatus = 'PAID';
    appendStatusEvent(order, `ABA PayWay payment confirmed (tran_id ${tranId})`);
    await order.save();
  } else if (status === 'FAILED') {
    order.paymentStatus = 'FAILED';
    appendStatusEvent(order, `ABA PayWay payment failed (tran_id ${tranId})`);
    await order.save();
  } else if (status === 'REFUNDED') {
    order.paymentStatus = 'REFUNDED';
    appendStatusEvent(order, `ABA PayWay payment refunded (tran_id ${tranId})`);
    await order.save();
  }
  // PENDING: leave it as-is; a later webhook or status check will resolve it.
};
