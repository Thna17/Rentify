'use strict';

const { randomUUID } = require('node:crypto');
const { UniqueConstraintError } = require('sequelize');
const { ProductAnalyticsEvent } = require('../../models');
const { ApiError } = require('../../utils/ApiError');
const { CATALOG_VERSION, SCHEMA_VERSION, BROWSER_EVENT_CONTRACTS } = require('./eventCatalog');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHANNELS = new Set(['marketplace', 'storefront', 'pos']);
const LOCALES = new Set(['en', 'km']);
const ENUMS = {
  paymentMethod: new Set(['cod']),
  failureClass: new Set(['validation', 'stock_conflict', 'timeout', 'network', 'server', 'unknown']),
  surface: new Set(['home', 'category', 'store', 'product', 'search_results']),
};
const FORBIDDEN = new Set([
  'name', 'email', 'phone', 'phoneNumber', 'address', 'query', 'searchText', 'description',
  'notes', 'buyerId', 'userId', 'sessionId', 'accessToken', 'refreshToken', 'credential', 'qrString',
]);

const invalid = (message, code = 'ANALYTICS_EVENT_INVALID') => ApiError.badRequest(message, code);

function hasForbiddenKey(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  return Object.entries(value).some(([key, child]) => FORBIDDEN.has(key) || hasForbiddenKey(child));
}

function sanitizeProperty(key, value) {
  if (key === 'channel') {
    if (!CHANNELS.has(value)) throw invalid('Unsupported analytics channel');
    return value;
  }
  if (key === 'locale') {
    if (!LOCALES.has(value)) throw invalid('Unsupported analytics locale');
    return value;
  }
  if (key === 'hasResults') {
    if (typeof value !== 'boolean') throw invalid('hasResults must be boolean');
    return value;
  }
  if (ENUMS[key]) {
    if (!ENUMS[key].has(value)) throw invalid(`Unsupported ${key}`);
    return value;
  }
  throw invalid(`Unsupported analytics property: ${key}`);
}

function sanitizeMeasure(key, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw invalid(`${key} must be a finite non-negative number`);
  }
  const maximum = key === 'durationMs' ? 300000 : 1000000;
  return Math.min(maximum, Math.round(value * 10) / 10);
}

function validateAndSanitize(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Analytics event body is required');
  if (hasForbiddenKey(input)) throw invalid('Analytics events cannot contain personal or free-form data', 'ANALYTICS_PII_REJECTED');
  const contract = BROWSER_EVENT_CONTRACTS[input.eventName];
  if (!contract) throw invalid('Unsupported analytics event name');
  if ((input.schemaVersion || SCHEMA_VERSION) !== SCHEMA_VERSION) throw invalid('Unsupported analytics schema version');
  const eventId = input.eventId || randomUUID();
  if (!UUID.test(eventId)) throw invalid('eventId must be a UUID');
  if (input.storeId != null && !UUID.test(input.storeId)) throw invalid('storeId must be a UUID');
  const occurredAt = new Date(input.occurredAt || now);
  if (Number.isNaN(occurredAt.getTime())) throw invalid('occurredAt must be an ISO timestamp');
  const drift = occurredAt.getTime() - now.getTime();
  if (drift > 5 * 60 * 1000 || drift < -7 * 24 * 60 * 60 * 1000) throw invalid('occurredAt is outside the accepted window');
  const rawProperties = input.properties || {};
  const rawMeasures = input.measures || {};
  if (Object.keys(rawProperties).some((key) => !contract.properties.includes(key))) throw invalid('Analytics properties contain an unsupported key');
  if (Object.keys(rawMeasures).some((key) => !contract.measures.includes(key))) throw invalid('Analytics measures contain an unsupported key');
  const properties = {};
  for (const key of contract.properties) if (rawProperties[key] !== undefined) properties[key] = sanitizeProperty(key, rawProperties[key]);
  for (const key of contract.required) if (properties[key] === undefined) throw invalid(`Missing required analytics property: ${key}`);
  const measures = {};
  for (const key of contract.measures) if (rawMeasures[key] !== undefined) measures[key] = sanitizeMeasure(key, rawMeasures[key]);
  return {
    eventId,
    eventName: input.eventName,
    schemaVersion: SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    source: 'browser',
    storeId: input.storeId || null,
    channel: properties.channel,
    locale: properties.locale || null,
    properties,
    measures,
    occurredAt,
  };
}

function createAnalyticsEventService({ model = ProductAnalyticsEvent } = {}) {
  return {
    validateAndSanitize,
    async record(input, { now = new Date() } = {}) {
      const data = validateAndSanitize(input, now);
      try {
        const event = await model.create(data);
        return { accepted: true, duplicate: false, eventId: event.eventId || data.eventId };
      } catch (error) {
        if (error instanceof UniqueConstraintError || error?.name === 'SequelizeUniqueConstraintError') {
          return { accepted: true, duplicate: true, eventId: data.eventId };
        }
        throw error;
      }
    },
  };
}

module.exports = { createAnalyticsEventService, validateAndSanitize, FORBIDDEN };
