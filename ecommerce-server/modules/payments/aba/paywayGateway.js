const crypto = require('node:crypto');
const { fail } = require('./errors');

/**
 * ABA PayWay client, ported from KhmerCraft (apps/api/src/modules/payments/payway.gateway.ts).
 * Everything that speaks to ABA and nothing that knows what is being paid for.
 *
 * RETIRED in Release 1: DEC-029 retires direct ABA PayWay for buyer checkout (CutLuy is the sole online path); this module is
 * inert unless PAYWAY_ENABLED=true. The existing KHQR strategy in modules/payments is left
 * untouched ("frozen"); nothing new routes through it.
 *
 * Behaviour verified by KhmerCraft against the PayWay sandbox:
 *   - The merchant account is provisioned for KHQR, so purchase answers JSON
 *     ({ qrString, qrImage, abapay_deeplink, ... }) instead of a hosted checkout page.
 *   - USD only; currency=KHR is rejected with code 12.
 */

const PAYWAY_CURRENCY = 'USD';
const QR_LIFETIME_MINUTES = 30;

const config = () => ({
  enabled: String(process.env.PAYWAY_ENABLED || '').toLowerCase() === 'true',
  // Local-only stand-in for ABA when sandbox keys are unavailable; never honoured in production
  mock: String(process.env.PAYWAY_MOCK || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production',
  merchantId: process.env.PAYWAY_MERCHANT_ID || '',
  apiKey: process.env.PAYWAY_API_KEY || '',
  // Sandbox by default: pointing at live PayWay must be an explicit opt-in
  baseUrl: (process.env.PAYWAY_BASE_URL || 'https://checkout-sandbox.payway.com.kh').replace(/\/+$/, ''),
  callbackUrl: process.env.PAYWAY_CALLBACK_URL ||
    `${(process.env.ECOMMERCE_PUBLIC_URL || 'http://localhost:4001').replace(/\/+$/, '')}/api/payments/aba-payway/callback`,
});

const isEnabled = () => config().enabled;
const isMock = () => config().enabled && config().mock;

// Mock transactions live in memory: a restart forgets them, which only means opening a new QR
const mockTransactions = new Map();
const MOCK_QR_IMAGE = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="white"/>' +
  '<rect x="10" y="10" width="180" height="180" fill="none" stroke="black" stroke-width="6" stroke-dasharray="14 10"/>' +
  '<text x="100" y="96" font-family="sans-serif" font-size="26" font-weight="700" text-anchor="middle">MOCK</text>' +
  '<text x="100" y="128" font-family="sans-serif" font-size="16" text-anchor="middle">not a real QR</text></svg>',
).toString('base64')}`;

function createMockTransaction({ tranId, amount }) {
  mockTransactions.set(tranId, { amount: Number(amount), status: 'PENDING' });
  return {
    tranId,
    amount: Number(amount),
    currency: PAYWAY_CURRENCY,
    qrImage: MOCK_QR_IMAGE,
    qrString: `MOCK-KHQR-${tranId}`,
    mock: true,
    expiresAt: new Date(Date.now() + QR_LIFETIME_MINUTES * 60_000).toISOString(),
  };
}

/** Plays the part of the buyer paying in the ABA app. checkTransaction then reports PAID. */
function approveMockTransaction(tranId) {
  if (!isMock()) fail('Mock payments are turned off on this server', 404, 'PAYWAY_MOCK_DISABLED');
  const transaction = mockTransactions.get(tranId);
  if (!transaction) fail('This QR has expired. Open a new one and try again.', 409, 'PAYWAY_MOCK_UNKNOWN');
  transaction.status = 'PAID';
}

const requireCredentials = () => {
  const { enabled, merchantId, apiKey } = config();
  if (!enabled) fail('ABA PayWay is turned off on this server', 404, 'PAYWAY_DISABLED');
  if (!merchantId || !apiKey) fail('ABA PayWay is not configured on this server yet', 500, 'PAYWAY_NOT_CONFIGURED');
  return { merchantId, apiKey };
};

/** YYYYMMDDHHmmss in UTC, the timestamp format PayWay expects. */
const paywayTimestamp = (date = new Date()) => date.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const base64 = (value) => Buffer.from(value, 'utf8').toString('base64');
const hmacSha512Base64 = (payload, key) => crypto.createHmac('sha512', key).update(payload).digest('base64');

/** The exact field order PayWay concatenates before hashing; empty fields keep their slot. */
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
  `RF${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`.toUpperCase().slice(0, 20);

/** PayWay's status.code is "00" on success, but a number on failure, hence String(). */
const readStatusCode = (body) => ({
  code: String(body?.status?.code ?? ''),
  message: String(body?.status?.message ?? 'Unknown PayWay response'),
});
const readString = (body, key) => (typeof body?.[key] === 'string' && body[key] ? body[key] : undefined);

/** Opens a transaction at ABA and returns the KHQR that pays it. */
async function createTransaction({ tranId, amount, items, firstName, phone, returnParams, successUrl, cancelUrl, shipping }) {
  if (isMock()) return createMockTransaction({ tranId, amount });
  const { merchantId, apiKey } = requireCredentials();
  const { baseUrl, callbackUrl } = config();

  const fields = {
    req_time: paywayTimestamp(),
    merchant_id: merchantId,
    tran_id: tranId,
    amount: Number(amount).toFixed(2),
    items: base64(JSON.stringify(items)),
    shipping: shipping === undefined ? '' : Number(shipping).toFixed(2),
    firstname: firstName || '',
    lastname: '',
    email: '',
    phone: phone || '',
    type: 'purchase',
    // QR for desktop payers plus an ABA app deeplink for phone payers
    payment_option: 'abapay_khqr_deeplink',
    return_url: base64(callbackUrl),
    cancel_url: base64(cancelUrl),
    continue_success_url: base64(successUrl),
    return_deeplink: base64(JSON.stringify({ web_url: successUrl })),
    currency: PAYWAY_CURRENCY,
    custom_fields: '',
    return_params: returnParams || '',
    payout: '',
    lifetime: String(QR_LIFETIME_MINUTES),
    additional_params: '',
    google_pay_token: '',
    skip_success_page: '',
  };

  const form = new FormData();
  Object.entries(fields).forEach(([name, value]) => { if (value !== '') form.append(name, value); });
  form.append('hash', buildPurchaseHash(fields, apiKey));

  const response = await fetch(`${baseUrl}/api/payment-gateway/v1/payments/purchase`, { method: 'POST', body: form });
  const body = await response.json().catch(() => null);
  const { code, message } = readStatusCode(body);
  if (code !== '00') {
    console.error('[payway] purchase rejected:', JSON.stringify(body));
    fail(`ABA PayWay could not start this payment: ${message}`, 502, 'PAYWAY_REQUEST_FAILED');
  }
  const qrImage = readString(body, 'qrImage');
  const qrString = readString(body, 'qrString');
  if (!qrImage || !qrString) {
    console.error('[payway] purchase missing QR:', JSON.stringify(body));
    fail('ABA PayWay did not return a payment QR', 502, 'PAYWAY_REQUEST_FAILED');
  }
  return {
    tranId,
    amount: Number(amount),
    currency: PAYWAY_CURRENCY,
    qrImage,
    qrString,
    deeplink: readString(body, 'abapay_deeplink'),
    appStore: readString(body, 'app_store'),
    playStore: readString(body, 'play_store'),
    expiresAt: new Date(Date.now() + QR_LIFETIME_MINUTES * 60_000).toISOString(),
  };
}

// The outcome lives under `data`; top-level `status` only reports whether the lookup worked
const PAYMENT_STATUS_CODES = { APPROVED: 0, PENDING: 2, DECLINED: 3, REFUNDED: 4, CANCELLED: 7 };
// check-transaction-2 answers 6 for a tran_id PayWay doesn't know yet (first second after creation)
const LOOKUP_TRAN_ID_NOT_FOUND = '6';

/** Asks ABA what really happened. The only status any caller should trust. */
async function checkTransaction(tranId, expected) {
  if (isMock()) return mockTransactions.get(tranId)?.status || 'PENDING';
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
  if (readStatusCode(body).code === LOOKUP_TRAN_ID_NOT_FOUND) return 'PENDING';

  const lookup = readStatusCode(body);
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
    case PAYMENT_STATUS_CODES.PENDING: return 'PENDING';
    default:
      console.warn('[payway] unrecognised check-transaction response:', JSON.stringify(body));
      return 'PENDING';
  }
}

module.exports = {
  PAYWAY_CURRENCY, QR_LIFETIME_MINUTES, isEnabled, isMock, generateTranId, createTransaction, checkTransaction,
  approveMockTransaction,
  // exported for tests
  buildPurchaseHash, HASH_FIELD_ORDER,
};
