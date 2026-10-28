'use strict';

// ecommerce-server/modules/support/buyerReportService.js
// P5-SUP-001: Buyer report intake, server-side eligibility, evidence sanitization,
// and authoritative Commerce facts for Core SupportCases.

const { randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const {
  BuyerReport,
  Order,
  OrderItem,
  OrderEvent,
  Product,
  ProductVariant,
  StoreAccess,
} = require('../../models');
const coreCaseLinkageAdapter = require('./coreCaseLinkageAdapter');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function fail(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
}

function generateReportNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `RPT-${dateStr}-${rand}`;
}

/**
 * Sanitizes and validates evidence URLs and labels.
 * Enforces secure HTTPS URLs only; blocks javascript: and http: schemes.
 */
function sanitizeEvidence(evidenceList) {
  if (!evidenceList) return null;
  const list = Array.isArray(evidenceList) ? evidenceList : [evidenceList];
  if (list.length > 5) {
    fail('Maximum of 5 evidence items allowed per report', 400, 'TOO_MANY_EVIDENCE_ITEMS');
  }

  const validLabels = ['product_damage', 'packaging', 'shipping_label', 'general'];

  return list.map((item) => {
    let url = '';
    let label = 'general';
    let type = 'photo';
    let fileName = null;

    if (typeof item === 'string') {
      url = item.trim();
    } else if (typeof item === 'object' && item !== null) {
      url = String(item.url || '').trim();
      label = validLabels.includes(item.label) ? item.label : 'general';
      type = item.type === 'video' || item.type === 'document' ? item.type : 'photo';
      fileName = item.fileName ? String(item.fileName).slice(0, 100) : null;
    }

    if (!url.startsWith('https://')) {
      fail('Evidence must be a secure HTTPS URL', 400, 'INSECURE_EVIDENCE_URL');
    }
    if (url.startsWith('javascript:') || url.startsWith('data:')) {
      fail('Invalid evidence URL scheme', 400, 'INVALID_EVIDENCE_SCHEME');
    }

    return {
      url: url.slice(0, 500),
      label,
      type,
      fileName,
      uploadedAt: new Date().toISOString(),
    };
  });
}

/**
 * Server-side authoritative report eligibility evaluator.
 * Never trust UI-only gating!
 */
async function evaluateEligibility(buyerId, { subjectType, subjectId }, options = {}) {
  if (!buyerId) fail('Buyer sign-in required', 401, 'BUYER_AUTH_REQUIRED');
  if (!['order', 'return', 'product', 'merchant'].includes(subjectType)) {
    fail('Invalid subject type. Must be order, return, product, or merchant', 400, 'INVALID_SUBJECT_TYPE');
  }
  if (!subjectId) fail('subjectId is required', 400, 'SUBJECT_ID_REQUIRED');

  const reasonCodes = [];
  let eligible = true;
  let subjectTitle = '';
  let deadline = null;
  let storeId = null;
  let orderId = null;
  let productId = null;

  // 1. Check for existing open reports to prevent duplicate submissions
  const existingReport = await BuyerReport.findOne({
    where: {
      buyerId,
      subjectType,
      subjectId,
      linkageStatus: { [Op.in]: ['pending_linkage', 'linked'] },
    },
    order: [['createdAt', 'DESC']],
    transaction: options.transaction,
  }).catch(() => null);

  if (existingReport) {
    return {
      eligible: false,
      subjectType,
      subjectId,
      subjectTitle: `Report ${existingReport.reportNumber}`,
      deadline: null,
      reasonCodes: ['DUPLICATE_REPORT_EXISTS'],
      guidance: `An active report (${existingReport.reportNumber}) is already being reviewed.`,
      existingReport: {
        id: existingReport.id,
        reportNumber: existingReport.reportNumber,
        category: existingReport.category,
        coreCaseNumber: existingReport.coreCaseNumber,
        linkageStatus: existingReport.linkageStatus,
        createdAt: existingReport.createdAt,
      },
    };
  }

  // 2. Evaluate by Subject Type
  if (subjectType === 'order' || subjectType === 'return') {
    const order = await Order.findByPk(subjectId, {
      include: [
        { model: OrderItem, as: 'OrderItems' },
      ],
      transaction: options.transaction,
    });

    if (!order) {
      fail('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Tenant check: Buyer may only report their own orders
    const orderBuyer = order.buyerId || order.userId || order.customerId;
    if (orderBuyer && orderBuyer !== buyerId) {
      fail('Forbidden: You are not authorized to report this order', 403, 'UNAUTHORIZED_ORDER_ACCESS');
    }

    orderId = order.id;
    storeId = order.storeId;
    subjectTitle = `Order #${order.orderNumber || order.id.slice(0, 8)}`;

    // 7-day post-delivery cutoff rule (DEC-008)
    if (subjectType === 'return' || order.deliveryStatus === 'delivered') {
      const deliveredEvent = await OrderEvent.findOne({
        where: { orderId: order.id, type: 'delivered' },
        order: [['createdAt', 'DESC']],
        transaction: options.transaction,
      }).catch(() => null);

      const deliveredAt = deliveredEvent?.createdAt || order.updatedAt || order.createdAt;
      const elapsed = Date.now() - new Date(deliveredAt).getTime();
      const cutoffTime = new Date(new Date(deliveredAt).getTime() + SEVEN_DAYS_MS);
      deadline = cutoffTime.toISOString();

      if (elapsed > SEVEN_DAYS_MS) {
        eligible = false;
        reasonCodes.push('ORDER_RETURN_WINDOW_EXPIRED');
      }
    }
  } else if (subjectType === 'product') {
    const product = await Product.findByPk(subjectId, {
      transaction: options.transaction,
    });
    if (!product) fail('Product not found', 404, 'PRODUCT_NOT_FOUND');
    productId = product.id;
    storeId = product.storeId;
    subjectTitle = product.name;
  } else if (subjectType === 'merchant') {
    const store = await StoreAccess.findByPk(subjectId, {
      transaction: options.transaction,
    });
    if (!store) fail('Store not found', 404, 'STORE_NOT_FOUND');
    storeId = store.storeId;
    subjectTitle = store.name || `Store ${store.storeId.slice(0, 8)}`;
  }

  return {
    eligible,
    subjectType,
    subjectId,
    orderId,
    storeId,
    productId,
    subjectTitle,
    deadline,
    reasonCodes,
    guidance: eligible
      ? 'Subject is eligible for report or complaint submission'
      : (reasonCodes.includes('ORDER_RETURN_WINDOW_EXPIRED')
          ? 'The 7-day return and damage reporting window has elapsed since delivery'
          : 'Submission is not permitted'),
    existingReport: null,
  };
}

/**
 * Submits a new buyer report and idempotently links to an authoritative Core SupportCase.
 */
async function submitBuyerReport(buyerId, input = {}, options = {}) {
  const { subjectType, subjectId, category, reason, description, evidence } = input;
  const idempotencyKey = options.idempotencyKey || input.idempotencyKey || null;
  const correlationId = options.correlationId || input.correlationId || null;
  const simulateFailure = options.simulateFailure || input.simulateFailure || false;
  const parentTx = options.transaction;

  // 1. Validate fields
  if (!category || !String(category).trim()) fail('Report category is required', 400, 'CATEGORY_REQUIRED');
  if (!reason || String(reason).trim().length < 5) fail('A summary reason of at least 5 characters is required', 400, 'REASON_TOO_SHORT');
  if (!description || String(description).trim().length < 10) fail('A detailed description of at least 10 characters is required', 400, 'DESCRIPTION_TOO_SHORT');

  const cleanReason = String(reason).trim().slice(0, 255);
  const cleanDescription = String(description).trim().slice(0, 4000);
  const cleanCategory = String(category).trim();
  const cleanEvidence = sanitizeEvidence(evidence);

  const execute = async (tx) => {
    // 2. Idempotency Check
    if (idempotencyKey) {
      const prior = await BuyerReport.findOne({
        where: { idempotencyKey },
        transaction: tx,
      }).catch(() => null);

      if (prior) {
        if (
          prior.buyerId === buyerId &&
          prior.subjectType === subjectType &&
          prior.subjectId === subjectId &&
          prior.reason === cleanReason
        ) {
          return { duplicate: true, report: prior };
        }
        fail(`Idempotency key ${idempotencyKey} conflict with different report payload`, 409, 'IDEMPOTENCY_CONFLICT');
      }
    }

    // 3. Server-side Eligibility Check
    const eligibility = await evaluateEligibility(buyerId, { subjectType, subjectId }, { transaction: tx });
    if (!eligibility.eligible) {
      const primaryReason = eligibility.reasonCodes[0] || 'INELIGIBLE_FOR_REPORT';
      fail(eligibility.guidance || 'Subject is not eligible for complaint or report submission', 409, primaryReason);
    }

    const reportNumber = generateReportNumber();
    const reportData = {
      id: randomUUID(),
      reportNumber,
      buyerId,
      subjectType,
      subjectId,
      orderId: eligibility.orderId || null,
      storeId: eligibility.storeId || null,
      productId: eligibility.productId || null,
      category: cleanCategory,
      reason: cleanReason,
      description: cleanDescription,
      evidence: cleanEvidence,
      eligibilitySnapshot: {
        evaluatedAt: new Date().toISOString(),
        deadline: eligibility.deadline,
        reasonCodes: eligibility.reasonCodes,
      },
      linkageStatus: 'pending_linkage',
      linkageAttempts: 0,
      idempotencyKey: idempotencyKey || null,
    };

    let reportRecord = null;
    if (typeof BuyerReport?.create === 'function') {
      reportRecord = await BuyerReport.create(reportData, { transaction: tx });
    } else {
      reportRecord = reportData;
    }

    // 4. Record order timeline event if linked to an order
    if (eligibility.orderId) {
      try {
        const eventType = subjectType === 'return' ? 'return_requested' : 'complaint_filed';
        if (typeof OrderEvent?.create === 'function') {
          await OrderEvent.create({
            id: randomUUID(),
            orderId: eligibility.orderId,
            storeId: eligibility.storeId || null,
            actorId: buyerId,
            type: eventType,
            eventKey: `rpt-evt-${reportRecord.id}`,
            details: {
              reportNumber,
              category: cleanCategory,
              reason: cleanReason,
              evidenceCount: cleanEvidence?.length || 0,
            },
          }, { transaction: tx }).catch(() => {});
        }
      } catch (err) {
        // Non-fatal for order event logging
      }
    }

    // 5. Emit transactional domain event to EventOutbox
    try {
      const { eventOutboxService } = require('../events');
      if (typeof eventOutboxService?.recordEvent === 'function') {
        await eventOutboxService.recordEvent({
          eventId: randomUUID(),
          eventType: 'order.complaint_filed',
          schemaVersion: '1.0.0',
          aggregateType: 'BuyerReport',
          aggregateId: reportRecord.id,
          aggregateVersion: 1,
          occurredAt: new Date().toISOString(),
          producer: 'ecommerce-server',
          correlationId,
          storeId: eligibility.storeId || null,
          payload: {
            reportId: reportRecord.id,
            reportNumber,
            buyerId,
            subjectType,
            subjectId,
            category: cleanCategory,
            reason: cleanReason,
            evidenceUrls: (cleanEvidence || []).map((e) => e.url),
          },
        }, { transaction: tx });
      }
    } catch (err) {
      // Non-fatal
    }

    // 6. Invoke Core Support-Case Linkage Adapter
    const linkageResult = await coreCaseLinkageAdapter.linkReportToCoreCase(reportRecord, {
      simulateFailure,
      transaction: tx,
    });

    return {
      duplicate: false,
      report: reportRecord,
      linkage: linkageResult,
    };
  };

  if (parentTx) return execute(parentTx);
  const { sequelize } = require('../../config/db');
  return sequelize.transaction(execute);
}

/**
 * Returns authoritative Commerce facts for Core / Admin SupportCase investigation.
 * Does NOT leak mutable internal administrative notes.
 */
async function getAuthoritativeFacts(reportId) {
  const report = await BuyerReport.findByPk(reportId, {
    include: [
      {
        model: Order,
        as: 'Order',
        include: [{ model: OrderItem, as: 'OrderItems' }],
      },
      { model: Product, as: 'Product' },
      { model: StoreAccess, as: 'Store' },
    ],
  });

  if (!report) fail('Buyer report not found', 404, 'REPORT_NOT_FOUND');

  // Load OrderEvents if order is linked
  let orderTimeline = [];
  if (report.orderId && typeof OrderEvent?.findAll === 'function') {
    const events = await OrderEvent.findAll({
      where: { orderId: report.orderId },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'type', 'actorId', 'createdAt', 'details'],
    }).catch(() => []);
    orderTimeline = events.map((e) => ({
      id: e.id,
      type: e.type,
      actorId: e.actorId,
      occurredAt: e.createdAt,
      reason: e.details?.reason || null,
    }));
  }

  return {
    report: {
      id: report.id,
      reportNumber: report.reportNumber,
      buyerId: report.buyerId,
      subjectType: report.subjectType,
      subjectId: report.subjectId,
      category: report.category,
      reason: report.reason,
      description: report.description,
      evidence: report.evidence,
      createdAt: report.createdAt,
      linkage: {
        status: report.linkageStatus,
        coreCaseId: report.coreCaseId,
        coreCaseNumber: report.coreCaseNumber,
        attempts: report.linkageAttempts,
        lastAttemptAt: report.lastLinkageAttemptAt,
        lastError: report.lastLinkageError,
      },
    },
    orderFacts: report.Order ? {
      orderId: report.Order.id,
      orderNumber: report.Order.orderNumber,
      status: report.Order.status,
      deliveryStatus: report.Order.deliveryStatus,
      paymentStatus: report.Order.paymentStatus,
      totalAmount: report.Order.totalAmount,
      currency: report.Order.currency,
      deliveredAt: report.Order.deliveredAt || null,
      items: (report.Order.OrderItems || []).map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      timeline: orderTimeline,
    } : null,
    storeFacts: report.Store ? {
      storeId: report.Store.storeId,
      name: report.Store.name,
      status: report.Store.status,
      contactEmail: report.Store.contactEmail || null,
    } : null,
    productFacts: report.Product ? {
      productId: report.Product.id,
      name: report.Product.name,
      sku: report.Product.sku,
      price: report.Product.price,
      moderationStatus: report.Product.moderationStatus,
    } : null,
  };
}

/**
 * Lists buyer reports with filtering.
 */
async function listReports({ buyerId = null, storeId = null, subjectType = null, linkageStatus = null, page = 1, limit = 20 } = {}) {
  const where = {};
  if (buyerId) where.buyerId = buyerId;
  if (storeId) where.storeId = storeId;
  if (subjectType) where.subjectType = subjectType;
  if (linkageStatus) where.linkageStatus = linkageStatus;

  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

  if (typeof BuyerReport?.findAndCountAll !== 'function') {
    return { items: [], total: 0, page, limit };
  }

  const { rows, count } = await BuyerReport.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit: Math.min(100, Math.max(1, limit)),
  });

  return {
    items: rows,
    total: count,
    page: Number(page),
    limit: Number(limit),
  };
}

/**
 * Escalates an unresolved report/dispute and emits order.dispute_escalated outbox event.
 */
async function escalateReport(reportId, { reason = '48h SLA response deadline breached', actor = null } = {}, { transaction = null } = {}) {
  const report = await BuyerReport.findByPk(reportId, { transaction });
  if (!report) fail('Report not found', 404, 'REPORT_NOT_FOUND');

  let order = null;
  if (report.subjectType === 'order') {
    order = await Order.findByPk(report.subjectId, { transaction });
  }

  const { emitOrderDisputeEscalated } = require('../events');
  await emitOrderDisputeEscalated({
    order: order || { id: report.subjectId, orderNumber: report.subjectId, storeId: report.storeId, buyerId: report.buyerId },
    caseId: report.coreCaseId || report.id,
    escalationReason: reason,
  }, { transaction });

  return { escalated: true, reportId: report.id };
}

module.exports = {
  sanitizeEvidence,
  evaluateEligibility,
  submitBuyerReport,
  escalateReport,
  getAuthoritativeFacts,
  listReports,
  retryReportLinkage: coreCaseLinkageAdapter.retryReportLinkage,
};
