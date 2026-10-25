// modules/events/EventEnvelope.js
// Standard immutable event envelope for Rentify event-driven architecture.
const { randomUUID } = require('node:crypto');
const { getCorrelationId, validateCorrelationId } = require('../../utils/logger');

const SENSITIVE_PATTERN = /token|secret|password|credential|apiKey|privateKey|rawQr|qrPayload|qrCode|cvv|cvc|cardNumber|pan/i;
const ADDRESS_PATTERN = /address|street|postalCode|zipCode/i;

function sanitizePayload(data, { allowAddresses = false } = {}) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => sanitizePayload(item, { allowAddresses }));

  const sanitized = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_PATTERN.test(key)) {
      continue;
    }
    if (!allowAddresses && ADDRESS_PATTERN.test(key)) {
      continue;
    }
    if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizePayload(val, { allowAddresses });
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

class EventEnvelope {
  constructor({
    eventId = randomUUID(),
    eventType,
    schemaVersion = '1.0.0',
    aggregateType,
    aggregateId,
    aggregateVersion,
    occurredAt = new Date().toISOString(),
    producer,
    correlationId = null,
    causationId = null,
    storeId = null,
    payload = {},
    options = {},
  }) {
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('EventEnvelope: eventType is required and must be a string');
    }
    if (!aggregateType || typeof aggregateType !== 'string') {
      throw new Error('EventEnvelope: aggregateType is required and must be a string');
    }
    if (!aggregateId) {
      throw new Error('EventEnvelope: aggregateId is required');
    }
    if (!Number.isSafeInteger(aggregateVersion) || aggregateVersion < 1) {
      throw new Error('EventEnvelope: aggregateVersion must be a positive integer');
    }
    if (!producer || typeof producer !== 'string') {
      throw new Error('EventEnvelope: producer is required and must be a string');
    }

    const currentCorrelation = getCorrelationId();
    const effectiveCorrelationId = correlationId
      ? validateCorrelationId(correlationId) || correlationId
      : currentCorrelation || randomUUID();

    this.eventId = eventId;
    this.eventType = eventType;
    this.schemaVersion = String(schemaVersion);
    this.aggregateType = String(aggregateType);
    this.aggregateId = String(aggregateId);
    this.aggregateVersion = aggregateVersion;
    this.occurredAt = typeof occurredAt === 'string' ? occurredAt : occurredAt.toISOString();
    this.producer = String(producer);
    this.correlationId = effectiveCorrelationId;
    this.causationId = causationId ? String(causationId) : null;
    this.storeId = storeId || null;
    this.payload = sanitizePayload(payload, options);
    Object.freeze(this);
  }

  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      schemaVersion: this.schemaVersion,
      aggregateType: this.aggregateType,
      aggregateId: this.aggregateId,
      aggregateVersion: this.aggregateVersion,
      occurredAt: this.occurredAt,
      producer: this.producer,
      correlationId: this.correlationId,
      causationId: this.causationId,
      storeId: this.storeId,
      payload: this.payload,
    };
  }
}

module.exports = {
  EventEnvelope,
  sanitizePayload,
};
