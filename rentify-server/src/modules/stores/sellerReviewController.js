const sellerReviewService = require('./sellerReviewService');
const storeSyncService = require('../commerce-sync').storeSyncService;
const { Store, SellerApplication, SellerReview } = require('../../models');
const { asyncHandler } = require('../../utils/helpers');
const approvalService = require('../../utils/adminApprovalService');
const { emitAuditEvent } = require('../../utils/auditLogger');
const { getCorrelationId } = require('../../utils/logger');

exports.submit = asyncHandler(async (req, res) => {
  const application = await sellerReviewService.submit(req.user.id, req.body);
  storeSyncService.syncStore(application.storeId).catch(() => {});
  return res.status(202).json({ success: true, data: application });
});

exports.getMine = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ where: { ownerUserId: req.user.id } });
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const application = await SellerApplication.findByPk(store.id);
  return res.json({ success: true, data: application });
});

exports.getForReview = asyncHandler(async (req, res) => {
  const application = await SellerApplication.findByPk(req.params.storeId);
  if (!application) return res.status(404).json({ message: 'Seller application not found' });
  const reviews = await SellerReview.findAll({
    where: { storeId: req.params.storeId }, order: [['createdAt', 'DESC']],
  });
  return res.json({ success: true, data: { application, reviews } });
});

exports.review = asyncHandler(async (req, res) => {
  const decision = req.body?.decision;
  let checklist = req.body?.checklist;
  if (!checklist && decision === 'approved') {
    checklist = Object.fromEntries(sellerReviewService.checklistKeys.map((k) => [k, true]));
  }
  let reason = req.body?.reason;
  if (!reason && decision !== 'approved') {
    reason = decision === 'suspended' ? 'Suspended by platform administrator' :
             decision === 'rejected' ? 'Application rejected by platform administrator' :
             'Review changes requested by platform administrator';
  }
  const storeBefore = await Store.findByPk(req.params.storeId);
  if (!storeBefore) return res.status(404).json({ message: 'Store not found' });
  let approval = null;
  if (decision === 'rejected' || decision === 'suspended') {
    const change = { decision, checklist, reason };
    const action = decision === 'suspended' ? 'seller.store.suspend' : 'seller.decision.reject';
    try {
      approval = await approvalService.consume({ approvalId: req.body.approvalRequestId, action,
        targetType: 'Store', targetId: req.params.storeId, requestedChange: change,
        beforeVersion: storeBefore.projectionVersion });
    } catch (error) {
      return res.status(error.code === 'APPROVAL_REQUIRED' ? 403 : 409).json({ error: {
        code: error.code, message: error.message, fieldErrors: [], retryable: false } });
    }
  }
  const result = await sellerReviewService.review({
    storeId: req.params.storeId,
    reviewerUserId: req.user.id,
    decision,
    checklist,
    reason,
  });
  storeSyncService.syncStore(result.store.id).catch(() => {});
  await emitAuditEvent({ correlationId: getCorrelationId(req), actorUserId: req.user.id,
    actorRole: req.platformAccess.roles[0], actorRoles: req.platformAccess.roles,
    effectivePermissions: req.platformAccess.effectivePermissions, action: 'SELLER_REVIEW_RECORDED',
    resource: 'Store', resourceId: result.store.id, reason, sourceCaseId: req.body.sourceCaseId,
    tenantScope: req.platformAccess.tenantScope, approvalRequestId: approval?.id,
    breakGlassGrantId: req.platformAccess.breakGlassGrantId,
    safeBefore: { marketplaceApprovalStatus: storeBefore.marketplaceApprovalStatus, projectionVersion: storeBefore.projectionVersion },
    safeAfter: { marketplaceApprovalStatus: result.store.marketplaceApprovalStatus, projectionVersion: result.store.projectionVersion,
      decision }, ipAddress: req.ip, userAgent: req.get?.('user-agent') });
  return res.json({ success: true, data: result });
});
