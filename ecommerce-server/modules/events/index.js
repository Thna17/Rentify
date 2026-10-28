// modules/events/index.js
const { EventEnvelope, sanitizePayload } = require('./EventEnvelope');
const eventOutboxService = require('./eventOutboxService');
const eventInboxService = require('./eventInboxService');
const eventReplayService = require('./eventReplayService');
const commerceEventService = require('./commerceEventService');

module.exports = {
  EventEnvelope,
  sanitizePayload,
  eventOutboxService,
  eventInboxService,
  eventReplayService,
  commerceEventService,
  COMMERCE_EVENT_TYPES: commerceEventService.COMMERCE_EVENT_TYPES,
  APPROVED_EVENT_TYPES: commerceEventService.APPROVED_EVENT_TYPES,
  createCommerceEnvelope: commerceEventService.createCommerceEnvelope,
  emitCommerceEvent: commerceEventService.emitCommerceEvent,
  emitOrderCreated: commerceEventService.emitOrderCreated,
  emitOrderDelivered: commerceEventService.emitOrderDelivered,
  emitOrderDeliveryFailed: commerceEventService.emitOrderDeliveryFailed,
  emitOrderReturnRequested: commerceEventService.emitOrderReturnRequested,
  emitOrderReturnApproved: commerceEventService.emitOrderReturnApproved,
  emitOrderReturnRejected: commerceEventService.emitOrderReturnRejected,
  emitOrderReturnReceived: commerceEventService.emitOrderReturnReceived,
  emitOrderRefundConfirmed: commerceEventService.emitOrderRefundConfirmed,
  emitOrderComplaintFiled: commerceEventService.emitOrderComplaintFiled,
  emitOrderDisputeEscalated: commerceEventService.emitOrderDisputeEscalated,
  emitProductModerationFlagged: commerceEventService.emitProductModerationFlagged,
  emitProductModerationRejected: commerceEventService.emitProductModerationRejected,
  emitProductModerationApproved: commerceEventService.emitProductModerationApproved,
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
