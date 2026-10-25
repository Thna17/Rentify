const { AuditLog } = require('../models');
const { logger } = require('./logger');

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
  transaction,
} = {}) {
  const detailsStr = details
    ? typeof details === 'string'
      ? details
      : JSON.stringify(details)
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
};
