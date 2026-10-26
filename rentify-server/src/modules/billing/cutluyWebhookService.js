'use strict';

// rentify-server/src/modules/billing/cutluyWebhookService.js
// P3-PAY-002: Webhook Ingestion, Inbox Deduplication & Out-of-Order Reducer.
// Ensures signed verification, idempotent processing, out-of-order protection, and audit ledger integrity.

const { randomUUID } = require('node:crypto');
const sequelize = require('../../config/db');
const { PaymentAttempt, ProviderEvent } = require('../../models');
const { verifyWebhookSignature } = require('./cutluyWebhookVerifier');
const { mapProviderStatus, CUTLUY_ERROR_CODES, CutLuyError, ATTEMPT_STATUS } = require('./cutluyErrors');
const { cutluyAdapter } = require('./cutluyAdapter');

const TERMINAL_STATUSES = Object.freeze([
  ATTEMPT_STATUS.PAID,
  ATTEMPT_STATUS.EXPIRED,
  ATTEMPT_STATUS.FAILED,
]);

async function handleWebhook({
  rawBody,
  headers,
  webhookSecret,
  accountRef,
  accountType = 'subscription',
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
  transaction: parentTx,
} = {}) {
  // 1. Validate signature header presence
  const signatureHeader = headers['x-cutluy-signature'] || headers['X-CutLuy-Signature'];
  if (!signatureHeader) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.MISSING_SIGNATURE_HEADER,
      'Missing X-CutLuy-Signature header',
      401
    );
  }

  // 2. Cryptographic signature and timestamp verification (fails closed, constant time)
  const verification = verifyWebhookSignature({
    rawBody,
    signatureHeader,
    webhookSecret,
    toleranceSeconds,
    nowSeconds,
  });

  // 3. Parse JSON body
  let body;
  try {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    body = JSON.parse(bodyStr);
  } catch {
    throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'Malformed JSON in webhook raw body', 400);
  }

  const providerEventId = String(body.event_id || body.id || randomUUID()).trim();
  const providerPaymentId = body.payment_id || body.data?.id || body.data?.payment_id || null;
  const rawStatus = body.status || body.data?.status || 'pending';
  const rawAmount = body.amount !== undefined ? body.amount : body.data?.amount;
  const rawCurrency = String(body.currency || body.data?.currency || 'USD').trim().toUpperCase();
  const referenceId = body.reference_id || body.data?.reference_id || body.referenceId || null;

  // 4. Inbox Deduplication: Check if provider event was already received and processed
  const existingEvent = await ProviderEvent.findOne({
    where: { provider: 'cutluy', providerEventId },
    transaction: parentTx,
  });

  if (existingEvent && existingEvent.processed) {
    return {
      acknowledged: true,
      duplicate: true,
      event: existingEvent,
      message: 'Event already processed',
    };
  }

  // 5. Sanitize payload: strip any QR payload or secret data
  const sanitizedPayload = {
    ...body,
  };
  delete sanitizedPayload.qr_payload;
  delete sanitizedPayload.qr_data;
  delete sanitizedPayload.qr_code;
  delete sanitizedPayload.api_key;
  delete sanitizedPayload.secret;

  const mappedStatus = mapProviderStatus(rawStatus);
  const formattedAmount = rawAmount !== undefined && rawAmount !== null ? Number(rawAmount).toFixed(2) : null;

  const execute = async (tx) => {
    // 6. Persist ProviderEvent into immutable audit ledger before applying business state
    let eventRecord = existingEvent;
    if (!eventRecord) {
      eventRecord = await ProviderEvent.create(
        {
          id: randomUUID(),
          provider: 'cutluy',
          providerEventId,
          eventType: body.event_type || `payment.${rawStatus}`,
          providerPaymentId,
          accountRef,
          status: mappedStatus,
          amount: formattedAmount,
          currency: rawCurrency,
          payload: sanitizedPayload,
          signature: verification.signature,
          processed: false,
        },
        { transaction: tx }
      );
    }

    // 7. Find target PaymentAttempt
    let attempt = null;
    if (referenceId) {
      attempt = await PaymentAttempt.findOne({
        where: { businessReference: String(referenceId).trim() },
        transaction: tx,
        lock: tx.LOCK ? tx.LOCK.UPDATE : undefined,
      });
    }
    if (!attempt && providerPaymentId) {
      attempt = await PaymentAttempt.findOne({
        where: { providerPaymentId: String(providerPaymentId).trim() },
        transaction: tx,
        lock: tx.LOCK ? tx.LOCK.UPDATE : undefined,
      });
    }

    if (!attempt) {
      await eventRecord.update(
        {
          processed: true,
          processedAt: new Date(),
          processingError: `Target PaymentAttempt not found for referenceId=${referenceId}, providerPaymentId=${providerPaymentId}`,
        },
        { transaction: tx }
      );
      return {
        acknowledged: true,
        orphan: true,
        event: eventRecord,
      };
    }

    // Associate attempt with event
    await eventRecord.update({ paymentAttemptId: attempt.id }, { transaction: tx });

    // 8. Security & Scope Validations
    // Check account reference
    if (attempt.accountRef !== accountRef) {
      const err = `Account mismatch: Event accountRef "${accountRef}" does not match attempt "${attempt.accountRef}"`;
      await eventRecord.update({ processed: true, processedAt: new Date(), processingError: err }, { transaction: tx });
      throw new CutLuyError(CUTLUY_ERROR_CODES.WRONG_ACCOUNT, err, 400);
    }

    // Check currency: must be USD
    if (rawCurrency !== 'USD' || attempt.currency !== 'USD') {
      const err = `Currency mismatch: Event currency "${rawCurrency}" vs attempt currency "${attempt.currency}". Must be USD.`;
      await eventRecord.update({ processed: true, processedAt: new Date(), processingError: err }, { transaction: tx });
      throw new CutLuyError(CUTLUY_ERROR_CODES.WRONG_CURRENCY, err, 400);
    }

    // Check amount
    if (formattedAmount !== null && Number(formattedAmount) !== Number(attempt.amount)) {
      const err = `Amount mismatch: Event amount ${formattedAmount} does not equal attempt ${attempt.amount}`;
      await eventRecord.update({ processed: true, processedAt: new Date(), processingError: err }, { transaction: tx });
      throw new CutLuyError(CUTLUY_ERROR_CODES.WRONG_AMOUNT, err, 400);
    }

    // 9. Out-of-Order & Monotonic State Protection
    const currentStatus = attempt.status;
    let transitionAllowed = true;
    let ignoreReason = null;

    if (currentStatus === ATTEMPT_STATUS.PAID) {
      // Terminal paid status can NEVER be downgraded by an expired, failed, or pending event
      if (mappedStatus !== ATTEMPT_STATUS.PAID) {
        transitionAllowed = false;
        ignoreReason = `Ignored out-of-order event "${mappedStatus}" because attempt is already terminal PAID`;
      }
    } else if (TERMINAL_STATUSES.includes(currentStatus)) {
      if (mappedStatus === ATTEMPT_STATUS.PENDING || mappedStatus === ATTEMPT_STATUS.CUSTOMER_ACTION) {
        transitionAllowed = false;
        ignoreReason = `Ignored stale event "${mappedStatus}" because attempt is already terminal "${currentStatus}"`;
      }
    }

    // 10. Apply state transition
    if (transitionAllowed) {
      const updates = {
        status: mappedStatus,
        providerStatus: rawStatus,
        version: attempt.version + 1,
      };

      if (!attempt.providerPaymentId && providerPaymentId) {
        updates.providerPaymentId = providerPaymentId;
      }

      if (mappedStatus === ATTEMPT_STATUS.PAID && !attempt.paidAt) {
        updates.paidAt = new Date();
      } else if (mappedStatus === ATTEMPT_STATUS.EXPIRED && !attempt.expiresAt) {
        updates.expiresAt = new Date();
      } else if (mappedStatus === ATTEMPT_STATUS.FAILED && !attempt.failedAt) {
        updates.failedAt = new Date();
        updates.failureReason = body.failure_reason || body.data?.failure_reason || 'Provider reported failed';
      }

      await attempt.update(updates, { transaction: tx });
    }

    // 11. Mark event as successfully processed
    await eventRecord.update(
      {
        processed: true,
        processedAt: new Date(),
        processingError: ignoreReason,
      },
      { transaction: tx }
    );

    return {
      acknowledged: true,
      duplicate: false,
      attempt,
      event: eventRecord,
      ignored: !transitionAllowed,
      ignoreReason,
    };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

module.exports = {
  handleWebhook,
};
