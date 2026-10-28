'use strict';

// ecommerce-server/modules/payments/codStateMachineService.js
// P3-COD-001: Centralized Cash on Delivery (COD) Payment & Refund State Machine.
// Implements authoritative state transitions for COD:
//   pending -> collected -> partially_refunded -> refunded
//   pending -> failed
//   pending -> cancelled
//
// Invariants:
// 1. Delivery never automatically collects payment (independent state machines).
// 2. Refund request never means refund executed (requires confirmed payout evidence).
// 3. Collection requires actor, time, amount, method, and physical evidence.
// 4. Refund requires confirmed merchant payout evidence (cash voucher or merchant-executed Bakong ref).
// 5. Refund cannot exceed collected amount (accumulates safely for partial refunds).
// 6. Duplicate events and retries have exactly one effect (idempotency key protection).
// 7. Collected minus refunded reconciles mathematically to immutable OrderEvent history.
// 8. Merchant bears financial liability; Rentify does not hold funds or claim escrow.

const { createHash, randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { Payment, Order, OrderEvent, StoreAccess } = require('../../models');
const { parseMinor, formatDecimal } = require('../../utils/money');
const { COD_ERROR_CODES, CodStateError } = require('./codErrors');

const COD_STATES = Object.freeze({
  PENDING: 'pending',
  COLLECTED: 'collected',
  PARTIALLY_REFUNDED: 'partially_refunded',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAID: 'paid', // Alias compatibility for collected
});

const LEGAL_TRANSITIONS = Object.freeze({
  [COD_STATES.PENDING]: [COD_STATES.COLLECTED, COD_STATES.PAID, COD_STATES.FAILED, COD_STATES.CANCELLED],
  [COD_STATES.COLLECTED]: [COD_STATES.PARTIALLY_REFUNDED, COD_STATES.REFUNDED],
  [COD_STATES.PAID]: [COD_STATES.PARTIALLY_REFUNDED, COD_STATES.REFUNDED],
  [COD_STATES.PARTIALLY_REFUNDED]: [COD_STATES.PARTIALLY_REFUNDED, COD_STATES.REFUNDED],
  [COD_STATES.REFUNDED]: [],
  [COD_STATES.FAILED]: [COD_STATES.PENDING], // When delivery is retried
  [COD_STATES.CANCELLED]: [],
});

const ALLOWED_COLLECTION_METHODS = Object.freeze(['cash', 'courier_cod', 'merchant_cod']);
const ALLOWED_REFUND_METHODS = Object.freeze(['cash', 'bakong']);

function validateUuid(val, label) {
  if (typeof val !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())) {
    throw new CodStateError(COD_ERROR_CODES.INVALID_AMOUNT, `Invalid ${label} UUID format: ${val}`, 400);
  }
  return val.trim();
}

function validateIdempotencyKey(key) {
  if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(key.trim())) {
    throw new CodStateError(COD_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey must be 8-64 alphanumeric/dash characters', 400);
  }
  return key.trim();
}

function computeFingerprint(type, amount, details = {}) {
  const normalized = {
    type,
    amount: amount ? String(amount) : null,
    details: details || {},
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Validates collection evidence.
 * Must include non-empty reference / tracking proof.
 */
function validateCollectionEvidence(evidence) {
  if (!evidence) {
    throw new CodStateError(
      COD_ERROR_CODES.EVIDENCE_REQUIRED,
      'Collection evidence is mandatory (receiptRef, voucherNumber, or courierReference)',
      400
    );
  }
  if (typeof evidence === 'string') {
    if (!evidence.trim()) {
      throw new CodStateError(COD_ERROR_CODES.EVIDENCE_REQUIRED, 'Collection evidence cannot be empty', 400);
    }
    return { receiptRef: evidence.trim() };
  }
  if (typeof evidence === 'object') {
    const hasProof = Boolean(
      (evidence.receiptRef && String(evidence.receiptRef).trim()) ||
      (evidence.reference && String(evidence.reference).trim()) ||
      (evidence.voucherNumber && String(evidence.voucherNumber).trim()) ||
      (evidence.courierReference && String(evidence.courierReference).trim()) ||
      (evidence.notes && String(evidence.notes).trim())
    );
    if (!hasProof) {
      throw new CodStateError(
        COD_ERROR_CODES.EVIDENCE_REQUIRED,
        'Collection evidence must contain receiptRef, reference, voucherNumber, or courierReference',
        400
      );
    }
    return evidence;
  }
  throw new CodStateError(COD_ERROR_CODES.EVIDENCE_REQUIRED, 'Invalid collection evidence format', 400);
}

/**
 * Validates confirmed merchant payout evidence for COD refund.
 * Cash requires physical receipt/voucher.
 * Bakong requires merchant-executed transaction hash or transfer ref.
 */
function validatePayoutEvidence(method, evidence) {
  if (!evidence) {
    throw new CodStateError(
      COD_ERROR_CODES.PAYOUT_EVIDENCE_REQUIRED,
      'Confirmed merchant payout evidence is mandatory for COD refund',
      400
    );
  }

  const normMethod = String(method || '').trim().toLowerCase();
  if (normMethod === 'cash') {
    const ref = typeof evidence === 'string'
      ? evidence.trim()
      : (evidence.receiptRef || evidence.voucherNumber || evidence.confirmation || evidence.reference);
    if (!ref || !String(ref).trim()) {
      throw new CodStateError(
        COD_ERROR_CODES.PAYOUT_EVIDENCE_REQUIRED,
        'Cash refund requires confirmed receiptRef or voucherNumber evidence',
        400
      );
    }
    return typeof evidence === 'object' ? evidence : { receiptRef: ref };
  }

  if (normMethod === 'bakong') {
    const ref = typeof evidence === 'string'
      ? evidence.trim()
      : (evidence.transactionHash || evidence.transferRef || evidence.externalRef || evidence.confirmation);
    if (!ref || !String(ref).trim()) {
      throw new CodStateError(
        COD_ERROR_CODES.PAYOUT_EVIDENCE_REQUIRED,
        'Bakong refund requires merchant-executed transactionHash or transferRef evidence',
        400
      );
    }
    return typeof evidence === 'object' ? evidence : { transactionHash: ref };
  }

  throw new CodStateError(
    COD_ERROR_CODES.INVALID_METHOD,
    `Unsupported refund method: "${method}". Must be "cash" or "bakong"`,
    400
  );
}

/**
 * Authoritatively collects COD payment.
 *
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.storeId
 * @param {string} params.actorId
 * @param {string} params.eventKey
 * @param {number|string} params.amount
 * @param {string} [params.method='cash']
 * @param {string|Object} params.evidence
 * @param {Date|string} [params.collectedAt]
 * @param {string} [params.notes]
 * @param {Object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 */
async function collectCodPayment({
  orderId,
  storeId,
  actorId,
  eventKey,
  amount,
  method = 'cash',
  evidence,
  collectedAt = new Date(),
  notes = null,
}, { transaction: parentTx } = {}) {
  validateUuid(orderId, 'order');
  validateUuid(storeId, 'store');
  validateUuid(actorId, 'actor');
  validateIdempotencyKey(eventKey);

  const normMethod = String(method || 'cash').trim().toLowerCase();
  if (!ALLOWED_COLLECTION_METHODS.includes(normMethod)) {
    throw new CodStateError(
      COD_ERROR_CODES.INVALID_METHOD,
      `Invalid collection method "${method}". Allowed: ${ALLOWED_COLLECTION_METHODS.join(', ')}`,
      400
    );
  }

  const validatedEvidence = validateCollectionEvidence(evidence);

  const collectionDate = new Date(collectedAt);
  if (Number.isNaN(collectionDate.getTime())) {
    throw new CodStateError(COD_ERROR_CODES.INVALID_AMOUNT, 'Invalid collectedAt timestamp', 400);
  }
  if (collectionDate.getTime() > Date.now() + 60_000) {
    throw new CodStateError(COD_ERROR_CODES.INVALID_AMOUNT, 'collectedAt cannot be in the future', 400);
  }

  const fingerprint = computeFingerprint('collect_cod', amount, {
    method: normMethod,
    evidence: validatedEvidence,
    actorId,
    collectedAt: collectionDate.toISOString(),
  });

  const execute = async (tx) => {
    // 1. Idempotency replay check
    const priorEvent = await OrderEvent.findOne({
      where: { eventKey },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (priorEvent) {
      if (
        priorEvent.orderId !== orderId ||
        priorEvent.storeId !== storeId ||
        priorEvent.type !== 'collect_cod' ||
        priorEvent.details?._requestHash !== fingerprint
      ) {
        throw new CodStateError(
          COD_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${eventKey} was already used with different parameters`,
          409
        );
      }

      const existingPayment = await Payment.findOne({ where: { orderId }, transaction: tx });
      const existingOrder = await Order.findByPk(orderId, { transaction: tx });
      return { duplicate: true, payment: existingPayment, order: existingOrder, event: priorEvent };
    }

    // 2. Fetch and lock Order & Payment
    const order = await Order.findOne({
      where: { id: orderId, storeId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new CodStateError(COD_ERROR_CODES.ORDER_NOT_FOUND, `Order not found for store: ${orderId}`, 404);
    }

    const payment = await Payment.findOne({
      where: { orderId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!payment) {
      throw new CodStateError(COD_ERROR_CODES.PAYMENT_NOT_FOUND, `Payment not found for order: ${orderId}`, 404);
    }
    if (payment.paymentMethod !== 'COD') {
      throw new CodStateError(
        COD_ERROR_CODES.PAYMENT_METHOD_MISMATCH,
        `Payment method is ${payment.paymentMethod}, not COD`,
        400
      );
    }

    // 3. State verification: must be in pending
    const currentStatus = payment.status;
    if (currentStatus === COD_STATES.COLLECTED || currentStatus === COD_STATES.PAID) {
      throw new CodStateError(
        COD_ERROR_CODES.ALREADY_COLLECTED,
        `COD payment for order ${orderId} has already been collected`,
        409
      );
    }

    const allowedTargets = LEGAL_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(COD_STATES.COLLECTED) && !allowedTargets.includes(COD_STATES.PAID)) {
      throw new CodStateError(
        COD_ERROR_CODES.ILLEGAL_TRANSITION,
        `Cannot collect COD payment in state "${currentStatus}"`,
        400
      );
    }

    // 4. Amount validation: must equal due amount
    const currency = payment.currency || order.currency || 'USD';
    const dueMinor = parseMinor(payment.amount, currency);
    const collectedMinor = parseMinor(amount, currency);

    if (collectedMinor <= 0) {
      throw new CodStateError(COD_ERROR_CODES.INVALID_AMOUNT, 'Collected amount must be positive', 400);
    }
    if (collectedMinor !== dueMinor) {
      throw new CodStateError(
        COD_ERROR_CODES.INVALID_AMOUNT,
        `Collected amount (${formatDecimal(collectedMinor, currency)}) must match amount due (${formatDecimal(dueMinor, currency)})`,
        409
      );
    }

    // 5. Update Payment record
    const amountStr = formatDecimal(collectedMinor, currency);
    const updatedTransactionData = {
      ...(payment.transactionData || {}),
      collection: {
        actorId,
        collectedAt: collectionDate.toISOString(),
        method: normMethod,
        evidence: validatedEvidence,
        notes,
        liabilityParty: 'merchant',
        escrowClaimed: false,
      },
    };

    await payment.update(
      {
        status: COD_STATES.COLLECTED,
        collectedAmount: amountStr,
        collectedAt: collectionDate,
        collectorId: actorId,
        paidAt: collectionDate,
        transactionData: updatedTransactionData,
      },
      { transaction: tx }
    );

    // 6. Record immutable OrderEvent
    const event = await OrderEvent.create(
      {
        id: randomUUID(),
        orderId,
        storeId,
        actorId,
        eventKey,
        type: 'collect_cod',
        amount: amountStr,
        details: {
          previousStatus: currentStatus,
          newStatus: COD_STATES.COLLECTED,
          method: normMethod,
          evidence: validatedEvidence,
          collectedAt: collectionDate.toISOString(),
          notes,
          liabilityParty: 'merchant',
          escrowClaimed: false,
          _requestHash: fingerprint,
        },
      },
      { transaction: tx }
    );

    return { duplicate: false, payment, order, event };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Authoritatively executes a COD refund with confirmed merchant payout evidence.
 * Supports partial refunds accumulating safely up to collectedAmount.
 *
 * @param {Object} params
 * @param {string} params.orderId
 * @param {string} params.storeId
 * @param {string} params.actorId
 * @param {string} params.eventKey
 * @param {number|string} params.amount
 * @param {string} params.method - 'cash' or 'bakong'
 * @param {string|Object} params.evidence - Payout proof
 * @param {string} [params.reason='Merchant payout']
 * @param {Object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 */
async function refundCodPayment({
  orderId,
  storeId,
  actorId,
  eventKey,
  amount,
  method,
  evidence,
  reason = 'Merchant payout',
}, { transaction: parentTx } = {}) {
  validateUuid(orderId, 'order');
  validateUuid(storeId, 'store');
  validateUuid(actorId, 'actor');
  validateIdempotencyKey(eventKey);

  const normMethod = String(method || '').trim().toLowerCase();
  const validatedEvidence = validatePayoutEvidence(normMethod, evidence);

  const fingerprint = computeFingerprint('confirm_refund', amount, {
    method: normMethod,
    evidence: validatedEvidence,
    reason,
    actorId,
  });

  const execute = async (tx) => {
    // 1. Idempotency replay check
    const priorEvent = await OrderEvent.findOne({
      where: { eventKey },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (priorEvent) {
      if (
        priorEvent.orderId !== orderId ||
        priorEvent.storeId !== storeId ||
        priorEvent.type !== 'confirm_refund' ||
        priorEvent.details?._requestHash !== fingerprint
      ) {
        throw new CodStateError(
          COD_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${eventKey} was already used with different parameters`,
          409
        );
      }

      const existingPayment = await Payment.findOne({ where: { orderId }, transaction: tx });
      const existingOrder = await Order.findByPk(orderId, { transaction: tx });
      return { duplicate: true, payment: existingPayment, order: existingOrder, event: priorEvent };
    }

    // 2. Lock Order & Payment
    const order = await Order.findOne({
      where: { id: orderId, storeId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new CodStateError(COD_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    const payment = await Payment.findOne({
      where: { orderId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!payment) {
      throw new CodStateError(COD_ERROR_CODES.PAYMENT_NOT_FOUND, `Payment not found: ${orderId}`, 404);
    }

    const currency = payment.currency || order.currency || 'USD';
    const currentStatus = payment.status;

    // 3. State verification
    if (currentStatus === COD_STATES.PENDING) {
      throw new CodStateError(
        COD_ERROR_CODES.UNCOLLECTED_PAYMENT,
        'Cannot refund uncollected COD payment. Payment must be collected first.',
        409
      );
    }

    if (currentStatus === COD_STATES.REFUNDED) {
      throw new CodStateError(
        COD_ERROR_CODES.ALREADY_FULLY_REFUNDED,
        `Payment for order ${orderId} has already been fully refunded`,
        409
      );
    }

    const allowedTargets = LEGAL_TRANSITIONS[currentStatus] || [];
    if (
      !allowedTargets.includes(COD_STATES.PARTIALLY_REFUNDED) &&
      !allowedTargets.includes(COD_STATES.REFUNDED)
    ) {
      throw new CodStateError(
        COD_ERROR_CODES.ILLEGAL_TRANSITION,
        `Cannot refund COD payment in state "${currentStatus}"`,
        400
      );
    }

    // 4. Amount math & limits
    const refundMinor = parseMinor(amount, currency);
    if (refundMinor <= 0) {
      throw new CodStateError(COD_ERROR_CODES.INVALID_AMOUNT, 'Refund amount must be positive', 400);
    }

    const collectedMinor = parseMinor(payment.collectedAmount, currency);
    const previouslyRefundedMinor = parseMinor(payment.refundedAmount, currency);
    const remainingCollectedMinor = collectedMinor - previouslyRefundedMinor;

    if (refundMinor > remainingCollectedMinor) {
      throw new CodStateError(
        COD_ERROR_CODES.REFUND_EXCEEDS_COLLECTED,
        `Refund amount (${formatDecimal(refundMinor, currency)}) exceeds remaining collected balance (${formatDecimal(remainingCollectedMinor, currency)})`,
        409
      );
    }

    // 5. Compute new state
    const newRefundedMinor = previouslyRefundedMinor + refundMinor;
    const isFullRefund = newRefundedMinor === collectedMinor;
    const targetStatus = isFullRefund ? COD_STATES.REFUNDED : COD_STATES.PARTIALLY_REFUNDED;

    const refundEntry = {
      refundId: randomUUID(),
      amount: formatDecimal(refundMinor, currency),
      cumulativeRefunded: formatDecimal(newRefundedMinor, currency),
      method: normMethod,
      evidence: validatedEvidence,
      reason,
      actorId,
      refundedAt: new Date().toISOString(),
      liabilityParty: 'merchant',
      escrowClaimed: false,
    };

    const existingRefunds = payment.transactionData?.refunds || [];
    const updatedTransactionData = {
      ...(payment.transactionData || {}),
      refunds: [...existingRefunds, refundEntry],
    };

    // 6. Update Payment
    await payment.update(
      {
        status: targetStatus,
        refundedAmount: formatDecimal(newRefundedMinor, currency),
        transactionData: updatedTransactionData,
      },
      { transaction: tx }
    );

    // 7. Write immutable OrderEvent
    const event = await OrderEvent.create(
      {
        id: randomUUID(),
        orderId,
        storeId,
        actorId,
        eventKey,
        type: 'confirm_refund',
        amount: formatDecimal(refundMinor, currency),
        details: {
          previousStatus: currentStatus,
          newStatus: targetStatus,
          method: normMethod,
          evidence: validatedEvidence,
          reason,
          cumulativeRefunded: formatDecimal(newRefundedMinor, currency),
          liabilityParty: 'merchant',
          escrowClaimed: false,
          _requestHash: fingerprint,
        },
      },
      { transaction: tx }
    );

    return { duplicate: false, payment, order, event };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Transitions COD payment to failed (e.g. delivery permanently failed / refused).
 */
async function failCodPayment({
  orderId,
  storeId,
  actorId,
  eventKey,
  reason = 'Delivery failed',
  details = {},
}, { transaction: parentTx } = {}) {
  validateUuid(orderId, 'order');
  validateUuid(storeId, 'store');
  validateUuid(actorId, 'actor');
  validateIdempotencyKey(eventKey);

  const execute = async (tx) => {
    const priorEvent = await OrderEvent.findOne({
      where: { eventKey },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (priorEvent) {
      const existingPayment = await Payment.findOne({ where: { orderId }, transaction: tx });
      const existingOrder = await Order.findByPk(orderId, { transaction: tx });
      return { duplicate: true, payment: existingPayment, order: existingOrder, event: priorEvent };
    }

    const payment = await Payment.findOne({
      where: { orderId, storeId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!payment) {
      throw new CodStateError(COD_ERROR_CODES.PAYMENT_NOT_FOUND, `Payment not found: ${orderId}`, 404);
    }

    if (parseMinor(payment.collectedAmount) > 0 || payment.status === COD_STATES.COLLECTED || payment.status === COD_STATES.PAID) {
      throw new CodStateError(
        COD_ERROR_CODES.CANNOT_FAIL_COLLECTED,
        'Cannot fail COD payment after cash has been collected',
        409
      );
    }

    await payment.update({ status: COD_STATES.FAILED }, { transaction: tx });

    const event = await OrderEvent.create({
      id: randomUUID(),
      orderId,
      storeId,
      actorId,
      eventKey,
      type: 'fail_cod',
      amount: null,
      details: { reason, ...details },
    }, { transaction: tx });

    return { duplicate: false, payment, event };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Transitions COD payment to cancelled (e.g. order cancelled prior to delivery).
 */
async function cancelCodPayment({
  orderId,
  storeId,
  actorId,
  eventKey,
  reason = 'Order cancelled',
}, { transaction: parentTx } = {}) {
  validateUuid(orderId, 'order');
  validateUuid(storeId, 'store');
  validateUuid(actorId, 'actor');
  validateIdempotencyKey(eventKey);

  const execute = async (tx) => {
    const priorEvent = await OrderEvent.findOne({
      where: { eventKey },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (priorEvent) {
      const existingPayment = await Payment.findOne({ where: { orderId }, transaction: tx });
      return { duplicate: true, payment: existingPayment, event: priorEvent };
    }

    const payment = await Payment.findOne({
      where: { orderId, storeId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!payment) {
      throw new CodStateError(COD_ERROR_CODES.PAYMENT_NOT_FOUND, `Payment not found: ${orderId}`, 404);
    }

    if (parseMinor(payment.collectedAmount) > 0 || payment.status === COD_STATES.COLLECTED || payment.status === COD_STATES.PAID) {
      throw new CodStateError(
        COD_ERROR_CODES.CANNOT_CANCEL_COLLECTED,
        'Cannot cancel COD payment after cash collection',
        409
      );
    }

    await payment.update({ status: COD_STATES.CANCELLED }, { transaction: tx });

    const event = await OrderEvent.create({
      id: randomUUID(),
      orderId,
      storeId,
      actorId,
      eventKey,
      type: 'cancel_cod',
      amount: null,
      details: { reason },
    }, { transaction: tx });

    return { duplicate: false, payment, event };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Mathematically reconciles a COD payment with its immutable OrderEvent ledger.
 *
 * @param {string} orderId
 * @param {Object} [options]
 * @param {import('sequelize').Transaction} [options.transaction]
 * @returns {Promise<Object>} Reconciliation report
 */
async function reconcileCodPayment(orderId, { transaction: tx } = {}) {
  validateUuid(orderId, 'order');

  const payment = await Payment.findOne({
    where: { orderId },
    transaction: tx,
  });
  if (!payment) {
    throw new CodStateError(COD_ERROR_CODES.PAYMENT_NOT_FOUND, `Payment not found: ${orderId}`, 404);
  }

  const events = await OrderEvent.findAll({
    where: { orderId },
    order: [['createdAt', 'ASC']],
    transaction: tx,
  });

  const currency = payment.currency || 'USD';
  const discrepancies = [];

  // Sum all collection events
  const collectionEvents = events.filter((e) => e.type === 'collect_cod');
  let eventsCollectedMinor = 0;
  for (const evt of collectionEvents) {
    if (evt.amount) {
      eventsCollectedMinor += parseMinor(evt.amount, currency);
    }
  }

  // Sum all refund events
  const refundEvents = events.filter((e) => e.type === 'confirm_refund');
  let eventsRefundedMinor = 0;
  for (const evt of refundEvents) {
    if (evt.amount) {
      eventsRefundedMinor += parseMinor(evt.amount, currency);
    }
  }

  const paymentCollectedMinor = parseMinor(payment.collectedAmount, currency);
  const paymentRefundedMinor = parseMinor(payment.refundedAmount, currency);

  if (eventsCollectedMinor !== paymentCollectedMinor) {
    discrepancies.push(
      `Collected discrepancy: Payment record has ${formatDecimal(paymentCollectedMinor, currency)} but event history sums to ${formatDecimal(eventsCollectedMinor, currency)}`
    );
  }

  if (eventsRefundedMinor !== paymentRefundedMinor) {
    discrepancies.push(
      `Refunded discrepancy: Payment record has ${formatDecimal(paymentRefundedMinor, currency)} but event history sums to ${formatDecimal(eventsRefundedMinor, currency)}`
    );
  }

  if (paymentRefundedMinor > paymentCollectedMinor) {
    discrepancies.push(
      `Refund overflow: Refunded (${formatDecimal(paymentRefundedMinor, currency)}) exceeds collected (${formatDecimal(paymentCollectedMinor, currency)})`
    );
  }

  // Status consistency check
  let expectedStatus = COD_STATES.PENDING;
  if (paymentCollectedMinor > 0) {
    if (paymentRefundedMinor === 0) {
      expectedStatus = COD_STATES.COLLECTED;
    } else if (paymentRefundedMinor < paymentCollectedMinor) {
      expectedStatus = COD_STATES.PARTIALLY_REFUNDED;
    } else if (paymentRefundedMinor === paymentCollectedMinor) {
      expectedStatus = COD_STATES.REFUNDED;
    }
  } else if (payment.status === COD_STATES.FAILED) {
    expectedStatus = COD_STATES.FAILED;
  } else if (payment.status === COD_STATES.CANCELLED) {
    expectedStatus = COD_STATES.CANCELLED;
  }

  const currentStatus = payment.status;
  const statusMatches = (
    currentStatus === expectedStatus ||
    (currentStatus === COD_STATES.PAID && expectedStatus === COD_STATES.COLLECTED) ||
    (currentStatus === COD_STATES.COMPLETED && expectedStatus === COD_STATES.COLLECTED)
  );

  if (!statusMatches) {
    discrepancies.push(
      `Status mismatch: Current payment status is "${currentStatus}", but arithmetic event history dictates "${expectedStatus}"`
    );
  }

  const netCollectedMinor = paymentCollectedMinor - paymentRefundedMinor;

  return {
    orderId,
    storeId: payment.storeId,
    reconciled: discrepancies.length === 0,
    status: currentStatus,
    expectedStatus,
    paymentCollected: formatDecimal(paymentCollectedMinor, currency),
    eventsCollected: formatDecimal(eventsCollectedMinor, currency),
    paymentRefunded: formatDecimal(paymentRefundedMinor, currency),
    eventsRefunded: formatDecimal(eventsRefundedMinor, currency),
    netCollected: formatDecimal(netCollectedMinor, currency),
    currency,
    discrepancies,
    eventsCount: events.length,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      actorId: e.actorId,
      createdAt: e.createdAt,
      details: e.details,
    })),
  };
}

module.exports = {
  COD_STATES,
  LEGAL_TRANSITIONS,
  ALLOWED_COLLECTION_METHODS,
  ALLOWED_REFUND_METHODS,
  collectCodPayment,
  refundCodPayment,
  failCodPayment,
  cancelCodPayment,
  reconcileCodPayment,
};
