// ecommerce-server/modules/catalog/productModerationService.js
// P5-TRUST-001: Authoritative product policy enforcement, moderation decisions,
// merchant appeals, and immutable audit history.

const { randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const {
  Product,
  ProductModerationHistory,
  StoreAccess,
} = require('../../models');
const { evaluateProductPolicy, getTaxonomyGuidance } = require('./restrictedProductTaxonomy');

function fail(message, statusCode = 400, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
}

function sanitizeEvidenceUrls(urls) {
  if (!urls) return null;
  const list = Array.isArray(urls) ? urls : [urls];
  return list.map((item) => {
    const str = String(item).trim();
    if (!str.startsWith('https://')) {
      fail('Evidence must be a secure HTTPS URL', 400, 'INVALID_EVIDENCE_URL');
    }
    if (str.startsWith('javascript:') || str.startsWith('data:')) {
      fail('Invalid evidence URL scheme', 400, 'INSECURE_EVIDENCE_URL');
    }
    return str.slice(0, 500);
  });
}

async function safeEmitOutboxEvent({ eventType, aggregateId, storeId, payload, correlationId = null }, transaction = null) {
  try {
    const { eventOutboxService } = require('../events');
    if (typeof eventOutboxService?.recordEvent === 'function') {
      await eventOutboxService.recordEvent({
        eventId: randomUUID(),
        eventType,
        schemaVersion: '1.0.0',
        aggregateType: 'Product',
        aggregateId,
        aggregateVersion: 1,
        occurredAt: new Date().toISOString(),
        producer: 'ecommerce-server',
        correlationId,
        storeId,
        payload,
      }, { transaction });
    }
  } catch (err) {
    // Non-fatal if outbox table not yet migrated or mocked
  }
}

/**
 * Pre-submission policy evaluation for draft products.
 */
function evaluateForSubmission(input) {
  const result = evaluateProductPolicy(input);
  return {
    ...result,
    guidanceCatalog: getTaxonomyGuidance(),
  };
}

/**
 * Automatically evaluates and applies policy during product creation or update.
 * If prohibited or uncertain terms are found, product is automatically held in 'flagged' status.
 */
async function applyPolicyOnSave(product, input, { actor = { id: 'system', type: 'system' }, transaction = null } = {}) {
  const evalResult = evaluateProductPolicy({
    name: input.name !== undefined ? input.name : product.name,
    description: input.description !== undefined ? input.description : product.description,
    shortDescription: input.shortDescription !== undefined ? input.shortDescription : product.shortDescription,
    tags: input.tags !== undefined ? input.tags : product.tags,
    marketplaceCategory: input.marketplaceCategory !== undefined ? input.marketplaceCategory : product.marketplaceCategory,
  });

  if (!evalResult.compliant) {
    const previousStatus = product.moderationStatus || 'approved';
    product.moderationStatus = 'flagged';
    product.marketplaceVisibility = false;
    product.prohibitedReasonCode = evalResult.primaryReasonCode;
    product.moderationNotes = evalResult.guidance;
    product.moderatedAt = new Date();
    product.moderatedBy = actor.id || 'system';

    // Record immutable audit history
    if (typeof ProductModerationHistory?.create === 'function') {
      await ProductModerationHistory.create({
        id: randomUUID(),
        productId: product.id,
        storeId: product.storeId || null,
        action: 'system_flag',
        previousStatus,
        newStatus: 'flagged',
        reasonCode: evalResult.primaryReasonCode,
        reason: evalResult.guidance,
        evidence: null,
        actorId: actor.id || 'system',
        actorType: actor.type || 'system',
        idempotencyKey: `sys-flag-${product.id}-${Date.now()}`,
      }, { transaction }).catch(() => {});
    }

    // Emit outbox event
    await safeEmitOutboxEvent({
      eventType: 'product.moderation_flagged',
      aggregateId: product.id,
      storeId: product.storeId || null,
      payload: {
        productId: product.id,
        storeId: product.storeId,
        moderationStatus: 'flagged',
        reasonCode: evalResult.primaryReasonCode,
        guidance: evalResult.guidance,
        matchedCategories: evalResult.matchedCategories.map((c) => c.code),
      },
    }, transaction);
  }

  return {
    evalResult,
    held: !evalResult.compliant,
  };
}

/**
 * Moderator decision: approve, reject, or flag a product.
 * Requires moderator reasonCode and reason text.
 */
async function recordModeratorDecision(productId, {
  decision,
  reasonCode,
  reason,
  evidence = null,
  actor = { id: 'admin', type: 'admin' },
  idempotencyKey = null,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  const normalizedDecision = {
    approve: 'approve',
    approved: 'approve',
    reject: 'reject',
    rejected: 'reject',
    flag: 'flag',
    flagged: 'flag',
  }[String(decision || '').toLowerCase()];

  if (!normalizedDecision) {
    fail('Invalid moderator decision. Must be approve, reject, or flag', 400, 'INVALID_MODERATOR_DECISION');
  }

  if (normalizedDecision !== 'approve') {
    if (!reasonCode || !String(reasonCode).trim()) {
      fail('Moderator reason code is required for hold or rejection', 400, 'MODERATION_REASON_CODE_REQUIRED');
    }
    if (!reason || String(reason).trim().length < 5) {
      fail('A detailed moderator reason of at least 5 characters is required', 400, 'MODERATION_REASON_REQUIRED');
    }
  }

  const effectiveReasonCode = String(reasonCode || (normalizedDecision === 'approve' ? 'APPROVED_BY_OPERATOR' : 'POLICY_VIOLATION')).trim();
  const effectiveReason = reason ? String(reason).trim() : 'Listing approved by platform moderation';
  const cleanEvidence = sanitizeEvidenceUrls(evidence);

  const execute = async (tx) => {
    // Idempotency check
    if (idempotencyKey && typeof ProductModerationHistory?.findOne === 'function') {
      const prior = await ProductModerationHistory.findOne({
        where: { idempotencyKey },
        transaction: tx,
      }).catch(() => null);

      if (prior) {
        if (prior.productId === productId && prior.action === normalizedDecision && prior.reasonCode === effectiveReasonCode) {
          const product = await Product.findByPk(productId, { transaction: tx });
          return { duplicate: true, product, history: prior };
        }
        fail(`Idempotency key ${idempotencyKey} conflict with different action`, 409, 'IDEMPOTENCY_CONFLICT');
      }
    }

    const product = await Product.findByPk(productId, {
      transaction: tx,
      lock: tx?.LOCK ? tx.LOCK.UPDATE : undefined,
    });
    if (!product) fail('Product not found', 404, 'PRODUCT_NOT_FOUND');

    const previousStatus = product.moderationStatus || 'approved';
    const newStatus = normalizedDecision === 'approve' ? 'approved' : (normalizedDecision === 'reject' ? 'rejected' : 'flagged');

    const updates = {
      moderationStatus: newStatus,
      prohibitedReasonCode: newStatus === 'approved' ? null : effectiveReasonCode,
      moderationNotes: effectiveReason,
      moderatedAt: new Date(),
      moderatedBy: actor.id || 'admin',
    };

    if (newStatus !== 'approved') {
      updates.marketplaceVisibility = false;
    }

    if (newStatus === 'approved' && product.appealStatus === 'pending') {
      updates.appealStatus = 'approved';
    }

    await product.update(updates, { transaction: tx });

    let historyRecord = null;
    if (typeof ProductModerationHistory?.create === 'function') {
      historyRecord = await ProductModerationHistory.create({
        id: randomUUID(),
        productId: product.id,
        storeId: product.storeId || null,
        action: normalizedDecision,
        previousStatus,
        newStatus,
        reasonCode: effectiveReasonCode,
        reason: effectiveReason,
        evidence: cleanEvidence,
        actorId: actor.id || 'admin',
        actorType: actor.type || 'admin',
        idempotencyKey: idempotencyKey || null,
      }, { transaction: tx });
    }

    const eventType = normalizedDecision === 'approve'
      ? 'product.moderation_approved'
      : (normalizedDecision === 'reject' ? 'product.moderation_rejected' : 'product.moderation_flagged');

    await safeEmitOutboxEvent({
      eventType,
      aggregateId: product.id,
      storeId: product.storeId || null,
      payload: {
        productId: product.id,
        storeId: product.storeId,
        previousStatus,
        moderationStatus: newStatus,
        reasonCode: effectiveReasonCode,
        reason: effectiveReason,
        moderatedBy: actor.id || 'admin',
      },
      correlationId,
    }, tx);

    return { duplicate: false, product, history: historyRecord };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Merchant appeal submission.
 * Enforces tenant safety: product must belong to the requesting store.
 * Held product remains non-purchasable while appeal is pending.
 */
async function submitMerchantAppeal(storeId, productId, {
  reason,
  evidenceUrls = [],
  actor = { id: 'merchant', type: 'merchant' },
  idempotencyKey = null,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  if (!storeId) fail('storeId is required', 400, 'STORE_ID_REQUIRED');
  if (!productId) fail('productId is required', 400, 'PRODUCT_ID_REQUIRED');
  if (!reason || String(reason).trim().length < 10) {
    fail('An appeal explanation of at least 10 characters is required', 400, 'APPEAL_REASON_REQUIRED');
  }

  const cleanEvidence = sanitizeEvidenceUrls(evidenceUrls);
  const cleanReason = String(reason).trim();

  const execute = async (tx) => {
    // Idempotency check
    if (idempotencyKey && typeof ProductModerationHistory?.findOne === 'function') {
      const prior = await ProductModerationHistory.findOne({
        where: { idempotencyKey },
        transaction: tx,
      }).catch(() => null);

      if (prior) {
        if (prior.productId === productId && prior.action === 'appeal_submitted') {
          const product = await Product.findByPk(productId, { transaction: tx });
          return { duplicate: true, product, history: prior };
        }
        fail(`Idempotency key ${idempotencyKey} conflict with different action`, 409, 'IDEMPOTENCY_CONFLICT');
      }
    }

    const product = await Product.findByPk(productId, {
      transaction: tx,
      lock: tx?.LOCK ? tx.LOCK.UPDATE : undefined,
    });
    if (!product) fail('Product not found', 404, 'PRODUCT_NOT_FOUND');

    // Tenant safety enforcement: product must belong to requesting store
    if (product.storeId && product.storeId !== storeId) {
      fail('Cannot appeal a product belonging to another store', 403, 'CROSS_TENANT_ACCESS_DENIED');
    }

    if (product.moderationStatus === 'approved') {
      fail('Cannot appeal an approved product', 400, 'PRODUCT_ALREADY_APPROVED');
    }

    if (product.appealStatus === 'pending') {
      fail('An appeal is already pending review for this product', 409, 'APPEAL_ALREADY_PENDING');
    }

    await product.update({
      appealStatus: 'pending',
      appealedAt: new Date(),
    }, { transaction: tx });

    let historyRecord = null;
    if (typeof ProductModerationHistory?.create === 'function') {
      historyRecord = await ProductModerationHistory.create({
        id: randomUUID(),
        productId: product.id,
        storeId: product.storeId || storeId,
        action: 'appeal_submitted',
        previousStatus: product.moderationStatus,
        newStatus: product.moderationStatus, // Status remains flagged/rejected during appeal
        reasonCode: product.prohibitedReasonCode || 'MERCHANT_APPEAL',
        reason: cleanReason,
        evidence: cleanEvidence,
        actorId: actor.id || 'merchant',
        actorType: actor.type || 'merchant',
        idempotencyKey: idempotencyKey || null,
      }, { transaction: tx });
    }

    await safeEmitOutboxEvent({
      eventType: 'product.appeal_submitted',
      aggregateId: product.id,
      storeId: product.storeId || storeId,
      payload: {
        productId: product.id,
        storeId: product.storeId || storeId,
        moderationStatus: product.moderationStatus,
        appealStatus: 'pending',
        reason: cleanReason,
        evidenceUrls: cleanEvidence,
      },
      correlationId,
    }, tx);

    return { duplicate: false, product, history: historyRecord };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Moderator decision on an open merchant appeal.
 */
async function decideAppeal(productId, {
  decision,
  reasonCode = null,
  reason,
  evidence = null,
  actor = { id: 'admin', type: 'admin' },
  idempotencyKey = null,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  const normalizedDecision = {
    approve: 'approve',
    approved: 'approve',
    reject: 'reject',
    rejected: 'reject',
  }[String(decision || '').toLowerCase()];

  if (!normalizedDecision) {
    fail('Appeal decision must be approve or reject', 400, 'INVALID_APPEAL_DECISION');
  }
  if (!reason || String(reason).trim().length < 5) {
    fail('A detailed review explanation of at least 5 characters is required', 400, 'REVIEW_REASON_REQUIRED');
  }

  const cleanEvidence = sanitizeEvidenceUrls(evidence);
  const cleanReason = String(reason).trim();
  const effectiveReasonCode = String(reasonCode || (normalizedDecision === 'approve' ? 'APPEAL_ACCEPTED' : 'APPEAL_REJECTED')).trim();

  const execute = async (tx) => {
    // Idempotency check
    if (idempotencyKey && typeof ProductModerationHistory?.findOne === 'function') {
      const prior = await ProductModerationHistory.findOne({
        where: { idempotencyKey },
        transaction: tx,
      }).catch(() => null);

      if (prior) {
        if (prior.productId === productId && (prior.action === 'appeal_approved' || prior.action === 'appeal_rejected')) {
          const product = await Product.findByPk(productId, { transaction: tx });
          return { duplicate: true, product, history: prior };
        }
        fail(`Idempotency key ${idempotencyKey} conflict with different action`, 409, 'IDEMPOTENCY_CONFLICT');
      }
    }

    const product = await Product.findByPk(productId, {
      transaction: tx,
      lock: tx?.LOCK ? tx.LOCK.UPDATE : undefined,
    });
    if (!product) fail('Product not found', 404, 'PRODUCT_NOT_FOUND');

    if (product.appealStatus !== 'pending') {
      fail(`Product has no pending appeal (current status: ${product.appealStatus})`, 400, 'NO_PENDING_APPEAL');
    }

    const previousStatus = product.moderationStatus;
    const newStatus = normalizedDecision === 'approve' ? 'approved' : 'rejected';
    const action = normalizedDecision === 'approve' ? 'appeal_approved' : 'appeal_rejected';

    const updates = {
      appealStatus: normalizedDecision === 'approve' ? 'approved' : 'rejected',
      moderationStatus: newStatus,
      prohibitedReasonCode: normalizedDecision === 'approve' ? null : effectiveReasonCode,
      moderationNotes: cleanReason,
      moderatedAt: new Date(),
      moderatedBy: actor.id || 'admin',
    };

    if (newStatus !== 'approved') {
      updates.marketplaceVisibility = false;
    }

    await product.update(updates, { transaction: tx });

    let historyRecord = null;
    if (typeof ProductModerationHistory?.create === 'function') {
      historyRecord = await ProductModerationHistory.create({
        id: randomUUID(),
        productId: product.id,
        storeId: product.storeId || null,
        action,
        previousStatus,
        newStatus,
        reasonCode: effectiveReasonCode,
        reason: cleanReason,
        evidence: cleanEvidence,
        actorId: actor.id || 'admin',
        actorType: actor.type || 'admin',
        idempotencyKey: idempotencyKey || null,
      }, { transaction: tx });
    }

    await safeEmitOutboxEvent({
      eventType: 'product.appeal_decided',
      aggregateId: product.id,
      storeId: product.storeId || null,
      payload: {
        productId: product.id,
        storeId: product.storeId,
        decision,
        moderationStatus: newStatus,
        appealStatus: updates.appealStatus,
        reasonCode: effectiveReasonCode,
        reason: cleanReason,
        moderatedBy: actor.id || 'admin',
      },
      correlationId,
    }, tx);

    return { duplicate: false, product, history: historyRecord };
  };

  if (parentTx) return execute(parentTx);
  return sequelize.transaction(execute);
}

/**
 * Returns the immutable moderation history for a product.
 * Enforces tenant safety when storeId is provided.
 */
async function getModerationHistory(productId, { storeId = null } = {}) {
  const product = await Product.findByPk(productId, { attributes: ['id', 'storeId'] });
  if (!product) fail('Product not found', 404, 'PRODUCT_NOT_FOUND');

  if (storeId && product.storeId && product.storeId !== storeId) {
    fail('Cannot view moderation history for another store', 403, 'CROSS_TENANT_ACCESS_DENIED');
  }

  if (typeof ProductModerationHistory?.findAll !== 'function') return [];

  return ProductModerationHistory.findAll({
    where: { productId },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Returns products in the moderation queue (flagged, pending, or under appeal).
 */
async function getModerationQueue({ status = 'flagged', page = 1, limit = 20, q = '' } = {}) {
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const where = {};

  if (status === 'appealed') {
    where.appealStatus = 'pending';
  } else if (['flagged', 'pending', 'rejected', 'approved'].includes(status)) {
    where.moderationStatus = status;
  } else if (status === 'all_open') {
    where[Op.or] = [
      { moderationStatus: { [Op.in]: ['flagged', 'pending'] } },
      { appealStatus: 'pending' },
    ];
  }

  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    where[Op.or] = [
      { name: { [Op.like]: term } },
      { prohibitedReasonCode: { [Op.like]: term } },
    ];
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    attributes: [
      'id', 'name', 'slug', 'storeId', 'websiteId', 'price',
      'stockQuantity', 'status', 'moderationStatus', 'prohibitedReasonCode',
      'moderationNotes', 'appealStatus', 'appealedAt', 'moderatedAt', 'moderatedBy', 'createdAt',
    ],
    order: [['appealedAt', 'DESC'], ['updatedAt', 'DESC']],
    limit: Math.min(100, Math.max(1, limit)),
    offset,
  });

  return {
    items: rows,
    total: count,
    page,
    limit,
  };
}

module.exports = {
  evaluateForSubmission,
  applyPolicyOnSave,
  recordModeratorDecision,
  submitMerchantAppeal,
  decideAppeal,
  getModerationHistory,
  getModerationQueue,
};
