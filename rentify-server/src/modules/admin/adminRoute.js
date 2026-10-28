const express = require("express");
const router = express.Router();
const { createTemplate, updateTemplate, deleteTemplate, getAllTemplates, getTemplateById } = require("./adminController");
const { verifyToken } = require("../../middlewares/auth");
const { requireRecentAuth } = require("../../middlewares/recentAuth");
const { createRequirePlatformPermission, requirePlatformOperator, requireMfaVerified } = require('../../middlewares/platformAuthorization');
const sellerReviewController = require('../stores').sellerReviewController;
const operations = require('./platformOperationsController');
const security = require('./adminSecurityController');
const access = require('./adminAccessController');
const { APPROVAL_ACTION_BY_NAME } = require('../../config/platformAuthorization');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.use(verifyToken);
const permission = (name, scope) => createRequirePlatformPermission({ anyOf: Array.isArray(name) ? name : [name], scope });
const platformScope = () => ({ type: 'platform' });
const storeScope = (req) => ({ type: 'store', id: req.params.storeId });
const resourcePermissions = {
  stores: ['seller.application.read'], users: ['platform.identity.read'],
  websites: ['platform.audit.read'], templates: ['platform.audit.read'],
  subscriptions: ['finance.subscription.read'], packages: ['finance.subscription.read'],
  'plan-payments': ['finance.payment.read'], 'seller-reviews': ['seller.audit.read'],
};
const requireResourceRead = (req, res, next) => permission(resourcePermissions[req.params.resource] || ['__unknown__'], platformScope)(req, res, next);
const requireProposalPermission = (req, res, next) => {
  const policy = APPROVAL_ACTION_BY_NAME[req.body.action];
  return permission(policy?.proposePermission || '__unknown__', () => ({ type: req.body.scopeType, id: req.body.scopeId }))(req, res, next);
};
const requireApprovalPermission = async (req, res, next) => {
  const { AdminApprovalRequest } = require('../../models');
  const approval = await AdminApprovalRequest.findByPk(req.params.approvalId);
  if (!approval) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Approval request not found', fieldErrors: [], retryable: false } });
  req.approvalRequest = approval;
  const policy = APPROVAL_ACTION_BY_NAME[approval.action];
  return permission(policy?.approvePermission || '__unknown__', () => ({ type: approval.scopeType, id: approval.scopeId }))(req, res, next);
};

router.get('/access/me', requirePlatformOperator, safe(access.me));
router.get('/approvals', permission(['platform.role.read', 'seller.audit.read'], platformScope), safe(access.listApprovals));
router.post('/approvals', requireProposalPermission, requireRecentAuth, requireMfaVerified, safe(access.proposeApproval));
router.post('/approvals/:approvalId/decision', requireApprovalPermission, requireRecentAuth, requireMfaVerified, safe(access.decideApproval));
router.get('/role-grants', permission('platform.role.read', platformScope), safe(access.listRoleGrants));
router.post('/role-grants', permission('platform.role.manage.approve', platformScope), requireRecentAuth, requireMfaVerified, safe(access.createRoleGrant));
router.delete('/role-grants/:grantId', permission('platform.role.manage.approve', platformScope), requireRecentAuth, requireMfaVerified, safe(access.revokeRoleGrant));
router.post('/break-glass', permission('platform.break_glass.use', platformScope), requireRecentAuth, requireMfaVerified, safe(access.createBreakGlass));
router.delete('/break-glass/:grantId', permission('platform.break_glass.use', platformScope), requireRecentAuth, requireMfaVerified, safe(access.revokeBreakGlass));

router.get('/operations/overview', permission(['platform.audit.read', 'finance.subscription.read', 'seller.application.read'], platformScope), safe(operations.overview));
router.get('/operations/:resource', requireResourceRead, safe(operations.list));
router.patch('/operations/stores/:storeId', permission('seller.decision.approve', storeScope), requireRecentAuth, requireMfaVerified, safe(operations.updateStore));
router.post("/template", permission('platform.role.manage.approve', platformScope), createTemplate);
router.put("/template/:id", permission('platform.role.manage.approve', platformScope), updateTemplate);
router.delete("/template/:id", permission('platform.role.manage.approve', platformScope), requireRecentAuth, requireMfaVerified, deleteTemplate);
router.get("/templates", permission('platform.audit.read', platformScope), getAllTemplates);
router.get("/template/:id", permission('platform.audit.read', platformScope), getTemplateById);
router.get('/stores/:storeId/seller-application', permission('seller.application.read', storeScope), sellerReviewController.getForReview);
router.post('/stores/:storeId/seller-review', permission(['seller.decision.propose', 'seller.decision.approve'], storeScope), requireRecentAuth, requireMfaVerified, sellerReviewController.review);

// Privileged Authentication & Session Controls (P2-SEC-001)
router.get('/mfa/status', requirePlatformOperator, safe(security.getMfaStatus));
router.post('/mfa/enroll', requirePlatformOperator, safe(security.enrollMfa));
router.post('/mfa/confirm', requirePlatformOperator, safe(security.confirmMfa));
router.post('/mfa/disable', requirePlatformOperator, requireRecentAuth, safe(security.disableMfa));
router.post('/mfa/recovery-codes/regenerate', requirePlatformOperator, requireRecentAuth, safe(security.regenerateRecoveryCodes));
router.post('/auth/step-up', requirePlatformOperator, safe(security.stepUpAuth));
router.get('/sessions', requirePlatformOperator, safe(security.listSessions));
router.delete('/sessions/:sessionId', requirePlatformOperator, safe(security.revokeSession));
router.post('/sessions/revoke-others', requirePlatformOperator, requireRecentAuth, safe(security.revokeAllOtherSessions));
router.post('/contact/change-request', permission('platform.identity.change.propose', platformScope), requireRecentAuth, requireMfaVerified, safe(security.requestContactChange));
router.post('/contact/verify', permission('platform.identity.change.propose', platformScope), requireRecentAuth, requireMfaVerified, safe(security.verifyContactChange));
router.patch('/users/:userId/role', permission('platform.role.manage.approve', platformScope), requireRecentAuth, requireMfaVerified, safe(security.updateUserRole));

module.exports = router;
