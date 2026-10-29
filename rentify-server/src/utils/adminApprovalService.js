const crypto = require('crypto');
const { AdminApprovalRequest } = require('../models');
const { APPROVAL_ACTION_BY_NAME } = require('../config/platformAuthorization');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function changeHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
const CHANGE_FIELDS = Object.freeze({
  'seller.store.suspend': new Set(['status', 'marketplaceApprovalStatus', 'marketplaceEnabled']),
  'platform.store.close': new Set(['status', 'marketplaceApprovalStatus', 'marketplaceEnabled']),
  'seller.decision.reject': new Set(['decision', 'checklist', 'reason']),
  'platform.role.change': new Set(['operation', 'userId', 'grantId', 'role', 'previousRole', 'scopeType', 'scopeId']),
  'platform.identity.change': new Set(['operation', 'emailFingerprint', 'phoneFingerprint']),
});
function validateChange(action, requestedChange) {
  if (!requestedChange || Array.isArray(requestedChange) || typeof requestedChange !== 'object') return false;
  const allowed = CHANGE_FIELDS[action];
  return allowed && Object.keys(requestedChange).every((key) => allowed.has(key));
}

async function propose({ action, targetType, targetId, scopeType, scopeId, actorUserId, actorRole,
  reason, sourceCaseId, requestedChange, beforeVersion, correlationId, expiresInMinutes = 30 }) {
  if (!APPROVAL_ACTION_BY_NAME[action]) throw Object.assign(new Error('Unsupported approval action'), { code: 'VALIDATION_FAILED' });
  if (!reason || !targetType || !targetId || !requestedChange) throw Object.assign(new Error('Approval fields are required'), { code: 'VALIDATION_FAILED' });
  if (!validateChange(action, requestedChange)) throw Object.assign(new Error('Requested change contains unsupported fields'), { code: 'VALIDATION_FAILED' });
  if (action === 'platform.role.change' || action === 'platform.identity.change') {
    if (scopeType !== 'platform' || scopeId) throw Object.assign(new Error('Identity and role changes require platform scope'), { code: 'VALIDATION_FAILED' });
    if (action === 'platform.identity.change' && targetType !== 'User') throw Object.assign(new Error('Identity changes require a User target'), { code: 'VALIDATION_FAILED' });
    if (action === 'platform.role.change' && !['User', 'PlatformRoleGrant'].includes(targetType)) throw Object.assign(new Error('Role changes require a User or role-grant target'), { code: 'VALIDATION_FAILED' });
  } else if (targetType !== 'Store' || scopeType !== 'store' || String(scopeId) !== String(targetId)) {
    throw Object.assign(new Error('Seller and Store actions require the authoritative Store scope'), { code: 'VALIDATION_FAILED' });
  }
  const expiresAt = new Date(Date.now() + Math.min(60, Math.max(5, Number(expiresInMinutes) || 30)) * 60000);
  return AdminApprovalRequest.create({ action, targetType, targetId: String(targetId), scopeType, scopeId,
    proposedByUserId: actorUserId, proposedByRole: actorRole, reason, sourceCaseId: sourceCaseId || null,
    requestedChange: stable(requestedChange), requestedChangeHash: changeHash(requestedChange), beforeVersion,
    expiresAt, correlationId });
}

async function decide({ approvalId, actorUserId, actorRole, decision, reason }) {
  const approval = await AdminApprovalRequest.findByPk(approvalId);
  if (!approval) throw Object.assign(new Error('Approval request not found'), { code: 'NOT_FOUND' });
  if (approval.proposedByUserId === actorUserId) throw Object.assign(new Error('Initiator cannot approve their own action'), { code: 'APPROVAL_SELF_REVIEW_FORBIDDEN' });
  if (approval.status !== 'pending') throw Object.assign(new Error('Approval request is no longer pending'), { code: 'CONFLICT' });
  if (new Date(approval.expiresAt) <= new Date()) {
    await approval.update({ status: 'expired' });
    throw Object.assign(new Error('Approval request expired'), { code: 'APPROVAL_STALE' });
  }
  if (!['approved', 'rejected'].includes(decision)) throw Object.assign(new Error('Decision must be approved or rejected'), { code: 'VALIDATION_FAILED' });
  await approval.update({ status: decision, decidedByUserId: actorUserId, decidedByRole: actorRole,
    decidedAt: new Date(), decisionReason: reason || null });
  return approval;
}

async function consume({ approvalId, action, targetType, targetId, requestedChange, beforeVersion }) {
  if (!approvalId) throw Object.assign(new Error('Approval request is required'), { code: 'APPROVAL_REQUIRED' });
  const approval = await AdminApprovalRequest.findByPk(approvalId);
  if (!approval) throw Object.assign(new Error('Approval request not found'), { code: 'NOT_FOUND' });
  const stale = approval.status !== 'approved' || approval.executedAt || new Date(approval.expiresAt) <= new Date()
    || approval.action !== action || approval.targetType !== targetType || String(approval.targetId) !== String(targetId)
    || approval.requestedChangeHash !== changeHash(requestedChange)
    || (approval.beforeVersion != null && Number(approval.beforeVersion) !== Number(beforeVersion));
  if (stale) throw Object.assign(new Error('Approval is expired, used, or does not match this mutation'), { code: 'APPROVAL_STALE' });
  const executedAt = new Date();
  const [affected] = await AdminApprovalRequest.update({ status: 'executed', executedAt }, {
    where: { id: approval.id, status: 'approved', executedAt: null },
  });
  if (affected !== 1) throw Object.assign(new Error('Approval was already executed'), { code: 'APPROVAL_STALE' });
  approval.status = 'executed';
  approval.executedAt = executedAt;
  return approval;
}

module.exports = { stable, changeHash, validateChange, propose, decide, consume };
