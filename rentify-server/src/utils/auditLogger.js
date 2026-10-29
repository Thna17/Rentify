const { AuditLog } = require('../models');
const { logger, redact } = require('./logger');

const REDACTED_KEYS = /(password|secret|token|credential|recovery|otp|authorization|cookie)/i;
const UNNECESSARY_PERSONAL_KEYS = /^(email|phoneNumber|address|buyerContact)$/i;

function sanitizeAuditData(value, depth = 0) {
  if (value == null || depth > 5) return value == null ? value : '[TRUNCATED]';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeAuditData(item, depth + 1));
  if (typeof value !== 'object') return typeof value === 'string' ? redact(value).slice(0, 1000) : value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    REDACTED_KEYS.test(key) || UNNECESSARY_PERSONAL_KEYS.test(key)
      ? '[REDACTED]'
      : sanitizeAuditData(item, depth + 1),
  ]));
}

/**
 * Emits a structured privileged audit event.
 * Writes to both the structured logger and the persistent AuditLog table.
 *
 * @param {object} params
 * @param {string} [params.correlationId]
 * @param {string} [params.actorUserId]
 * @param {string} [params.actorRole]
 * @param {string} params.action - e.g. "ADMIN_MFA_ENROLLED", "ADMIN_ROLE_CHANGE"
 * @param {string} [params.resource]
 * @param {string} [params.resourceId]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {string} [params.status="SUCCESS"]
 * @param {object|string} [params.details]
 * @param {object} [params.transaction]
 * @returns {Promise<AuditLog|null>}
 */
async function emitAuditEvent({
  correlationId,
  actorUserId,
  actorRole = 'admin',
  action,
  resource,
  resourceId,
  ipAddress,
  userAgent,
  status = 'SUCCESS',
  details,
  actorRoles,
  effectivePermissions,
  reason,
  sourceCaseId,
  tenantScope,
  approvalRequestId,
  breakGlassGrantId,
  safeBefore,
  safeAfter,
  transaction,
} = {}) {
  const safeDetails = sanitizeAuditData(details);
  const detailsStr = safeDetails
    ? typeof safeDetails === 'string'
      ? safeDetails
      : JSON.stringify(safeDetails)
    : null;

  // Log to structured JSON logger with correlation ID
  logger.info(`AUDIT: ${action}`, {
    correlationId,
    actorUserId,
    actorRole,
    action,
    resource,
    resourceId,
    ipAddress,
    status,
    details: detailsStr,
    actorRoles: actorRoles || (actorRole ? [actorRole] : []),
    effectivePermissions: effectivePermissions || [],
    reason: String(reason || (safeDetails && typeof safeDetails === 'object' && safeDetails.reason) || action).slice(0, 500),
    sourceCaseId: sourceCaseId || null,
    tenantScope: tenantScope || 'self/*',
    approvalRequestId: approvalRequestId || null,
    breakGlassGrantId: breakGlassGrantId || null,
    safeBefore: sanitizeAuditData(safeBefore) || {},
    safeAfter: sanitizeAuditData(safeAfter) || {},
  });

  try {
    const entry = await AuditLog.create(
      {
        correlationId: correlationId || null,
        actorUserId: actorUserId || null,
        actorRole: actorRole || null,
        action,
        resource: resource || null,
        resourceId: resourceId ? String(resourceId) : null,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        status: status || 'SUCCESS',
        details: detailsStr,
        actorRoles: actorRoles || (actorRole ? [actorRole] : []),
        effectivePermissions: effectivePermissions || [],
        reason: String(reason || (safeDetails && typeof safeDetails === 'object' && safeDetails.reason) || action).slice(0, 500),
        sourceCaseId: sourceCaseId || null,
        tenantScope: tenantScope || 'self/*',
        approvalRequestId: approvalRequestId || null,
        breakGlassGrantId: breakGlassGrantId || null,
        safeBefore: sanitizeAuditData(safeBefore) || {},
        safeAfter: sanitizeAuditData(safeAfter) || {},
      },
      { transaction }
    );
    return entry;
  } catch (err) {
    logger.error('Failed to persist audit log to database', {
      error: err.message,
      action,
      actorUserId,
      correlationId,
    });
    return null;
  }
}

module.exports = {
  emitAuditEvent,
  sanitizeAuditData,
};
