const { Op } = require('sequelize');
const { User, PlatformRoleGrant, BreakGlassGrant, UserSession } = require('../models');
const {
  PLATFORM_ROLES, ALL_PLATFORM_PERMISSIONS, permissionsForRole,
} = require('../config/platformAuthorization');

function errorResponse(res, status, code, message) {
  return res.status(status).json({ error: { code, message, fieldErrors: [], retryable: false } });
}

function scopeMatches(grant, required) {
  if (!required || required.type === 'platform') return grant.scopeType === 'platform';
  if (grant.scopeType === 'platform') return true;
  return grant.scopeType === required.type && String(grant.scopeId) === String(required.id);
}

async function resolvePlatformAccess(userId, now = new Date()) {
  const user = await User.findByPk(userId, { attributes: ['id', 'role', 'mfaEnabled'] });
  if (!user) return null;
  if (user.role === 'admin') {
    return {
      user, compatibilityAdmin: true, roles: [PLATFORM_ROLES.PLATFORM_ADMIN],
      grants: [{ role: PLATFORM_ROLES.PLATFORM_ADMIN, scopeType: 'platform', scopeId: null }],
      permissions: [...ALL_PLATFORM_PERMISSIONS], breakGlassGrants: [],
    };
  }
  const grants = (await PlatformRoleGrant.findAll({ where: { userId, status: 'active' } }))
    .filter((grant) => grant.status === 'active');
  const breakGlassGrants = (await BreakGlassGrant.findAll({
    where: { userId, status: 'active', startsAt: { [Op.lte]: now }, expiresAt: { [Op.gt]: now } },
  })).filter((grant) => grant.status === 'active' && new Date(grant.startsAt) <= now && new Date(grant.expiresAt) > now);
  return {
    user, compatibilityAdmin: false, grants, breakGlassGrants,
    roles: [...new Set(grants.map((grant) => grant.role))],
    permissions: [...new Set(grants.flatMap((grant) => permissionsForRole(grant.role)))],
  };
}

function createRequirePlatformPermission({ anyOf = [], allOf = [], scope = () => ({ type: 'platform' }) } = {}) {
  return async (req, res, next) => {
    if (!req.user?.id) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Authentication required');
    const access = await resolvePlatformAccess(req.user.id);
    if (!access || (!access.compatibilityAdmin && access.grants.length === 0 && access.breakGlassGrants.length === 0)) {
      return errorResponse(res, 403, 'PERMISSION_DENIED', 'Platform permission denied');
    }
    const requiredScope = await scope(req);
    const ordinary = new Set();
    const applicableRoles = [];
    for (const grant of access.grants) {
      if (scopeMatches(grant, requiredScope)) {
        permissionsForRole(grant.role).forEach((permission) => ordinary.add(permission));
        applicableRoles.push(grant.role);
      }
    }
    const breakGlass = new Set();
    let breakGlassGrantId = null;
    for (const grant of access.breakGlassGrants) {
      if (scopeMatches(grant, requiredScope)) {
        (grant.permissions || []).forEach((permission) => breakGlass.add(permission));
        breakGlassGrantId ||= grant.id;
      }
    }
    const effective = new Set([...ordinary, ...breakGlass]);
    const hasAny = anyOf.length === 0 || anyOf.some((permission) => effective.has(permission));
    const hasAll = allOf.every((permission) => effective.has(permission));
    if (!hasAny || !hasAll) return errorResponse(res, 403, 'PERMISSION_DENIED', 'Platform permission denied');
    req.platformAccess = {
      ...access, roles: [...new Set(applicableRoles)], effectivePermissions: [...effective],
      tenantScope: `${requiredScope.type}/${requiredScope.id || '*'}`, breakGlassGrantId,
    };
    return next();
  };
}

async function requirePlatformOperator(req, res, next) {
  if (!req.user?.id) return errorResponse(res, 401, 'UNAUTHENTICATED', 'Authentication required');
  const access = await resolvePlatformAccess(req.user.id);
  if (!access || (!access.compatibilityAdmin && access.grants.length === 0)) {
    return errorResponse(res, 403, 'PERMISSION_DENIED', 'Platform permission denied');
  }
  req.platformAccess = { ...access, effectivePermissions: access.permissions, tenantScope: 'self/*' };
  return next();
}

async function requireMfaVerified(req, res, next) {
  const user = await User.findByPk(req.user?.id, { attributes: ['id', 'mfaEnabled'] });
  if (!user?.mfaEnabled) return errorResponse(res, 403, 'MFA_REQUIRED', 'MFA is required for this action');
  let session = req.user.sessionId
    ? await UserSession.findByPk(req.user.sessionId, { attributes: ['id', 'revokedAt', 'expiresAt', 'mfaVerified'] })
    : null;
  if (!session && req.cookies?.userRefreshToken) {
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(String(req.cookies.userRefreshToken)).digest('hex');
    session = await UserSession.findOne({ where: { userId: req.user.id, tokenHash, revokedAt: null },
      attributes: ['id', 'revokedAt', 'expiresAt', 'mfaVerified'] });
    if (session) req.user.sessionId = session.id;
  }
  if (!session || session.revokedAt || session.expiresAt < new Date() || !session.mfaVerified) {
    return errorResponse(res, 403, 'MFA_REQUIRED', 'An MFA-verified session is required');
  }
  return next();
}

module.exports = {
  createRequirePlatformPermission, requirePlatformOperator, requireMfaVerified,
  resolvePlatformAccess, scopeMatches, errorResponse,
};
