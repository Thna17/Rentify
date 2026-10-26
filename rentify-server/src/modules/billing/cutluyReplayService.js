'use strict';

// rentify-server/src/modules/billing/cutluyReplayService.js
// P3-PAY-002: Provider Event Replay Service.
// Allows operator remediation and idempotent replay of persisted audit events.

const { PaymentAttempt, ProviderEvent } = require('../../models');
const { CUTLUY_ERROR_CODES, CutLuyError, ATTEMPT_STATUS } = require('./cutluyErrors');

async function replayProviderEvent(
  eventId,
  { actorId = 'system', reason = 'operator_remediation', transaction: tx } = {}
) {
  if (!eventId) {
    throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'eventId is required for replay', 400);
  }

  const event = await ProviderEvent.findByPk(eventId, { transaction: tx });
  if (!event) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.CLIENT_ERROR,
      `ProviderEvent not found: ${eventId}`,
      404
    );
  }

  let attempt = null;
  if (event.paymentAttemptId) {
    attempt = await PaymentAttempt.findByPk(event.paymentAttemptId, { transaction: tx });
  }

  let transitionApplied = false;
  let notice = null;

  if (attempt) {
    const currentStatus = attempt.status;
    const eventStatus = event.status;

    // Terminal paid status protection
    if (currentStatus === ATTEMPT_STATUS.PAID && eventStatus !== ATTEMPT_STATUS.PAID) {
      notice = 'Ignored replay event: Attempt is already terminal PAID';
    } else {
      if (currentStatus !== eventStatus) {
        const updates = {
          status: eventStatus,
          version: attempt.version + 1,
        };
        if (eventStatus === ATTEMPT_STATUS.PAID && !attempt.paidAt) {
          updates.paidAt = new Date();
        }
        await attempt.update(updates, { transaction: tx });
        transitionApplied = true;
      } else {
        notice = `Attempt is already in status "${currentStatus}"`;
      }
    }
  }

  await event.update(
    {
      replayCount: event.replayCount + 1,
      replayedAt: new Date(),
      replayedBy: actorId,
    },
    { transaction: tx }
  );

  return {
    replayed: true,
    eventId: event.id,
    attemptId: attempt ? attempt.id : null,
    attemptStatus: attempt ? attempt.status : null,
    replayCount: event.replayCount,
    transitionApplied,
    notice,
  };
}

module.exports = {
  replayProviderEvent,
};
