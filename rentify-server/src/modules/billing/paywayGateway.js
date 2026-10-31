const crypto = require('node:crypto');

/**
 * ABA PayWay client for plan payments, ported from KhmerCraft
 * (docs/reference/legacy-khmercraft-api/src/modules/payments/payments.service.ts) via the
 * ecommerce-server aba module. Same HMAC-SHA512 purchase hash, same check-transaction-2
 * status codes. The sandbox merchant is provisioned for KHQR, so `purchase` answers JSON
 * ({ qrString, qrImage, abapay_deeplink }) instead of a hosted page. USD only.
 */
const PAYWAY_CURRENCY = 'USD';
const QR_LIFETIME_MINUTES = 10;

const fail = (message, statusCode = 502, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
};

const config = () => ({
  merchantId: process.env.PAYWAY_MERCHANT_ID || '',
  apiKey: process.env.PAYWAY_API_KEY || '',
  baseUrl: (process.env.PAYWAY_BASE_URL || 'https://checkout-sandbox.payway.com.kh').replace(/\/+$/, ''),
  callbackUrl: process.env.PAYWAY_CALLBACK_URL || 'http://localhost:4000/api/payment/payway/callback',
  returnUrl: process.env.PAYWAY_RETURN_URL || 'http://localhost:4200/onboarding',
});

const requireCredentials = () => {
  const { merchantId, apiKey } = config();
  if (!merchantId || !apiKey) fail('ABA PayWay is not configured on this server yet', 500, 'PAYWAY_NOT_CONFIGURED');
  return { merchantId, apiKey };
};

/** YYYYMMDDHHmmss in UTC, the timestamp format PayWay expects. */
const paywayTimestamp = (date = new Date()) => date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const base64 = (value) => Buffer.from(value, 'utf8').toString('base64');
const hmacSha512Base64 = (payload, key) => crypto.createHmac('sha512', key).update(payload).digest('base64');

/** Exact field order PayWay concatenates before hashing; empty fields keep their slot. */
const HASH_FIELD_ORDER = [
  'req_time', 'merchant_id', 'tran_id', 'amount', 'items', 'shipping', 'firstname', 'lastname',
  'email', 'phone', 'type', 'payment_option', 'return_url', 'cancel_url', 'continue_success_url',
  'return_deeplink', 'currency', 'custom_fields', 'return_params', 'payout', 'lifetime',
  'additional_params', 'google_pay_token', 'skip_success_page',
];
const buildPurchaseHash = (fields, apiKey) =>
  hmacSha512Base64(HASH_FIELD_ORDER.map((field) => fields[field] || '').join(''), apiKey);

/** tran_id is capped at 20 characters; a fresh one per attempt so retries never collide. */
const generateTranId = () =>
  `RP${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`.toUpperCase().slice(0, 20);

const readStatus = (body) => ({
  code: String(body?.status?.code ?? ''),
  message: String(body?.status?.message ?? 'Unknown PayWay response'),
});
const readString = (body, key) => (typeof body?.[key] === 'string' && body[key] ? body[key] : undefined);

/** Opens a transaction at ABA and returns the QR that pays it. */
async function createTransaction({ tranId, amount, items }) {
  const { merchantId, apiKey } = requireCredentials();
  const { baseUrl, callbackUrl, returnUrl } = config();
  const fields = {
    req_time: paywayTimestamp(),
    merchant_id: merchantId,
    tran_id: tranId,
    amount: Number(amount).toFixed(2),
    items: base64(JSON.stringify(items)),
    shipping: '', firstname: '', lastname: '', email: '', phone: '',
    type: 'purchase',
    payment_option: 'abapay_khqr_deeplink',
    return_url: base64(callbackUrl),
    cancel_url: base64(returnUrl),
    continue_success_url: base64(returnUrl),
    return_deeplink: base64(JSON.stringify({ web_url: returnUrl })),
    currency: PAYWAY_CURRENCY,
    custom_fields: '', return_params: '', payout: '',
    lifetime: String(QR_LIFETIME_MINUTES),
    additional_params: '', google_pay_token: '', skip_success_page: '',
  };

  const form = new FormData();
  Object.entries(fields).forEach(([name, value]) => { if (value !== '') form.append(name, value); });
  form.append('hash', buildPurchaseHash(fields, apiKey));

  const response = await fetch(`${baseUrl}/api/payment-gateway/v1/payments/purchase`, { method: 'POST', body: form });
  const body = await response.json().catch(() => null);
  const { code, message } = readStatus(body);
  if (code !== '00') {
    console.error('[payway] purchase rejected:', JSON.stringify(body));
    fail(`ABA PayWay could not start this payment: ${message}`, 502, 'PAYWAY_REQUEST_FAILED');
  }
  const qrString = readString(body, 'qrString');
  if (!qrString) {
    console.error('[payway] purchase missing QR:', JSON.stringify(body));
    fail('ABA PayWay did not return a payment QR', 502, 'PAYWAY_REQUEST_FAILED');
  }
  return {
    tranId,
    qrString,
    deeplink: readString(body, 'abapay_deeplink') || null,
    expiresAt: new Date(Date.now() + QR_LIFETIME_MINUTES * 60_000).toISOString(),
  };
}

// The outcome lives under `data`; top-level `status` only reports whether the lookup worked
const PAYMENT_STATUS_CODES = { APPROVED: 0, PENDING: 2, DECLINED: 3, REFUNDED: 4, CANCELLED: 7 };

/** Asks ABA what really happened. Returns PAID | PENDING | FAILED | REFUNDED. */
async function checkTransaction(tranId, expected) {
  const { merchantId, apiKey } = requireCredentials();
  const { baseUrl } = config();
  const reqTime = paywayTimestamp();
  const hash = hmacSha512Base64(reqTime + merchantId + tranId, apiKey);
  const response = await fetch(`${baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ req_time: reqTime, merchant_id: merchantId, tran_id: tranId, hash }),
  });
  const body = await response.json().catch(() => null);
  const lookup = readStatus(body);
  if (lookup.code === '6') return 'PENDING';
  if (response.ok === false || !['00', '0'].includes(lookup.code)) {
    fail('ABA PayWay could not verify this payment. Please retry.', 502, 'PAYWAY_VERIFICATION_FAILED');
  }
  if (expected && Number(body?.data?.payment_status_code) === PAYMENT_STATUS_CODES.APPROVED) {
    const amount = Number(body?.data?.original_amount);
    const currency = body?.data?.payment_currency;
    const reference = body?.status?.tran_id;
    if (!Number.isFinite(amount) || amount <= 0 ||
        Math.round(amount * 100) !== Math.round(Number(expected.amount) * 100) ||
        currency !== (expected.currency || 'USD') || reference !== tranId) {
      fail('ABA payment details do not match this purchase.', 409, 'PAYMENT_DETAILS_MISMATCH');
    }
  }
  switch (body?.data?.payment_status_code == null ? -1 : Number(body.data.payment_status_code)) {
    case PAYMENT_STATUS_CODES.APPROVED: return 'PAID';
    case PAYMENT_STATUS_CODES.DECLINED:
    case PAYMENT_STATUS_CODES.CANCELLED: return 'FAILED';
    case PAYMENT_STATUS_CODES.REFUNDED: return 'REFUNDED';
    default: return 'PENDING';
  }
}

module.exports = { generateTranId, createTransaction, checkTransaction };
