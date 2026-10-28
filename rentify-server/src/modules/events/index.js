// src/modules/events/index.js
const { EventEnvelope, sanitizePayload } = require('./EventEnvelope');
const eventOutboxService = require('./eventOutboxService');
const eventInboxService = require('./eventInboxService');
const eventReplayService = require('./eventReplayService');

module.exports = {
  EventEnvelope,
  sanitizePayload,
  eventOutboxService,
  eventInboxService,
  eventReplayService,
  recordEvent: eventOutboxService.recordEvent,
  dispatchOutboxEvent: eventOutboxService.dispatchOutboxEvent,
  dispatchPendingEvents: eventOutboxService.dispatchPendingEvents,
  calculateBackoff: eventOutboxService.calculateBackoff,
  classifyError: eventOutboxService.classifyError,
  receiveEvent: eventInboxService.receiveEvent,
  replayEvent: eventReplayService.replayEvent,
  listDeadLetters: eventReplayService.listDeadLetters,
  getEventDetails: eventReplayService.getEventDetails,
  assertAdminPrivilege: eventReplayService.assertAdminPrivilege,
};
