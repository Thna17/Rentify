// modules/events/eventReplayService.js
// Privileged event replay service and operator-safe inspection.
const { randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const { EventOutbox, EventInbox, EventReplayAudit } = require('../../models');
const { logger, getCorrelationId } = require('../../utils/logger');
const { sanitizePayload } = require('./EventEnvelope');
const { dispatchOutboxEvent } = require('./eventOutboxService');
const { receiveEvent } = require('./eventInboxService');

function assertAdminPrivilege(actor) {
  if (!actor) {
    const err = new Error('Replay requires admin authorization: actor is required');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const role = typeof actor === 'object' ? actor.role : null;
  const isAdmin = typeof actor === 'object'
    ? (actor.isAdmin === true || role === 'admin' || role === 'superadmin')
    : false;
  if (!isAdmin) {
    const err = new Error('Replay requires admin authorization');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
}

async function listDeadLetters({ target = 'outbox', limit = 50, offset = 0, storeId = null } = {}) {
  const Model = target === 'inbox' ? EventInbox : EventOutbox;
  const where = { status: 'dead_letter' };
  if (storeId) {
    where.storeId = storeId;
  }

  const items = await Model.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return items.map((item) => {
    const plain = item.toJSON();
    plain.payload = sanitizePayload(plain.payload, { allowAddresses: false });
    return plain;
  });
}

async function getEventDetails({ target = 'outbox', eventId }) {
  const Model = target === 'inbox' ? EventInbox : EventOutbox;
  const item = await Model.findOne({
    where: { [Op.or]: [{ id: eventId }, { eventId }] },
  });
  if (!item) {
    const err = new Error(`${target} event not found: ${eventId}`);
    err.statusCode = 404;
    throw err;
  }

  const plain = item.toJSON();
  plain.payload = sanitizePayload(plain.payload, { allowAddresses: false });
  return plain;
}

async function replayEvent({
  target = 'outbox',
  eventId,
  actor,
  reason,
  dispatcher = null,
  handler = null,
  getCurrentAggregateVersion = null,
}) {
  assertAdminPrivilege(actor);

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    const err = new Error('Replay reason is required for audit');
    err.statusCode = 400;
    throw err;
  }

  const actorId = typeof actor === 'object'
    ? (actor.id || actor.userId || actor.email || 'admin')
    : String(actor);
  const replayId = randomUUID();
  const correlationId = getCorrelationId() || randomUUID();

  if (target === 'outbox') {
    const item = await EventOutbox.findOne({
      where: { [Op.or]: [{ id: eventId }, { eventId }] },
    });
    if (!item) {
      const err = new Error(`Outbox event not found: ${eventId}`);
      err.statusCode = 404;
      throw err;
    }

    const audit = await EventReplayAudit.create({
      replayId,
      actorId,
      eventId: item.eventId,
      eventType: item.eventType,
      aggregateType: item.aggregateType,
      aggregateId: item.aggregateId,
      target: 'outbox',
      reason: reason.trim(),
      status: 'initiated',
      correlationId,
    });

    try {
      await item.update({
        status: 'pending',
        attempts: 0,
        lastError: null,
        errorClassification: null,
        nextAttemptAt: new Date(),
      });

      let dispatchResult = null;
      if (typeof dispatcher === 'function') {
        dispatchResult = await dispatchOutboxEvent(item.eventId, dispatcher);
      }

      await audit.update({
        status: 'success',
      });

      logger.info(`[Event Replay Success] Outbox event ${item.eventId} replayed by ${actorId}`, {
        replayId,
        eventId: item.eventId,
        actorId,
      });

      return {
        replayId,
        status: 'success',
        target: 'outbox',
        eventId: item.eventId,
        dispatchResult,
      };
    } catch (error) {
      await audit.update({
        status: 'failed',
        error: String(error.message).slice(0, 1000),
      });

      logger.error(`[Event Replay Failed] Outbox event ${item.eventId} replay failed: ${error.message}`, {
        replayId,
        eventId: item.eventId,
        error: error.message,
      });

      throw error;
    }
  } else if (target === 'inbox') {
    const item = await EventInbox.findOne({
      where: { [Op.or]: [{ id: eventId }, { eventId }] },
    });
    if (!item) {
      const err = new Error(`Inbox event not found: ${eventId}`);
      err.statusCode = 404;
      throw err;
    }

    const audit = await EventReplayAudit.create({
      replayId,
      actorId,
      eventId: item.eventId,
      eventType: item.eventType,
      aggregateType: item.aggregateType,
      aggregateId: item.aggregateId,
      target: 'inbox',
      reason: reason.trim(),
      status: 'initiated',
      correlationId,
    });

    // CRITICAL: Replay cannot duplicate authoritative effects!
    // If the event was already successfully processed, do not re-execute handler.
    if (item.status === 'processed') {
      await audit.update({
        status: 'success',
      });

      logger.info(`[Event Replay Skipped] Inbox event ${item.eventId} was already processed. Authoritative effect preserved.`, {
        replayId,
        eventId: item.eventId,
      });

      return {
        replayId,
        status: 'already_processed',
        target: 'inbox',
        eventId: item.eventId,
        duplicateSkipped: true,
      };
    }

    try {
      await item.update({
        status: 'received',
        attempts: 0,
        lastError: null,
        errorClassification: null,
      });

      let receiveResult = null;
      if (typeof handler === 'function') {
        receiveResult = await receiveEvent({
          envelope: item.toJSON(),
          consumer: item.consumer,
          handler,
          getCurrentAggregateVersion,
        });
      }

      await audit.update({
        status: 'success',
      });

      logger.info(`[Event Replay Success] Inbox event ${item.eventId} replayed by ${actorId}`, {
        replayId,
        eventId: item.eventId,
        actorId,
      });

      return {
        replayId,
        status: 'success',
        target: 'inbox',
        eventId: item.eventId,
        receiveResult,
      };
    } catch (error) {
      await audit.update({
        status: 'failed',
        error: String(error.message).slice(0, 1000),
      });

      logger.error(`[Event Replay Failed] Inbox event ${item.eventId} replay failed: ${error.message}`, {
        replayId,
        eventId: item.eventId,
        error: error.message,
      });

      throw error;
    }
  } else {
    const err = new Error(`Invalid replay target: ${target}. Must be 'outbox' or 'inbox'.`);
    err.statusCode = 400;
    throw err;
  }
}

module.exports = {
  assertAdminPrivilege,
  listDeadLetters,
  getEventDetails,
  replayEvent,
};
