'use strict';

// tools/reconciliation/auditors/refunds.js
// P3-REC-001: Auditor for Refund records and merchant liability invariants.

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers, toCents } = require('../safety');

async function auditRefunds({ commerceModels = {}, storeId = null } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.REFUNDS];
  const { Refund, Payment, OrderEvent } = commerceModels;

  if (!Refund) {
    return {
      id: DOMAINS.REFUNDS,
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

  const whereClause = storeId ? { storeId } : {};
  const refunds = await Refund.findAll({ where: whereClause }).catch(() => []);

  if (!refunds || refunds.length === 0) {
    return {
      id: DOMAINS.REFUNDS,
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

  // Group refunds by paymentId
  const refundsByPayment = new Map();
  for (const ref of refunds) {
    if (!refundsByPayment.has(ref.paymentId)) {
      refundsByPayment.set(ref.paymentId, []);
    }
    refundsByPayment.get(ref.paymentId).push(ref);

    // Verify non-positive or missing amounts
    if (toCents(ref.amount) <= 0) {
      defectsCount++;
      findings.push({
        message: `Refund ${ref.id} has invalid non-positive amount (${ref.amount}).`,
        safeId: ref.id,
        explained: false,
        reason: 'NON_POSITIVE_REFUND_AMOUNT',
      });
    }

    // Verify merchant evidence
    const hasEvidence = Boolean(
      ref.evidence ||
      ref.reference ||
      ref.merchantPayoutEvidence ||
      ref.notes ||
      ref.reason
    );
    if (!hasEvidence && ref.status === 'completed') {
      defectsCount++;
      findings.push({
        message: `Completed Refund ${ref.id} is missing merchant payout evidence or authorization reference.`,
        safeId: ref.id,
        explained: false,
        reason: 'MISSING_MERCHANT_PAYOUT_EVIDENCE',
      });
    }
  }

  // Check payment-level refund bounds
  if (Payment) {
    for (const [paymentId, refList] of refundsByPayment.entries()) {
      if (!paymentId) {
        defectsCount++;
        findings.push({
          message: 'Refund record exists without paymentId association.',
          safeId: refList[0]?.id,
          explained: false,
          reason: 'ORPHAN_REFUND',
        });
        continue;
      }

      const payment = await Payment.findByPk(paymentId).catch(() => null);
      if (!payment) {
        defectsCount++;
        findings.push({
          message: `Refund records point to non-existent Payment ${paymentId}.`,
          safeId: paymentId,
          explained: false,
          reason: 'MISSING_PAYMENT_FOR_REFUND',
        });
        continue;
      }

      const collectedCents = toCents(payment.collectedAmount);
      const paymentRefundedCents = toCents(payment.refundedAmount);
      const sumRefundsCents = refList.reduce((sum, r) => sum + toCents(r.amount), 0);

      // Invariant: refunded <= collected
      if (sumRefundsCents > collectedCents) {
        defectsCount++;
        findings.push({
          message: `Total refunds for Payment ${paymentId} (${sumRefundsCents} cents) exceed collected cash (${collectedCents} cents).`,
          safeId: paymentId,
          explained: false,
          reason: 'REFUNDS_EXCEED_COLLECTED',
        });
      }

      // Invariant: Payment.refundedAmount matches sum of confirmed refunds
      if (paymentRefundedCents !== sumRefundsCents) {
        defectsCount++;
        findings.push({
          message: `Payment ${paymentId} refundedAmount (${paymentRefundedCents} cents) does not match sum of Refund records (${sumRefundsCents} cents).`,
          safeId: paymentId,
          explained: false,
          reason: 'PAYMENT_REFUNDED_SUM_MISMATCH',
        });
      }

      // Cross-check with OrderEvents
      if (OrderEvent && payment.orderId) {
        const events = await OrderEvent.findAll({
          where: { orderId: payment.orderId, type: 'confirm_refund' },
        });
        const eventsSumCents = events.reduce((sum, ev) => sum + toCents(ev.amount), 0);
        if (events.length > 0 && eventsSumCents !== paymentRefundedCents) {
          defectsCount++;
          findings.push({
            message: `Payment ${paymentId} refundedAmount (${paymentRefundedCents} cents) does not match confirm_refund events sum (${eventsSumCents} cents).`,
            safeId: paymentId,
            explained: false,
            reason: 'REFUND_EVENTS_SUM_MISMATCH',
          });
        }
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.REFUNDS,
    name: meta.name,
    status,
    recordsInspected: refunds.length,
    defectsCount,
    explainedCount: 0,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditRefunds };
