const { Op } = require('sequelize');
const { Store, User, Website, WebsiteTemplate, Subscription, Package,
  SellerApplication, SellerReview, Payment } = require('../../models');
const approvalService = require('../../utils/adminApprovalService');
const { emitAuditEvent } = require('../../utils/auditLogger');
const { getCorrelationId } = require('../../utils/logger');

const owner = { model: User, as: 'owner', attributes: ['id', 'name', 'email', 'phoneNumber', 'isVerified'] };
const website = { model: Website, as: 'website', attributes: ['id', 'name', 'domain', 'status'] };
const application = { model: SellerApplication, as: 'sellerApplication',
  attributes: ['responsibleName', 'pickupLocation', 'buyerContact', 'sampleProductDescription',
    'acceptsDeliveryResponsibility', 'acceptsCodResponsibility', 'acceptsReturnsResponsibility',
    'acceptsRefundResponsibility', 'status', 'reviewReason', 'submittedAt'] };

const resources = {
  stores: { model: Store, search: ['name', 'slug', 'primaryCategory'],
    attributes: ['id', 'ownerUserId', 'name', 'slug', 'primaryCategory', 'needsCategoryReview',
      'marketplaceEnabled', 'marketplaceApprovalStatus', 'marketplaceEntitlement',
      'status', 'createdAt'],
    include: (req) => [owner, website, { ...application,
      required: Boolean(req.query.applicationStatus),
      ...(req.query.applicationStatus ? { where: { status: req.query.applicationStatus } } : {}) }],
    where: (req) => req.query.status ? { marketplaceApprovalStatus: req.query.status } : {} },
  users: { model: User, search: ['name', 'email', 'phoneNumber'],
    attributes: ['id', 'name', 'email', 'phoneNumber', 'role', 'isVerified', 'createdAt'],
    include: () => [{ model: Store, as: 'store', attributes: ['id', 'name'] }] },
  websites: { model: Website, search: ['name', 'domain'],
    attributes: ['id', 'storeId', 'name', 'domain', 'status', 'templateId', 'lastDeployment', 'createdAt'] },
  templates: { model: WebsiteTemplate, search: ['name'],
    attributes: ['id', 'name', 'category', 'framework', 'createdAt'] },
  subscriptions: { model: Subscription, search: ['status'],
    attributes: ['id', 'userId', 'websiteId', 'packageId', 'status', 'startDate', 'endDate', 'createdAt'],
    include: () => [{ model: Package, attributes: ['id', 'name', 'price', 'duration'] }] },
  packages: { model: Package, search: ['name'],
    attributes: ['id', 'name', 'price', 'duration', 'features', 'limits', 'createdAt'] },
  'plan-payments': { model: Payment, search: ['status', 'transactionId'],
    attributes: ['id', 'userId', 'amount', 'currency', 'status', 'paymentMethod',
      'transactionId', 'createdAt'] },
  'seller-reviews': { model: SellerReview, search: ['decision'],
    attributes: ['id', 'storeId', 'reviewerUserId', 'decision', 'checklist', 'reason', 'createdAt'],
    where: (req) => req.query.storeId ? { storeId: req.query.storeId } : {} },
};

exports.list = async (req, res) => {
  const config = resources[req.params.resource];
  if (!config) return res.status(404).json({ error: 'Unknown admin resource' });
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const q = String(req.query.q || '').trim().slice(0, 120);
  const where = { ...(config.where?.(req) || {}) };
  if (q) where[Op.or] = config.search.map((field) => ({ [field]: { [Op.like]: `%${q}%` } }));
  const { rows, count } = await config.model.findAndCountAll({
    where, attributes: config.attributes, include: config.include?.(req) || [],
    distinct: true, order: [['createdAt', 'DESC']], limit, offset: (page - 1) * limit,
  });
  res.json({ data: rows, total: count, page, limit });
};

exports.overview = async (_req, res) => {
  const [storeCount, activeStores, pendingSellers, websiteCount, userCount,
    activeSubscriptions, pendingPlanPayments] = await Promise.all([
    Store.count(), Store.count({ where: { status: 'active' } }),
    SellerApplication.count({ where: { status: 'pending' } }),
    Website.count(), User.count(), Subscription.count({ where: { status: 'active' } }),
    Payment.count({ where: { status: 'pending' } }),
  ]);
  res.json({ data: { storeCount, activeStores, pendingSellers, websiteCount,
    userCount, activeSubscriptions, pendingPlanPayments } });
};

exports.updateStore = async (req, res) => {
  const { storeId } = req.params;
  const { marketplaceEnabled, status, marketplaceApprovalStatus } = req.body;
  if (marketplaceApprovalStatus === 'rejected') {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED',
      message: 'Use the seller review workflow to reject an application', fieldErrors: [], retryable: false } });
  }
  const store = await Store.findByPk(storeId);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const updates = {};
  if (typeof marketplaceEnabled === 'boolean') updates.marketplaceEnabled = marketplaceEnabled;
  if (status && ['active', 'suspended', 'closed'].includes(status)) updates.status = status;
  if (marketplaceApprovalStatus && ['pending', 'approved', 'needs_changes', 'rejected', 'suspended'].includes(marketplaceApprovalStatus)) {
    updates.marketplaceApprovalStatus = marketplaceApprovalStatus;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid updates provided' });
  }
  const before = { marketplaceEnabled: store.marketplaceEnabled, status: store.status,
    marketplaceApprovalStatus: store.marketplaceApprovalStatus, projectionVersion: store.projectionVersion };
  let approval = null;
  if (updates.status === 'closed' || updates.status === 'suspended' || updates.marketplaceApprovalStatus === 'suspended') {
    const action = updates.status === 'closed' ? 'platform.store.close' : 'seller.store.suspend';
    try {
      approval = await approvalService.consume({ approvalId: req.body.approvalRequestId, action,
        targetType: 'Store', targetId: storeId, requestedChange: updates, beforeVersion: store.projectionVersion });
    } catch (error) {
      const statusCode = error.code === 'APPROVAL_REQUIRED' ? 403 : 409;
      return res.status(statusCode).json({ error: { code: error.code, message: error.message, fieldErrors: [], retryable: false } });
    }
  }
  updates.projectionVersion = store.projectionVersion + 1;
  await store.update(updates);
  const website = await Website.findOne({ where: { storeId }, attributes: ['id'] });
  const storeSyncService = require('../commerce-sync').storeSyncService;
  await storeSyncService.queueStore(store, { websiteId: website?.id || null });
  storeSyncService.syncStore(storeId).catch(() => {});
  await emitAuditEvent({ correlationId: getCorrelationId(req), actorUserId: req.user.id,
    actorRole: req.platformAccess.roles[0], actorRoles: req.platformAccess.roles,
    effectivePermissions: req.platformAccess.effectivePermissions, action: 'PLATFORM_STORE_UPDATED',
    resource: 'Store', resourceId: storeId, reason: req.body.reason,
    sourceCaseId: req.body.sourceCaseId, tenantScope: req.platformAccess.tenantScope,
    approvalRequestId: approval?.id, breakGlassGrantId: req.platformAccess.breakGlassGrantId,
    safeBefore: before, safeAfter: { ...updates }, ipAddress: req.ip, userAgent: req.get?.('user-agent') });
  res.json({ success: true, data: store });
};
