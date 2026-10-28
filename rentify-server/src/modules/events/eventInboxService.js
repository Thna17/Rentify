// src/modules/events/eventInboxService.js
// Idempotent processed-event inbox with monotonic version checking and dead-letter handling.
const { Op } = require('sequelize');
const { EventInbox } = require('../../models');
const { logger, runWithCorrelation, getCorrelationId } = require('../../utils/logger');
const { classifyError, calculateBackoff } = require('./eventOutboxService');

async function receiveEvent({
  envelope,
  consumer,
  handler,
  getCurrentAggregateVersion = null,
  transaction = null,
}) {
  if (!envelope || !envelope.eventId) {
    throw new Error('EventInbox: valid envelope with eventId is required');
  }
  if (!consumer) {
    throw new Error('EventInbox: consumer name is required');
  }

  const correlationId = envelope.correlationId || getCorrelationId();

  const execute = async () => {
    // 1. Idempotency Check: if this exact event was already processed or ignored, do not re-execute
    let inboxItem = await EventInbox.findOne({
      where: { eventId: envelope.eventId },
      transaction,
    });

    if (inboxItem) {
      if (inboxItem.status === 'processed' || inboxItem.status === 'ignored') {
        logger.info(`[Inbox Idempotent Hit] Event ${envelope.eventId} was already ${inboxItem.status}. Skipping.`, {
          eventId: envelope.eventId,
          status: inboxItem.status,
          correlationId,
        });
        return {
          status: 'already_processed',
          duplicate: true,
          eventId: envelope.eventId,
          inboxId: inboxItem.id,
        };
      }
    }

    // 2. Monotonic Ordering Check: delayed/out-of-order events cannot overwrite newer state
    if (typeof getCurrentAggregateVersion === 'function') {
      const currentVersion = await getCurrentAggregateVersion(envelope.aggregateType, envelope.aggregateId);
      if (currentVersion !== null && currentVersion !== undefined && currentVersion >= envelope.aggregateVersion) {
        logger.warn(`[Inbox Out-of-Order Ignored] Aggregate ${envelope.aggregateType}:${envelope.aggregateId} is at version ${currentVersion}, event version is ${envelope.aggregateVersion}. Ignoring stale event.`, {
          eventId: envelope.eventId,
          aggregateType: envelope.aggregateType,
          aggregateId: envelope.aggregateId,
          currentVersion,
          eventVersion: envelope.aggregateVersion,
          correlationId,
        });

        if (inboxItem) {
          await inboxItem.update({
            status: 'ignored',
            lastError: `Stale event version (${envelope.aggregateVersion}) superseded by current state (${currentVersion})`,
            processedAt: new Date(),
          }, { transaction });
        } else {
          inboxItem = await EventInbox.create({
            id: envelope.eventId,
            eventId: envelope.eventId,
            eventType: envelope.eventType,
            schemaVersion: envelope.schemaVersion,
            aggregateType: envelope.aggregateType,
            aggregateId: envelope.aggregateId,
            aggregateVersion: envelope.aggregateVersion,
            occurredAt: envelope.occurredAt,
            producer: envelope.producer,
            consumer,
            correlationId,
            causationId: envelope.causationId,
            storeId: envelope.storeId,
            payload: envelope.payload,
            status: 'ignored',
            lastError: `Stale event version (${envelope.aggregateVersion}) superseded by current state (${currentVersion})`,
            processedAt: new Date(),
          }, { transaction });
        }

        return {
          status: 'ignored',
          duplicate: false,
          outOfOrder: true,
          eventId: envelope.eventId,
          inboxId: inboxItem.id,
        };
      }
    }

    // 3. Register inbox record in processing state if not present
    if (!inboxItem) {
      inboxItem = await EventInbox.create({
        id: envelope.eventId,
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        schemaVersion: envelope.schemaVersion,
        aggregateType: envelope.aggregateType,
        aggregateId: envelope.aggregateId,
        aggregateVersion: envelope.aggregateVersion,
        occurredAt: envelope.occurredAt,
        producer: envelope.producer,
        consumer,
        correlationId,
        causationId: envelope.causationId,
        storeId: envelope.storeId,
        payload: envelope.payload,
        status: 'processing',
        attempts: 1,
        maxAttempts: 5,
      }, { transaction });
    } else {
      await inboxItem.update({
        status: 'processing',
        attempts: inboxItem.attempts + 1,
      }, { transaction });
    }

    // 4. Execute authoritative consumer handler
    try {
      const handlerResult = await handler(envelope);

      await inboxItem.update({
        status: 'processed',
        processedAt: new Date(),
        lastError: null,
      }, { transaction });

      logger.info(`[Inbox Processed] Successfully processed event ${envelope.eventId}`, {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        correlationId,
      });

      return {
        status: 'processed',
        applied: true,
        eventId: envelope.eventId,
        inboxId: inboxItem.id,
        result: handlerResult,
      };
    } catch (error) {
      const classification = classifyError(error);
      const attempts = inboxItem.attempts;

      if (classification === 'poison' || attempts >= inboxItem.maxAttempts) {
        await inboxItem.update({
          status: 'dead_letter',
          errorClassification: classification,
          lastError: String(error.message).slice(0, 1000),
        }, { transaction });

        logger.error(`[Inbox Dead-Letter] Event ${envelope.eventId} moved to dead_letter (${classification}): ${error.message}`, {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          errorClassification: classification,
          correlationId,
        });
      } else {
        const delayMs = calculateBackoff(attempts);
        const nextAttemptAt = new Date(Date.now() + delayMs);
        await inboxItem.update({
          status: 'received',
          errorClassification: classification,
          lastError: String(error.message).slice(0, 1000),
          nextAttemptAt,
        }, { transaction });

        logger.warn(`[Inbox Retry Scheduled] Event ${envelope.eventId} failed transiently (attempt ${attempts}/${inboxItem.maxAttempts}): ${error.message}`, {
          eventId: envelope.eventId,
          nextAttemptAt,
          correlationId,
        });
      }

      throw error;
    }
  };

  if (correlationId && !getCorrelationId()) {
    return runWithCorrelation(correlationId, execute);
  }
  return execute();
}

module.exports = {
  receiveEvent,
};
