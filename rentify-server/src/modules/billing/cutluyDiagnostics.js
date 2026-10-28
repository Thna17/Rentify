'use strict';

// rentify-server/src/modules/billing/cutluyDiagnostics.js
// P3-PAY-002: Operator-Safe Diagnostics.
// Generates redacted timelines, health diagnostics, and error classifications.

const { PaymentAttempt, ProviderEvent } = require('../../models');
const { cutluyAdapter } = require('./cutluyAdapter');

function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  const cleaned = JSON.parse(JSON.stringify(data));

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') ||
        lower.includes('key') ||
        lower.includes('token') ||
        lower.includes('password') ||
        lower.includes('qr_payload') ||
        lower.includes('qr_data') ||
        lower.includes('qr_code')
      ) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        walk(obj[key]);
      }
    }
  }

  walk(cleaned);
  return cleaned;
}

async function getPaymentTimeline(attemptId, { transaction: tx } = {}) {
  const attempt = await PaymentAttempt.findByPk(attemptId, { transaction: tx });
  if (!attempt) return null;

  const events = await ProviderEvent.findAll({
    where: { paymentAttemptId: attempt.id },
    order: [['createdAt', 'ASC']],
    transaction: tx,
  });

  const timeline = [
    {
      timestamp: attempt.createdAt,
      type: 'attempt_created',
      status: 'pending',
      amount: attempt.amount,
      currency: attempt.currency,
      businessReference: attempt.businessReference,
      accountRef: attempt.accountRef,
      checkoutUrl: attempt.checkoutUrl,
    },
  ];

  for (const event of events) {
    timeline.push({
      timestamp: event.createdAt,
      type: 'provider_event',
      eventId: event.id,
      providerEventId: event.providerEventId,
      status: event.status,
      processed: event.processed,
      replayed: event.replayCount > 0,
      replayCount: event.replayCount,
      payload: redactSensitiveData(event.payload),
    });
  }

  if (attempt.paidAt) {
    timeline.push({
      timestamp: attempt.paidAt,
      type: 'status_transition',
      status: 'paid',
    });
  } else if (attempt.expiredAt) {
    timeline.push({
      timestamp: attempt.expiredAt,
      type: 'status_transition',
      status: 'expired',
    });
  } else if (attempt.failedAt) {
    timeline.push({
      timestamp: attempt.failedAt,
      type: 'status_transition',
      status: 'failed',
      reason: attempt.failureReason,
    });
  }

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    attemptId: attempt.id,
    businessReference: attempt.businessReference,
    accountType: attempt.accountType,
    accountRef: attempt.accountRef,
    currentStatus: attempt.status,
    amount: attempt.amount,
    currency: attempt.currency,
    version: attempt.version,
    eventsCount: events.length,
    timeline,
  };
}

module.exports = {
  getPaymentTimeline,
  redactSensitiveData,
  classifyError: (err) => cutluyAdapter.classifyError(err),
};
