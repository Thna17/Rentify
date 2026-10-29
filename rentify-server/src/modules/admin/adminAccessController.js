const { Op } = require('sequelize');
const { PlatformRoleGrant, BreakGlassGrant, AdminApprovalRequest, User } = require('../../models');
const { PLATFORM_ROLES, SCOPE_TYPES, isKnownPermission, BREAK_GLASS_DENIED_PERMISSIONS } = require('../../config/platformAuthorization');
const approvalService = require('../../utils/adminApprovalService');
const sessionManager = require('../../utils/sessionManager');
const { emitAuditEvent } = require('../../utils/auditLogger');
const { getCorrelationId } = require('../../utils/logger');

function auditContext(req) {
  return { correlationId: getCorrelationId(req), actorUserId: req.user.id,
    actorRole: req.platformAccess?.roles?.[0] || req.user.role,
    actorRoles: req.platformAccess?.roles || [], effectivePermissions: req.platformAccess?.effectivePermissions || [],
    tenantScope: req.platformAccess?.tenantScope, breakGlassGrantId: req.platformAccess?.breakGlassGrantId,
    ipAddress: req.ip, userAgent: req.get?.('user-agent') };
}
function sendError(res, error) {
  const status = error.code === 'NOT_FOUND' ? 404
    : ['APPROVAL_SELF_REVIEW_FORBIDDEN', 'APPROVAL_REQUIRED', 'BREAK_GLASS_EXPIRED'].includes(error.code) ? 403
      : error.code === 'VALIDATION_FAILED' ? 400 : 409;
  return res.status(status).json({ error: { code: error.code || 'VALIDATION_FAILED', message: error.message,
    fieldErrors: [], retryable: false } });
}
function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), 'base64url').toString('utf8'));
    if (!parsed.createdAt || !parsed.id) throw new Error();
    return parsed;
  } catch (_error) {
    throw Object.assign(new Error('Invalid pagination cursor'), { code: 'VALIDATION_FAILED' });
  }
}
function cursorWhere(cursor) {
  if (!cursor) return {};
  return { [Op.or]: [{ createdAt: { [Op.lt]: new Date(cursor.createdAt) } },
    { createdAt: new Date(cursor.createdAt), id: { [Op.lt]: cursor.id } }] };
}
function nextCursor(rows, limit) {
  if (rows.length < limit) return null;
  const last = rows[rows.length - 1];
  return Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString('base64url');
}

exports.me = async (req, res) => res.json({ data: { roles: req.platformAccess.roles,
  permissions: req.platformAccess.effectivePermissions, compatibilityAdmin: req.platformAccess.compatibilityAdmin,
  tenantScope: req.platformAccess.tenantScope } });

exports.listApprovals = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursor = decodeCursor(req.query.cursor);
    const rows = await AdminApprovalRequest.findAll({ where: { ...(req.query.status ? { status: req.query.status } : {}),
      ...cursorWhere(cursor) }, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit });
    res.json({ data: rows, page: { limit, nextCursor: nextCursor(rows, limit) } });
  } catch (error) { sendError(res, error); }
};

exports.listRoleGrants = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.status) where.status = req.query.status;
    Object.assign(where, cursorWhere(decodeCursor(req.query.cursor)));
    const rows = await PlatformRoleGrant.findAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit });
    res.json({ data: rows, page: { limit, nextCursor: nextCursor(rows, limit) } });
  } catch (error) { sendError(res, error); }
};

exports.proposeApproval = async (req, res) => {
  try {
    const approval = await approvalService.propose({ ...req.body, actorUserId: req.user.id,
      actorRole: req.platformAccess.roles[0], correlationId: getCorrelationId(req) });
    await emitAuditEvent({ ...auditContext(req), action: 'ADMIN_APPROVAL_PROPOSED', resource: 'AdminApprovalRequest',
      resourceId: approval.id, reason: approval.reason, sourceCaseId: approval.sourceCaseId,
      approvalRequestId: approval.id, safeAfter: approval.toJSON() });
    res.status(201).json({ data: approval });
  } catch (error) { sendError(res, error); }
};

exports.decideApproval = async (req, res) => {
  try {
    const before = await AdminApprovalRequest.findByPk(req.params.approvalId);
    const approval = await approvalService.decide({ approvalId: req.params.approvalId, actorUserId: req.user.id,
      actorRole: req.platformAccess.roles[0], decision: req.body.decision, reason: req.body.reason });
    await emitAuditEvent({ ...auditContext(req), action: `ADMIN_APPROVAL_${approval.status.toUpperCase()}`,
      resource: 'AdminApprovalRequest', resourceId: approval.id, reason: req.body.reason,
      sourceCaseId: approval.sourceCaseId, approvalRequestId: approval.id,
      safeBefore: before?.toJSON(), safeAfter: approval.toJSON() });
    res.json({ data: approval });
  } catch (error) { sendError(res, error); }
};

exports.createRoleGrant = async (req, res) => {
  const { userId, role, scopeType = 'platform', scopeId, reason, sourceCaseId, approvalRequestId } = req.body;
  if (!Object.values(PLATFORM_ROLES).includes(role) || !SCOPE_TYPES.includes(scopeType) || !reason) {
    return sendError(res, Object.assign(new Error('Valid userId, role, scope and reason are required'), { code: 'VALIDATION_FAILED' }));
  }
  const user = await User.findByPk(userId);
  if (!user) return sendError(res, Object.assign(new Error('Target user not found'), { code: 'NOT_FOUND' }));
  const change = { operation: 'grant', userId, role, scopeType, scopeId: scopeId || null };
  try {
    const approval = await approvalService.consume({ approvalId: approvalRequestId, action: 'platform.role.change',
      targetType: 'User', targetId: userId, requestedChange: change });
    const grant = await PlatformRoleGrant.create({ ...change, scopeId: scopeId || '*', grantedByUserId: req.user.id, reason,
      sourceCaseId: sourceCaseId || null });
    await sessionManager.revokeAllUserSessions(userId);
    await emitAuditEvent({ ...auditContext(req), action: 'PLATFORM_ROLE_GRANTED', resource: 'PlatformRoleGrant',
      resourceId: grant.id, reason, sourceCaseId, approvalRequestId: approval.id, safeAfter: grant.toJSON() });
    res.status(201).json({ data: grant });
  } catch (error) { sendError(res, error); }
};

exports.revokeRoleGrant = async (req, res) => {
  const grant = await PlatformRoleGrant.findByPk(req.params.grantId);
  if (!grant) return sendError(res, Object.assign(new Error('Role grant not found'), { code: 'NOT_FOUND' }));
  const change = { operation: 'revoke', grantId: grant.id, userId: grant.userId, role: grant.role,
    scopeType: grant.scopeType, scopeId: grant.scopeId };
  try {
    const approval = await approvalService.consume({ approvalId: req.body.approvalRequestId,
      action: 'platform.role.change', targetType: 'PlatformRoleGrant', targetId: grant.id, requestedChange: change });
    const before = grant.toJSON();
    await grant.update({ status: 'revoked', revokedAt: new Date() });
    await sessionManager.revokeAllUserSessions(grant.userId);
    await emitAuditEvent({ ...auditContext(req), action: 'PLATFORM_ROLE_REVOKED', resource: 'PlatformRoleGrant',
      resourceId: grant.id, reason: req.body.reason, sourceCaseId: req.body.sourceCaseId,
      approvalRequestId: approval.id, safeBefore: before, safeAfter: grant.toJSON() });
    res.json({ data: grant });
  } catch (error) { sendError(res, error); }
};

exports.createBreakGlass = async (req, res) => {
  if (process.env.PLATFORM_BREAK_GLASS_ENABLED !== 'true') {
    return res.status(403).json({ error: { code: 'BREAK_GLASS_DISABLED', message: 'Break-glass is disabled by policy', fieldErrors: [], retryable: false } });
  }
  const { permissions, scopeType, scopeId, reason, sourceCaseId } = req.body;
  const duration = Number(req.body.durationMinutes);
  const maxDuration = Number(process.env.PLATFORM_BREAK_GLASS_MAX_MINUTES || 0);
  if (!reason || !sourceCaseId || !SCOPE_TYPES.includes(scopeType) || !Array.isArray(permissions) || !permissions.length
      || !maxDuration || duration < 1 || duration > maxDuration || permissions.some((p) => !isKnownPermission(p) || BREAK_GLASS_DENIED_PERMISSIONS.has(p))) {
    return sendError(res, Object.assign(new Error('Break-glass request violates policy'), { code: 'VALIDATION_FAILED' }));
  }
  const grant = await BreakGlassGrant.create({ userId: req.user.id, permissions: [...new Set(permissions)],
    scopeType, scopeId: scopeId || null, reason, sourceCaseId, startsAt: new Date(),
    expiresAt: new Date(Date.now() + duration * 60000), correlationId: getCorrelationId(req) });
  await emitAuditEvent({ ...auditContext(req), action: 'BREAK_GLASS_GRANTED', resource: 'BreakGlassGrant',
    resourceId: grant.id, reason, sourceCaseId, breakGlassGrantId: grant.id, safeAfter: grant.toJSON() });
  res.status(201).json({ data: grant });
};

exports.revokeBreakGlass = async (req, res) => {
  const grant = await BreakGlassGrant.findOne({ where: { id: req.params.grantId, status: 'active', expiresAt: { [Op.gt]: new Date() } } });
  if (!grant) return sendError(res, Object.assign(new Error('Break-glass grant not found or expired'), { code: 'BREAK_GLASS_EXPIRED' }));
  const before = grant.toJSON();
  await grant.update({ status: 'revoked', revokedAt: new Date(), revokedByUserId: req.user.id });
  await sessionManager.revokeAllUserSessions(grant.userId);
  await emitAuditEvent({ ...auditContext(req), action: 'BREAK_GLASS_REVOKED', resource: 'BreakGlassGrant',
    resourceId: grant.id, reason: req.body.reason, sourceCaseId: grant.sourceCaseId,
    breakGlassGrantId: grant.id, safeBefore: before, safeAfter: grant.toJSON() });
  res.json({ data: grant });
};
