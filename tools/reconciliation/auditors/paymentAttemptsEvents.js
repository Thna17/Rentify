'use strict';

// tools/reconciliation/auditors/paymentAttemptsEvents.js
// P3-REC-001: Auditor for CutLuy payment attempts and immutable provider events (P3-PAY-002).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers, toCents } = require('../safety');

const WEBHOOK_IN_FLIGHT_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

async function auditPaymentAttemptsEvents({ coreModels = {}, storeId = null, now = new Date() } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.PAYMENT_ATTEMPTS_EVENTS];
  const { PaymentAttempt, ProviderEvent } = coreModels;

  if (!PaymentAttempt) {
    return {
      id: DOMAINS.PAYMENT_ATTEMPTS_EVENTS,
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

  // If storeId is provided, subscription attempts may not have storeId unless stored in metadata or businessReference
  const attempts = await PaymentAttempt.findAll().catch(() => []);
  const filteredAttempts = storeId
    ? attempts.filter((a) => a.accountRef === storeId || a.businessReference?.includes(storeId))
    : attempts;

  if (!filteredAttempts || filteredAttempts.length === 0) {
    return {
      id: DOMAINS.PAYMENT_ATTEMPTS_EVENTS,
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
  let explainedCount = 0;
  let totalEventsInspected = 0;
  const currentTimeMs = new Date(now).getTime();

  for (const attempt of filteredAttempts) {
    // 1. Currency invariant (USD only)
    if (attempt.currency !== 'USD') {
      defectsCount++;
      findings.push({
        message: `PaymentAttempt ${attempt.id} has invalid currency "${attempt.currency}" (only USD is accepted).`,
        safeId: attempt.id,
        explained: false,
        reason: 'UNSUPPORTED_PAYMENT_CURRENCY',
      });
    }

    // 2. Account scope check
    if (attempt.accountType === 'subscription' && attempt.businessType === 'order') {
      defectsCount++;
      findings.push({
        message: `PaymentAttempt ${attempt.id} mixes subscription accountType with order businessType.`,
        safeId: attempt.id,
        explained: false,
        reason: 'ACCOUNT_TYPE_MISMATCH',
      });
    }

    // 3. Events check
    if (ProviderEvent) {
      const events = await ProviderEvent.findAll({ where: { paymentAttemptId: attempt.id } });
      totalEventsInspected += events.length;

      for (const ev of events) {
        if (ev.amount && toCents(ev.amount) !== toCents(attempt.amount)) {
          defectsCount++;
          findings.push({
            message: `Event ${ev.id} amount (${ev.amount}) does not match PaymentAttempt ${attempt.id} amount (${attempt.amount}).`,
            safeId: ev.id,
            explained: false,
            reason: 'EVENT_ATTEMPT_AMOUNT_MISMATCH',
          });
        }

        // Terminal state protection: if event is paid, attempt must be paid or in-flight
        if (ev.status === 'paid' && attempt.status !== 'paid') {
          const ageMs = ev.createdAt ? currentTimeMs - new Date(ev.createdAt).getTime() : 0;
          if (ageMs <= WEBHOOK_IN_FLIGHT_TOLERANCE_MS) {
            explainedCount++;
            findings.push({
              message: `PaymentAttempt ${attempt.id} status is "${attempt.status}" despite paid event ${ev.id}, but event is within in-flight processing window.`,
              safeId: attempt.id,
              explained: true,
              reason: 'IN_FLIGHT_WEBHOOK_PROCESSING',
            });
          } else {
            defectsCount++;
            findings.push({
              message: `PaymentAttempt ${attempt.id} status is "${attempt.status}" despite confirmed paid event ${ev.id} (${Math.round(ageMs / 1000)}s old).`,
              safeId: attempt.id,
              explained: false,
              reason: 'UNREPAIRED_PAID_ATTEMPT_STATUS',
            });
          }
        }
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  } else if (explainedCount > 0) {
    status = DOMAIN_STATUS.EXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.PAYMENT_ATTEMPTS_EVENTS,
    name: meta.name,
    status,
    recordsInspected: filteredAttempts.length + totalEventsInspected,
    defectsCount,
    explainedCount,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditPaymentAttemptsEvents };
