'use strict';

// rentify-server/test/security/cutluyPaymentFoundation.test.js
// P3-PAY-002: Exhaustive verification of provider-neutral CutLuy payment foundation.
// Tests:
// - Creation idempotency
// - Paid
// - Expired
// - Failed
// - Invalid signature
// - Stale timestamp
// - Duplicate event
// - Out-of-order event
// - Wrong amount
// - Wrong currency
// - Wrong account
// - Wrong reference
// - Quota
// - Provider outage
// - Replay
// - Reconciliation

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const {
  cutluyAdapter,
  CutLuyAdapter,
  cutluyPaymentService,
  cutluyWebhookService,
  cutluyWebhookVerifier,
  cutluyReconciliationService,
  cutluyReplayService,
  cutluyDiagnostics,
  cutluyErrors,
  CutLuyError,
  CUTLUY_ERROR_CODES,
} = require('../../src/modules/billing');

const {
  validateCutluyConfig,
  CutLuyConfigError,
} = require('../../src/config/cutluyConfig');

const { PaymentAttempt, ProviderEvent } = require('../../src/models');
const sequelize = require('../../src/config/db');

const TEST_SECRET = 'cutluy_test_webhook_secret_9876543210';
const TEST_ACCOUNT_REF = 'rentify_corp_sub_ref';

// Mock in-memory DB collections for fast, reliable, isolated unit testing
function setupMockModels(t) {
  const attempts = new Map();
  const events = new Map();

  t.mock.method(sequelize, 'transaction', async (callback) => {
    return callback({ LOCK: { UPDATE: 'UPDATE' } });
  });

  t.mock.method(PaymentAttempt, 'findOne', async ({ where }) => {
    for (const attempt of attempts.values()) {
      let match = true;
      if (where.idempotencyKey && attempt.idempotencyKey !== where.idempotencyKey) match = false;
      if (where.businessReference && attempt.businessReference !== where.businessReference) match = false;
      if (where.providerPaymentId && attempt.providerPaymentId !== where.providerPaymentId) match = false;
      if (match) return attempt;
    }
    return null;
  });

  t.mock.method(PaymentAttempt, 'findByPk', async (id) => {
    return attempts.get(id) || null;
  });

  t.mock.method(PaymentAttempt, 'create', async (data) => {
    const record = {
      ...data,
      id: data.id || randomUUID(),
      version: data.version || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      update: async function (changes) {
        Object.assign(this, changes, { updatedAt: new Date() });
        attempts.set(this.id, this);
        return this;
      },
    };
    attempts.set(record.id, record);
    return record;
  });

  t.mock.method(ProviderEvent, 'findOne', async ({ where }) => {
    for (const event of events.values()) {
      let match = true;
      if (where.provider && event.provider !== where.provider) match = false;
      if (where.providerEventId && event.providerEventId !== where.providerEventId) match = false;
      if (match) return event;
    }
    return null;
  });

  t.mock.method(ProviderEvent, 'findByPk', async (id) => {
    return events.get(id) || null;
  });

  t.mock.method(ProviderEvent, 'findAll', async ({ where }) => {
    const results = [];
    for (const event of events.values()) {
      let match = true;
      if (where.paymentAttemptId && event.paymentAttemptId !== where.paymentAttemptId) match = false;
      if (match) results.push(event);
    }
    return results;
  });

  t.mock.method(ProviderEvent, 'create', async (data) => {
    const record = {
      ...data,
      id: data.id || randomUUID(),
      replayCount: data.replayCount || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      update: async function (changes) {
        Object.assign(this, changes, { updatedAt: new Date() });
        events.set(this.id, this);
        return this;
      },
    };
    events.set(record.id, record);
    return record;
  });

  return { attempts, events };
}

test('Config: strict boolean, integer bounds, and prohibited variable detection', () => {
  // 1. Prohibited variables
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_STORE_ID: 'store-123' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'PROHIBITED_VARIABLE'
  );
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_SELLER_API_KEY: 'secret-key' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'PROHIBITED_SELLER_GLOBAL_KEY'
  );

  // 2. Strict boolean parsing
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_ENABLED: 'maybe' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'INVALID_BOOLEAN'
  );
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_ENABLED: 'yes' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'INVALID_BOOLEAN'
  );

  // 3. Tolerance integer parsing
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_WEBHOOK_TOLERANCE_SECONDS: '300abc' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'INVALID_TOLERANCE'
  );
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_WEBHOOK_TOLERANCE_SECONDS: '5' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'TOLERANCE_OUT_OF_BOUNDS'
  );
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_WEBHOOK_TOLERANCE_SECONDS: '5000' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'TOLERANCE_OUT_OF_BOUNDS'
  );

  // 4. Required credentials when enabled
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_ENABLED: 'true' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'MISSING_API_KEY'
  );
  assert.throws(
    () => validateCutluyConfig({ CUTLUY_ENABLED: 'true', CUTLUY_API_KEY: 'test-key' }),
    (err) => err instanceof CutLuyConfigError && err.code === 'MISSING_WEBHOOK_SECRET'
  );
  assert.throws(
    () => validateCutluyConfig({
      CUTLUY_ENABLED: 'true',
      CUTLUY_API_KEY: 'test-key',
      CUTLUY_WEBHOOK_SECRET: 'test-secret',
    }),
    (err) => err instanceof CutLuyConfigError && err.code === 'MISSING_SUBSCRIPTION_ACCOUNT_REF'
  );

  // 5. Valid configuration
  const valid = validateCutluyConfig({
    CUTLUY_ENABLED: 'true',
    CUTLUY_API_KEY: 'test-key',
    CUTLUY_WEBHOOK_SECRET: 'test-secret',
    CUTLUY_SUBSCRIPTION_ACCOUNT_REF: 'rentify_corp_sub_ref',
    CUTLUY_WEBHOOK_TOLERANCE_SECONDS: '300',
  });
  assert.equal(valid.enabled, true);
  assert.equal(valid.subscriptionAccountRef, 'rentify_corp_sub_ref');
  assert.equal(valid.webhookToleranceSeconds, 300);
});

test('TEST 1: Creation idempotency', async (t) => {
  setupMockModels(t);

  const idempotencyKey = `idem-${randomUUID()}`;
  const businessReference = 'sub_inv_20261025_001';

  // Initial creation
  const res1 = await cutluyPaymentService.createPaymentAttempt({
    businessReference,
    businessType: 'subscription',
    accountType: 'subscription',
    accountRef: TEST_ACCOUNT_REF,
    amount: '49.00',
    currency: 'USD',
    idempotencyKey,
    metadata: { packageId: 'pkg-pro', userId: 'user-1' },
  });

  assert.equal(res1.duplicate, false);
  assert.equal(res1.attempt.amount, '49.00');
  assert.equal(res1.attempt.currency, 'USD');
  assert.equal(res1.attempt.status, 'pending');
  assert.ok(res1.attempt.checkoutUrl.startsWith('https://checkout.cutluy.com/pay/'));

  // Identical replay
  const res2 = await cutluyPaymentService.createPaymentAttempt({
    businessReference,
    businessType: 'subscription',
    accountType: 'subscription',
    accountRef: TEST_ACCOUNT_REF,
    amount: '49.00',
    currency: 'USD',
    idempotencyKey,
    metadata: { packageId: 'pkg-pro', userId: 'user-1' },
  });

  assert.equal(res2.duplicate, true);
  assert.equal(res2.attempt.id, res1.attempt.id);

  // Conflicting replay with different amount -> throws 409 IDEMPOTENCY_CONFLICT
  await assert.rejects(
    cutluyPaymentService.createPaymentAttempt({
      businessReference,
      businessType: 'subscription',
      accountType: 'subscription',
      accountRef: TEST_ACCOUNT_REF,
      amount: '99.00', // Conflict
      currency: 'USD',
      idempotencyKey,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.IDEMPOTENCY_CONFLICT && err.statusCode === 409
  );
});

test('TEST 2 & 3 & 4: Status transitions - Paid, Expired, and Failed', async (t) => {
  const { attempts } = setupMockModels(t);

  const createAttempt = async (ref, amount = '29.00') => {
    return PaymentAttempt.create({
      id: randomUUID(),
      businessReference: ref,
      accountRef: TEST_ACCOUNT_REF,
      accountType: 'subscription',
      amount,
      currency: 'USD',
      status: 'pending',
      version: 1,
      idempotencyKey: `idem-${ref}`,
    });
  };

  // Paid event
  const attemptPaid = await createAttempt('sub_ref_paid');
  const paidPayload = {
    event_id: 'evt_paid_123',
    status: 'paid',
    reference_id: 'sub_ref_paid',
    amount: '29.00',
    currency: 'USD',
  };
  const rawBodyPaid = JSON.stringify(paidPayload);
  const now = Math.floor(Date.now() / 1000);
  const sigPaid = cutluyWebhookVerifier.signWebhookPayload(rawBodyPaid, TEST_SECRET, now);

  const resPaid = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBodyPaid),
    headers: { 'x-cutluy-signature': sigPaid },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });

  assert.equal(resPaid.acknowledged, true);
  assert.equal(resPaid.attempt.status, 'paid');
  assert.ok(resPaid.attempt.paidAt);
  assert.equal(resPaid.attempt.version, 2);

  // Expired event
  const attemptExpired = await createAttempt('sub_ref_expired');
  const expiredPayload = {
    event_id: 'evt_exp_456',
    status: 'expired',
    reference_id: 'sub_ref_expired',
    amount: '29.00',
    currency: 'USD',
  };
  const rawBodyExp = JSON.stringify(expiredPayload);
  const sigExp = cutluyWebhookVerifier.signWebhookPayload(rawBodyExp, TEST_SECRET, now);

  const resExp = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBodyExp),
    headers: { 'x-cutluy-signature': sigExp },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });

  assert.equal(resExp.acknowledged, true);
  assert.equal(resExp.attempt.status, 'expired');
  assert.ok(resExp.attempt.expiresAt);

  // Failed event
  const attemptFailed = await createAttempt('sub_ref_failed');
  const failedPayload = {
    event_id: 'evt_fail_789',
    status: 'failed',
    reference_id: 'sub_ref_failed',
    amount: '29.00',
    currency: 'USD',
    failure_reason: 'Card decline / insufficient funds',
  };
  const rawBodyFail = JSON.stringify(failedPayload);
  const sigFail = cutluyWebhookVerifier.signWebhookPayload(rawBodyFail, TEST_SECRET, now);

  const resFail = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBodyFail),
    headers: { 'x-cutluy-signature': sigFail },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });

  assert.equal(resFail.acknowledged, true);
  assert.equal(resFail.attempt.status, 'failed');
  assert.ok(resFail.attempt.failedAt);
  assert.equal(resFail.attempt.failureReason, 'Card decline / insufficient funds');
});

test('TEST 5: Invalid signature fails closed with zero side effects', async (t) => {
  setupMockModels(t);

  const now = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({ event_id: 'evt_1', status: 'paid', amount: '50.00', currency: 'USD' });
  const bogusSig = `t=${now},v1=0000000000000000000000000000000000000000000000000000000000000000`;

  await assert.rejects(
    cutluyWebhookService.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: { 'x-cutluy-signature': bogusSig },
      webhookSecret: TEST_SECRET,
      accountRef: TEST_ACCOUNT_REF,
      nowSeconds: now,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.INVALID_SIGNATURE && err.statusCode === 401
  );

  // Missing header
  await assert.rejects(
    cutluyWebhookService.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: {},
      webhookSecret: TEST_SECRET,
      accountRef: TEST_ACCOUNT_REF,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.MISSING_SIGNATURE_HEADER && err.statusCode === 401
  );
});

test('TEST 6: Stale and future timestamp verification', async () => {
  const rawBody = JSON.stringify({ test: 'data' });
  const now = 1729200500;

  // Stale timestamp (drift = 400s > tolerance 300s)
  const staleTime = now - 400;
  const staleSig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, staleTime);

  assert.throws(
    () => cutluyWebhookVerifier.verifyWebhookSignature({
      rawBody,
      signatureHeader: staleSig,
      webhookSecret: TEST_SECRET,
      toleranceSeconds: 300,
      nowSeconds: now,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.STALE_TIMESTAMP
  );

  // Future timestamp (drift = -100s < -60s)
  const futureTime = now + 100;
  const futureSig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, futureTime);

  assert.throws(
    () => cutluyWebhookVerifier.verifyWebhookSignature({
      rawBody,
      signatureHeader: futureSig,
      webhookSecret: TEST_SECRET,
      toleranceSeconds: 300,
      nowSeconds: now,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.FUTURE_TIMESTAMP
  );
});

test('TEST 7: Duplicate event idempotency', async (t) => {
  setupMockModels(t);

  const attempt = await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_dupe',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '15.00',
    currency: 'USD',
    status: 'pending',
    version: 1,
    idempotencyKey: 'idem-dupe-test',
  });

  const payload = {
    event_id: 'evt_dupe_repeat',
    status: 'paid',
    reference_id: 'sub_ref_dupe',
    amount: '15.00',
    currency: 'USD',
  };
  const rawBody = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const sig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, now);

  // First ingestion
  const res1 = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBody),
    headers: { 'x-cutluy-signature': sig },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });
  assert.equal(res1.duplicate, false);
  assert.equal(res1.attempt.version, 2);

  // Duplicate delivery
  const res2 = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBody),
    headers: { 'x-cutluy-signature': sig },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });
  assert.equal(res2.duplicate, true);
  assert.equal(res2.acknowledged, true);
  assert.equal(res1.attempt.version, 2); // No extra mutation
});

test('TEST 8: Out-of-order event handling (terminal paid cannot be downgraded)', async (t) => {
  setupMockModels(t);

  const attempt = await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_ooo',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '35.00',
    currency: 'USD',
    status: 'paid', // Terminal paid
    paidAt: new Date('2026-10-25T10:00:00Z'),
    version: 5,
    idempotencyKey: 'idem-ooo-test',
  });

  // Out-of-order event arrives reporting expired
  const payload = {
    event_id: 'evt_delayed_expired',
    status: 'expired',
    reference_id: 'sub_ref_ooo',
    amount: '35.00',
    currency: 'USD',
  };
  const rawBody = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const sig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, now);

  const res = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBody),
    headers: { 'x-cutluy-signature': sig },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });

  assert.equal(res.acknowledged, true);
  assert.equal(res.ignored, true);
  assert.ok(res.ignoreReason.includes('terminal PAID'));
  assert.equal(attempt.status, 'paid'); // Status preserved!
  assert.equal(attempt.version, 5); // Version preserved!
});

test('TEST 9: Wrong amount rejection', async (t) => {
  setupMockModels(t);

  await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_amt_test',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '50.00', // Expected 50.00
    currency: 'USD',
    status: 'pending',
    version: 1,
    idempotencyKey: 'idem-amt-test',
  });

  const payload = {
    event_id: 'evt_bad_amt',
    status: 'paid',
    reference_id: 'sub_ref_amt_test',
    amount: '10.00', // Wrong amount!
    currency: 'USD',
  };
  const rawBody = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const sig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, now);

  await assert.rejects(
    cutluyWebhookService.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: { 'x-cutluy-signature': sig },
      webhookSecret: TEST_SECRET,
      accountRef: TEST_ACCOUNT_REF,
      nowSeconds: now,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.WRONG_AMOUNT
  );
});

test('TEST 10: Wrong currency rejection (KHR rejected without conversion)', async (t) => {
  setupMockModels(t);

  // 1. Payment creation rejects KHR
  await assert.rejects(
    cutluyPaymentService.createPaymentAttempt({
      businessReference: 'sub_ref_khr',
      accountRef: TEST_ACCOUNT_REF,
      amount: '40000',
      currency: 'KHR',
      idempotencyKey: 'idem-khr',
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.KHR_CURRENCY_NOT_SUPPORTED
  );

  // 2. Webhook rejects non-USD event
  await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_curr_test',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '20.00',
    currency: 'USD',
    status: 'pending',
    version: 1,
    idempotencyKey: 'idem-curr-test',
  });

  const payload = {
    event_id: 'evt_bad_curr',
    status: 'paid',
    reference_id: 'sub_ref_curr_test',
    amount: '20.00',
    currency: 'KHR', // Invalid
  };
  const rawBody = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const sig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, now);

  await assert.rejects(
    cutluyWebhookService.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: { 'x-cutluy-signature': sig },
      webhookSecret: TEST_SECRET,
      accountRef: TEST_ACCOUNT_REF,
      nowSeconds: now,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.WRONG_CURRENCY
  );
});

test('TEST 11: Wrong account rejection (Rentify subscription vs seller isolation)', async (t) => {
  setupMockModels(t);

  // 1. Adapter rejects subscription payment with mismatched accountRef
  assert.throws(
    () => cutluyAdapter.validateAccountScope({
      accountRef: 'seller_account_ref_123',
      accountType: 'subscription', // Mismatch!
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.ACCOUNT_MISMATCH
  );

  // 2. Webhook rejects mismatched accountRef
  await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_acct_test',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '10.00',
    currency: 'USD',
    status: 'pending',
    version: 1,
    idempotencyKey: 'idem-acct-test',
  });

  const payload = {
    event_id: 'evt_bad_acct',
    status: 'paid',
    reference_id: 'sub_ref_acct_test',
    amount: '10.00',
    currency: 'USD',
  };
  const rawBody = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const sig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, now);

  await assert.rejects(
    cutluyWebhookService.handleWebhook({
      rawBody: Buffer.from(rawBody),
      headers: { 'x-cutluy-signature': sig },
      webhookSecret: TEST_SECRET,
      accountRef: 'some_other_merchant_acct', // Mismatch!
      nowSeconds: now,
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.WRONG_ACCOUNT
  );
});

test('TEST 12: Wrong reference handling (orphan event preserved safely)', async (t) => {
  setupMockModels(t);

  const payload = {
    event_id: 'evt_orphan_ref',
    status: 'paid',
    reference_id: 'unknown_reference_99999',
    amount: '50.00',
    currency: 'USD',
  };
  const rawBody = JSON.stringify(payload);
  const now = Math.floor(Date.now() / 1000);
  const sig = cutluyWebhookVerifier.signWebhookPayload(rawBody, TEST_SECRET, now);

  const res = await cutluyWebhookService.handleWebhook({
    rawBody: Buffer.from(rawBody),
    headers: { 'x-cutluy-signature': sig },
    webhookSecret: TEST_SECRET,
    accountRef: TEST_ACCOUNT_REF,
    nowSeconds: now,
  });

  assert.equal(res.acknowledged, true);
  assert.equal(res.orphan, true);
  assert.ok(res.event.processingError.includes('Target PaymentAttempt not found'));
});

test('TEST 13: Quota exhaustion error classification', async () => {
  assert.equal(cutluyAdapter.classifyError({ statusCode: 402 }), CUTLUY_ERROR_CODES.QUOTA_EXHAUSTED);
  assert.equal(cutluyAdapter.classifyError({ response: { status: 402 } }), CUTLUY_ERROR_CODES.QUOTA_EXHAUSTED);

  await assert.rejects(
    cutluyAdapter.createPayment({
      accountRef: TEST_ACCOUNT_REF,
      amount: '50.00',
      currency: 'USD',
      referenceId: 'ref-quota',
      idempotencyKey: 'idem-quota',
      simulatedError: 'QUOTA_EXHAUSTED',
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.QUOTA_EXHAUSTED && err.statusCode === 402
  );
});

test('TEST 14: Provider outage error classification', async () => {
  assert.equal(cutluyAdapter.classifyError({ statusCode: 503 }), CUTLUY_ERROR_CODES.PROVIDER_OUTAGE);
  assert.equal(cutluyAdapter.classifyError({ code: 'ECONNRESET' }), CUTLUY_ERROR_CODES.PROVIDER_OUTAGE);
  assert.equal(cutluyAdapter.classifyError({ code: 'ETIMEDOUT' }), CUTLUY_ERROR_CODES.PROVIDER_OUTAGE);

  await assert.rejects(
    cutluyAdapter.createPayment({
      accountRef: TEST_ACCOUNT_REF,
      amount: '50.00',
      currency: 'USD',
      referenceId: 'ref-outage',
      idempotencyKey: 'idem-outage',
      simulatedError: 'PROVIDER_OUTAGE',
    }),
    (err) => err instanceof CutLuyError && err.code === CUTLUY_ERROR_CODES.PROVIDER_OUTAGE && err.statusCode === 503
  );
});

test('TEST 15: Replay service audits and increments replay count', async (t) => {
  setupMockModels(t);

  const attempt = await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_replay',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '75.00',
    currency: 'USD',
    status: 'pending',
    version: 1,
    idempotencyKey: 'idem-replay-test',
  });

  const event = await ProviderEvent.create({
    id: randomUUID(),
    provider: 'cutluy',
    providerEventId: 'evt_replay_target',
    eventType: 'payment.paid',
    paymentAttemptId: attempt.id,
    accountRef: TEST_ACCOUNT_REF,
    status: 'paid',
    amount: '75.00',
    currency: 'USD',
    payload: { status: 'paid' },
    processed: true,
    replayCount: 0,
  });

  const replayRes = await cutluyReplayService.replayProviderEvent(event.id, {
    actorId: 'operator-alice',
    reason: 'manual_remediation',
  });

  assert.equal(replayRes.replayed, true);
  assert.equal(replayRes.replayCount, 1);
  assert.equal(replayRes.transitionApplied, true);
  assert.equal(attempt.status, 'paid');
});

test('TEST 16: Reconciliation detects discrepancies and repairs missed webhooks', async (t) => {
  setupMockModels(t);

  // Missed webhook scenario: attempt is pending, but provider reports paid
  const attempt = await PaymentAttempt.create({
    id: randomUUID(),
    businessReference: 'sub_ref_reconcile_repair',
    accountRef: TEST_ACCOUNT_REF,
    accountType: 'subscription',
    amount: '60.00',
    currency: 'USD',
    status: 'pending',
    version: 1,
    idempotencyKey: 'idem-recon-repair',
  });

  // Dry run
  const dryReport = await cutluyReconciliationService.reconcilePaymentAttempt(attempt.id, {
    dryRun: true,
    fixtureState: {
      status: 'paid',
      amount: '60.00',
      currency: 'USD',
      reference_id: 'sub_ref_reconcile_repair',
    },
  });
  assert.equal(dryReport.actionTaken, 'mark_paid');
  assert.equal(attempt.status, 'pending'); // Unchanged during dry-run

  // Live reconciliation repair
  const liveReport = await cutluyReconciliationService.reconcilePaymentAttempt(attempt.id, {
    dryRun: false,
    fixtureState: {
      status: 'paid',
      amount: '60.00',
      currency: 'USD',
      reference_id: 'sub_ref_reconcile_repair',
    },
  });
  assert.equal(liveReport.reconciled, true);
  assert.equal(attempt.status, 'paid'); // Repaired!
  assert.equal(attempt.version, 2);

  // Discrepancy scenario: wrong amount and wrong reference
  const discReport = await cutluyReconciliationService.reconcilePaymentAttempt(attempt.id, {
    dryRun: true,
    fixtureState: {
      status: 'paid',
      amount: '100.00', // Mismatched amount
      currency: 'USD',
      reference_id: 'wrong_reference_id', // Mismatched reference
    },
  });
  assert.equal(discReport.reconciled, false);
  assert.equal(discReport.discrepancies.length, 2);
  assert.ok(discReport.discrepancies.some((d) => d.code === CUTLUY_ERROR_CODES.WRONG_AMOUNT));
  assert.ok(discReport.discrepancies.some((d) => d.code === CUTLUY_ERROR_CODES.WRONG_REFERENCE));
});

test('TEST 17: Security & Redaction: secrets and QR payloads are sanitized', () => {
  const sensitiveObj = {
    apiKey: 'cutluy_live_secret_123',
    webhook_secret: 'whsec_abcdef',
    qr_payload: '00020101021229300012bakongkhqr...',
    qr_data: 'raw_qr_bytes',
    safeField: 'Angkor Silk Store',
    nested: {
      token: 'jwt_token_here',
      amount: '50.00',
    },
  };

  const redacted = cutluyDiagnostics.redactSensitiveData(sensitiveObj);
  assert.equal(redacted.apiKey, '[REDACTED]');
  assert.equal(redacted.webhook_secret, '[REDACTED]');
  assert.equal(redacted.qr_payload, '[REDACTED]');
  assert.equal(redacted.qr_data, '[REDACTED]');
  assert.equal(redacted.safeField, 'Angkor Silk Store');
  assert.equal(redacted.nested.token, '[REDACTED]');
  assert.equal(redacted.nested.amount, '50.00');
});
