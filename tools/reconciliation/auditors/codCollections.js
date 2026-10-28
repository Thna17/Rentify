'use strict';

// tools/reconciliation/auditors/codCollections.js
// P3-REC-001: Auditor for Cash on Delivery (COD) collection state machine (P3-COD-001).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers, toCents } = require('../safety');

async function auditCodCollections({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.COD_COLLECTIONS];
  const { Payment, Order, OrderEvent } = commerceModels;

  if (!Payment) {
    return {
      id: DOMAINS.COD_COLLECTIONS,
      name: meta.name,
      status: DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE,
      recordsInspected: 0,
      defectsCount: 0,
      explainedCount: 0,
      sampledSafeIdentifiers: [],
      suggestedOwningPackage: meta.owningPackage,
      operatorGuidance: meta.defaultGuidance,
      findings: [],
    };
  }

  const whereClause = { paymentMethod: 'COD', ...(storeId ? { storeId } : {}) };
  const payments = await Payment.findAll({ where: whereClause }).catch(() => []);

  if (!payments || payments.length === 0) {
    return {
      id: DOMAINS.COD_COLLECTIONS,
      name: meta.name,
      status: DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE,
      recordsInspected: 0,
      defectsCount: 0,
      explainedCount: 0,
      sampledSafeIdentifiers: [],
      suggestedOwningPackage: meta.owningPackage,
      operatorGuidance: meta.defaultGuidance,
      findings: [],
    };
  }

  const findings = [];
  let defectsCount = 0;

  for (const payment of payments) {
    const dueCents = toCents(payment.amount);
    const collectedCents = toCents(payment.collectedAmount);
    const refundedCents = toCents(payment.refundedAmount);

    // 1. Invariant: collected <= due
    if (collectedCents > dueCents) {
      defectsCount++;
      findings.push({
        message: `Payment ${payment.id} collectedAmount (${collectedCents} cents) exceeds due amount (${dueCents} cents).`,
        safeId: payment.id,
        explained: false,
        reason: 'COLLECTED_EXCEEDS_DUE',
      });
    }

    // 2. Status invariants
    if (payment.status === 'pending' && collectedCents !== 0) {
      defectsCount++;
      findings.push({
        message: `Payment ${payment.id} is marked "pending", but has collected cash (${collectedCents} cents).`,
        safeId: payment.id,
        explained: false,
        reason: 'PENDING_PAYMENT_HAS_CASH',
      });
    }

    if ((payment.status === 'paid' || payment.status === 'collected') && collectedCents !== dueCents) {
      defectsCount++;
      findings.push({
        message: `Payment ${payment.id} is marked "${payment.status}", but collected (${collectedCents} cents) != due (${dueCents} cents).`,
        safeId: payment.id,
        explained: false,
        reason: 'COLLECTED_STATUS_NOT_FULLY_COLLECTED',
      });
    }

    if (payment.status === 'partially_refunded' && (refundedCents <= 0 || refundedCents >= collectedCents)) {
      defectsCount++;
      findings.push({
        message: `Payment ${payment.id} is marked "partially_refunded", but refunded (${refundedCents}) is not between 0 and collected (${collectedCents}).`,
        safeId: payment.id,
        explained: false,
        reason: 'INVALID_PARTIAL_REFUND_BOUNDS',
      });
    }

    if (payment.status === 'refunded' && refundedCents !== collectedCents) {
      defectsCount++;
      findings.push({
        message: `Payment ${payment.id} is marked "refunded", but refunded (${refundedCents}) != collected (${collectedCents}).`,
        safeId: payment.id,
        explained: false,
        reason: 'REFUNDED_STATUS_NOT_MATCHING_COLLECTED',
      });
    }

    // 3. Reconcile with OrderEvent "collect_cod" records
    if (OrderEvent && payment.orderId) {
      const events = await OrderEvent.findAll({
        where: { orderId: payment.orderId, type: 'collect_cod' },
      });
      const recordedEventsSumCents = events.reduce((sum, ev) => sum + toCents(ev.amount), 0);
      if (events.length > 0 && recordedEventsSumCents !== collectedCents) {
        defectsCount++;
        findings.push({
          message: `Payment ${payment.id} collectedAmount (${collectedCents} cents) does not match recorded collect_cod events sum (${recordedEventsSumCents} cents).`,
          safeId: payment.id,
          explained: false,
          reason: 'COLLECT_EVENTS_SUM_MISMATCH',
        });
      }
    }

    // 4. Cancelled order check
    if (Order && payment.orderId) {
      const order = await Order.findByPk(payment.orderId).catch(() => null);
      if (order && order.status === 'cancelled' && collectedCents > 0 && refundedCents < collectedCents) {
        defectsCount++;
        findings.push({
          message: `Cancelled Order ${order.id} retains unrefunded collected cash (${collectedCents - refundedCents} cents).`,
          safeId: order.id,
          explained: false,
          reason: 'CANCELLED_ORDER_UNREFUNDED_CASH',
        });
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.COD_COLLECTIONS,
    name: meta.name,
    status,
    recordsInspected: payments.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditCodCollections };
