// modules/events/commerceEventService.js
// P5-NOT-001 & Platform Event Integration:
// Standardized transactional outbox event emitters for all approved Commerce order,
// delivery, return, refund, complaint, and moderation transitions.
// Guarantees minimal safe payload without PII/secrets, atomicity within database transactions,
// and exact contract alignment with Core notification and support services.

const { randomUUID } = require('node:crypto');
const { EventEnvelope } = require('./EventEnvelope');
const eventOutboxService = require('./eventOutboxService');

const COMMERCE_EVENT_TYPES = Object.freeze({
  ORDER_CREATED: 'order.created',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_DELIVERY_FAILED: 'order.delivery_failed',
  ORDER_RETURN_REQUESTED: 'order.return_requested',
  ORDER_RETURN_APPROVED: 'order.return_approved',
  ORDER_RETURN_REJECTED: 'order.return_rejected',
  ORDER_RETURN_RECEIVED: 'order.return_received',
  ORDER_REFUND_CONFIRMED: 'order.refund_confirmed',
  ORDER_COMPLAINT_FILED: 'order.complaint_filed',
  ORDER_DISPUTE_ESCALATED: 'order.dispute_escalated',
  PRODUCT_MODERATION_FLAGGED: 'product.moderation_flagged',
  PRODUCT_MODERATION_REJECTED: 'product.moderation_rejected',
  PRODUCT_MODERATION_APPROVED: 'product.moderation_approved',
});

const APPROVED_EVENT_TYPES = Object.freeze(Object.values(COMMERCE_EVENT_TYPES));

/**
 * Creates an immutable, sanitized EventEnvelope for an approved Commerce event.
 */
function createCommerceEnvelope({
  eventType,
  aggregateType,
  aggregateId,
  aggregateVersion = 1,
  storeId = null,
  payload = {},
  correlationId = null,
  causationId = null,
}) {
  if (!APPROVED_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Invalid or unapproved Commerce eventType: "${eventType}"`);
  }

  return new EventEnvelope({
    eventId: randomUUID(),
    eventType,
    schemaVersion: '1.0.0',
    aggregateType,
    aggregateId: String(aggregateId),
    aggregateVersion: Number.isSafeInteger(aggregateVersion) && aggregateVersion >= 1 ? aggregateVersion : 1,
    occurredAt: new Date().toISOString(),
    producer: 'ecommerce-server',
    correlationId: correlationId || randomUUID(),
    causationId: causationId || null,
    storeId: storeId || null,
    payload,
  });
}

/**
 * Base helper to record an immutable, sanitized EventEnvelope in the transactional EventOutbox.
 */
async function emitCommerceEvent(params, options = {}) {
  const transaction = options?.transaction || params?.transaction || null;
  const envelope = createCommerceEnvelope(params);
  return eventOutboxService.recordEvent(envelope, { transaction });
}

// --- Order & Delivery Events ---

async function emitOrderCreated(params, options = {}) {
  const {
    order,
    buyerId = null,
    storeId = null,
    itemsCount = 1,
    totalAmount = null,
    currency = 'USD',
    salesChannel = 'marketplace',
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;
  const effectiveStoreId = storeId || order.storeId || null;
  const effectiveBuyerId = buyerId || order.buyerId || order.userId || order.customerId || null;
  const effectiveTotal = totalAmount !== null ? totalAmount : (order.totalAmount || '0.00');

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_CREATED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: effectiveStoreId,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: effectiveBuyerId,
      storeId: effectiveStoreId,
      salesChannel: salesChannel || order.salesChannel || 'marketplace',
      currency: currency || order.currency || 'USD',
      totalAmount: String(effectiveTotal),
      itemsCount: Number.isInteger(itemsCount) ? itemsCount : 1,
    },
  }, { transaction });
}

async function emitOrderDelivered(params, options = {}) {
  const {
    order,
    deliveredAt = null,
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_DELIVERED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      deliveredAt: deliveredAt || new Date().toISOString(),
    },
  }, { transaction });
}

async function emitOrderDeliveryFailed(params, options = {}) {
  const {
    order,
    reason = 'Delivery failed',
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_DELIVERY_FAILED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      reason: String(reason).trim(),
    },
  }, { transaction });
}

// --- Return & Refund Events ---

async function emitOrderReturnRequested(params, options = {}) {
  const {
    order,
    reason,
    evidenceUrls = [],
    responseDeadline = null,
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;
  const deadline = responseDeadline || new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_RETURN_REQUESTED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      returnReason: String(reason || 'Return requested').trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      responseDeadline: deadline,
      currency: order.currency || 'USD',
      totalAmount: String(order.totalAmount || '0.00'),
    },
  }, { transaction });
}

async function emitOrderReturnApproved(params, options = {}) {
  const {
    order,
    decisionNotes = '',
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_RETURN_APPROVED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      decisionNotes: String(decisionNotes || '').trim(),
    },
  }, { transaction });
}

async function emitOrderReturnRejected(params, options = {}) {
  const {
    order,
    rejectionReason = '',
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_RETURN_REJECTED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      rejectionReason: String(rejectionReason || 'Return rejected').trim(),
    },
  }, { transaction });
}

async function emitOrderReturnReceived(params, options = {}) {
  const {
    order,
    restocked = false,
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_RETURN_RECEIVED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      restocked: Boolean(restocked),
    },
  }, { transaction });
}

async function emitOrderRefundConfirmed(params, options = {}) {
  const {
    order,
    refundAmount = null,
    refundMethod = 'cod_direct_refund',
    reference = null,
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_REFUND_CONFIRMED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      refundAmount: String(refundAmount || order.totalAmount || '0.00'),
      refundMethod: String(refundMethod || 'cod_direct_refund'),
      reference: reference ? String(reference) : null,
      currency: order.currency || 'USD',
    },
  }, { transaction });
}

// --- Support & Dispute Events ---

async function emitOrderComplaintFiled(params, options = {}) {
  const {
    report,
    order = null,
    buyerId = null,
    storeId = null,
    category = 'other',
    reason = '',
    evidenceUrls = [],
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;
  const effectiveStoreId = storeId || (order && order.storeId) || (report && report.storeId) || null;
  const effectiveBuyerId = buyerId || (order && (order.buyerId || order.userId)) || (report && report.buyerId) || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_COMPLAINT_FILED,
    aggregateType: 'Order',
    aggregateId: order ? order.id : (report ? report.id : randomUUID()),
    aggregateVersion: 1,
    storeId: effectiveStoreId,
    correlationId,
    payload: {
      reportId: report ? report.id : null,
      reportNumber: report ? report.reportNumber : null,
      orderId: order ? order.id : null,
      orderNumber: order ? order.orderNumber : null,
      buyerId: effectiveBuyerId,
      storeId: effectiveStoreId,
      category: String(category || 'other'),
      reason: String(reason || '').trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
    },
  }, { transaction });
}

async function emitOrderDisputeEscalated(params, options = {}) {
  const {
    order,
    caseId = null,
    escalationReason = '',
    deadline = null,
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.ORDER_DISPUTE_ESCALATED,
    aggregateType: 'Order',
    aggregateId: order.id,
    aggregateVersion: (order.version || 0) + 1,
    storeId: order.storeId || null,
    correlationId,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      caseId: caseId ? String(caseId) : null,
      buyerId: order.buyerId || order.userId || null,
      storeId: order.storeId || null,
      escalationReason: String(escalationReason || '48h SLA response deadline breached').trim(),
      deadline: deadline || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    },
  }, { transaction });
}

// --- Product Moderation Events ---

async function emitProductModerationFlagged(params, options = {}) {
  const {
    product,
    violationCode,
    reason = '',
    guidance = '',
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.PRODUCT_MODERATION_FLAGGED,
    aggregateType: 'Product',
    aggregateId: product.id,
    aggregateVersion: (product.version || 0) + 1,
    storeId: product.storeId || null,
    correlationId,
    payload: {
      productId: product.id,
      storeId: product.storeId || null,
      moderationStatus: 'flagged',
      violationCode: String(violationCode || 'POLICY_VIOLATION'),
      reason: String(reason || '').trim(),
      guidance: String(guidance || ''),
    },
  }, { transaction });
}

async function emitProductModerationRejected(params, options = {}) {
  const {
    product,
    reasonCode,
    reason = '',
    remediationGuidance = '',
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.PRODUCT_MODERATION_REJECTED,
    aggregateType: 'Product',
    aggregateId: product.id,
    aggregateVersion: (product.version || 0) + 1,
    storeId: product.storeId || null,
    correlationId,
    payload: {
      productId: product.id,
      storeId: product.storeId || null,
      moderationStatus: 'rejected',
      reasonCode: String(reasonCode || 'POLICY_VIOLATION'),
      reason: String(reason || '').trim(),
      remediationGuidance: String(remediationGuidance || ''),
    },
  }, { transaction });
}

async function emitProductModerationApproved(params, options = {}) {
  const {
    product,
    correlationId = null,
  } = params;
  const transaction = options?.transaction || params?.transaction || null;

  return emitCommerceEvent({
    eventType: COMMERCE_EVENT_TYPES.PRODUCT_MODERATION_APPROVED,
    aggregateType: 'Product',
    aggregateId: product.id,
    aggregateVersion: (product.version || 0) + 1,
    storeId: product.storeId || null,
    correlationId,
    payload: {
      productId: product.id,
      storeId: product.storeId || null,
      moderationStatus: 'approved',
    },
  }, { transaction });
}

module.exports = {
  COMMERCE_EVENT_TYPES,
  APPROVED_EVENT_TYPES,
  createCommerceEnvelope,
  emitCommerceEvent,
  emitOrderCreated,
  emitOrderDelivered,
  emitOrderDeliveryFailed,
  emitOrderReturnRequested,
  emitOrderReturnApproved,
  emitOrderReturnRejected,
  emitOrderReturnReceived,
  emitOrderRefundConfirmed,
  emitOrderComplaintFiled,
  emitOrderDisputeEscalated,
  emitProductModerationFlagged,
  emitProductModerationRejected,
  emitProductModerationApproved,
};
