// src/modules/events/eventOutboxService.js
// Transactional outbox writer, publisher, retry scheduler, and dead-letter handler.
const { Op } = require('sequelize');
const { EventOutbox } = require('../../models');
const { logger, runWithCorrelation, getCorrelationId } = require('../../utils/logger');
const { EventEnvelope } = require('./EventEnvelope');

function calculateBackoff(attempts, { baseDelayMs = 1000, maxDelayMs = 60000 } = {}) {
  const exp = Math.min(6, Math.max(0, attempts));
  const delay = Math.min(maxDelayMs, baseDelayMs * (2 ** exp));
  return delay;
}

function classifyError(error) {
  if (!error) return 'transient';
  if (error.name === 'SyntaxError' || error.code === 'POISON_EVENT' || error.isPoison) {
    return 'poison';
  }
  const status = error.statusCode || error.status;
  if (status === 400 || status === 422 || status === 401 || status === 403) {
    return 'fatal';
  }
  return 'transient';
}

async function recordEvent(envelopeOrOptions, { transaction = null } = {}) {
  const envelope = envelopeOrOptions instanceof EventEnvelope
    ? envelopeOrOptions
    : new EventEnvelope(envelopeOrOptions);

  return EventOutbox.create({
    id: envelope.eventId,
    eventId: envelope.eventId,
    eventType: envelope.eventType,
    schemaVersion: envelope.schemaVersion,
    aggregateType: envelope.aggregateType,
    aggregateId: envelope.aggregateId,
    aggregateVersion: envelope.aggregateVersion,
    occurredAt: envelope.occurredAt,
    producer: envelope.producer,
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    storeId: envelope.storeId,
    payload: envelope.payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date(),
  }, { transaction });
}

async function dispatchOutboxEvent(eventId, dispatcher) {
  const item = await EventOutbox.findOne({
    where: { [Op.or]: [{ id: eventId }, { eventId }] },
  });
  if (!item) {
    throw new Error(`Outbox event not found: ${eventId}`);
  }

  const correlationId = item.correlationId || getCorrelationId();
  const execute = async () => {
    try {
      await item.update({ status: 'publishing' });
      await dispatcher(item.toJSON());
      await item.update({
        status: 'published',
        publishedAt: new Date(),
        lastError: null,
      });
      return { published: true, eventId: item.eventId, status: 'published' };
    } catch (error) {
      const classification = classifyError(error);
      const nextAttempts = item.attempts + 1;

      if (classification === 'poison' || nextAttempts >= item.maxAttempts) {
        await item.update({
          status: 'dead_letter',
          errorClassification: classification,
          lastError: String(error.message).slice(0, 1000),
          attempts: nextAttempts,
        });
        logger.error(`[Outbox Dead-Letter] Event ${item.eventId} moved to dead_letter (${classification}): ${error.message}`, {
          eventId: item.eventId,
          eventType: item.eventType,
          errorClassification: classification,
          correlationId,
        });
        return { published: false, eventId: item.eventId, status: 'dead_letter', classification, error: error.message };
      }

      const delayMs = calculateBackoff(nextAttempts);
      const nextAttemptAt = new Date(Date.now() + delayMs);
      await item.update({
        status: 'pending',
        errorClassification: classification,
        lastError: String(error.message).slice(0, 1000),
        attempts: nextAttempts,
        nextAttemptAt,
      });
      logger.warn(`[Outbox Retry Scheduled] Event ${item.eventId} failed transiently (attempt ${nextAttempts}/${item.maxAttempts}): ${error.message}`, {
        eventId: item.eventId,
        nextAttemptAt,
        correlationId,
      });
      return { published: false, eventId: item.eventId, status: 'pending', classification, error: error.message };
    }
  };

  if (correlationId && !getCorrelationId()) {
    return runWithCorrelation(correlationId, execute);
  }
  return execute();
}

async function dispatchPendingEvents({ limit = 50, dispatcher }) {
  const now = new Date();
  const pending = await EventOutbox.findAll({
    where: {
      status: 'pending',
      nextAttemptAt: { [Op.lte]: now },
    },
    order: [['aggregateVersion', 'ASC'], ['createdAt', 'ASC']],
    limit,
  });

  const results = [];
  for (const item of pending) {
    results.push(await dispatchOutboxEvent(item.eventId, dispatcher));
  }
  return results;
}

module.exports = {
  recordEvent,
  dispatchOutboxEvent,
  dispatchPendingEvents,
  calculateBackoff,
  classifyError,
};
