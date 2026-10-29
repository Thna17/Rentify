const axios = require('axios');
const { RENTIFY_API_BASE } = require('../../config/serviceUrls');
const cookieConfig = require('../../config/cookieConfig');
const { ApiError, formatErrorEnvelope } = require('../../utils/ApiError');

// Temporary compatibility names used by the Phase 5 Commerce/Admin lane map
// to the canonical Core permission contract. Core-issued dot permissions are
// authoritative; callers never gain a permission merely by naming an alias.
const PERMISSION_ALIASES = Object.freeze({
  'ops:overview:read': ['platform.audit.read', 'finance.subscription.read', 'seller.application.read'],
  'support:case:read': ['support.case.read'],
  'support:case:write': ['support.case.update'],
  'support:dispute:resolve': ['support.case.resolve'],
  'catalog:moderate': ['catalog.product.hold', 'catalog.product.reject.approve', 'catalog.appeal.decide'],
  'review:moderate': ['catalog.product.hold'],
  'inventory:adjust': ['platform.role.manage.approve'],
  'seller:review': ['seller.application.read', 'seller.decision.approve'],
  'maker_checker:approve': ['seller.decision.approve', 'catalog.product.reject.approve',
    'finance.subscription.transition.approve', 'finance.reconciliation.repair.approve',
    'platform.role.manage.approve', 'platform.identity.change.approve'],
});

const sendError = (res, req, apiError) => {
  const { statusCode, body } = formatErrorEnvelope(apiError, req);
  res.setHeader?.('X-Correlation-ID', body.error.correlationId);
  return res.status(statusCode).json(body);
};

const createVerifyCoreAdmin = ({ validate = (accessToken, refreshToken) => axios.post(
  `${RENTIFY_API_BASE}/api/auth/validate-token`, { accessToken, refreshToken },
) } = {}) => async (req, res, next) => {
  const authorization = req.headers?.authorization || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  // Core uses the session cookie before a bearer token. Match that order so an
  // old token left in browser storage cannot override a valid admin session.
  const accessToken = req.cookies?.userAccessToken || bearer;
  const refreshToken = req.cookies?.userRefreshToken;
  if (!accessToken && !refreshToken) return sendError(res, req, ApiError.unauthorized('Admin sign-in required'));
  let result;
  try { result = await validate(accessToken, refreshToken); }
  catch (_error) { return sendError(res, req, ApiError.unauthorized('Admin sign-in required')); }
  if (!result.data?.valid || !result.data.entity?.id) {
    return sendError(res, req, ApiError.unauthorized('Admin sign-in required'));
  }
  if (result.data.entity.type !== 'admin') {
    return sendError(res, req, ApiError.forbidden('Admin access required'));
  }

  // P5-ADM-001: Extract scoped permission claims from Core token validation
  const entity = result.data.entity;
  const claims = Array.isArray(entity.claims)
    ? entity.claims
    : (Array.isArray(entity.permissions)
      ? entity.permissions
      : (Array.isArray(result.data.claims) ? result.data.claims : []));

  req.user = {
    id: entity.id,
    role: entity.role || entity.type || 'admin',
    claims,
  };

  if (result.data.newAccessToken) res.cookie('userAccessToken', result.data.newAccessToken, {
    ...cookieConfig, maxAge: 15 * 60 * 1000,
  });
  return next();
};

/**
 * P5-ADM-001: Scoped permission guard for Commerce operations.
 * Enforces server-side granular claims:
 * ops:overview:read, support:case:read, support:case:write, support:dispute:resolve,
 * catalog:moderate, review:moderate, inventory:adjust, maker_checker:approve.
 */
const requireAdminPermission = (requiredClaim) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, req, ApiError.unauthorized('Admin sign-in required'));
  }
  const claims = Array.isArray(req.user.claims) ? req.user.claims : [];
  // Super admin role or wildcard '*' grants full access
  const accepted = [requiredClaim, ...(PERMISSION_ALIASES[requiredClaim] || [])];
  if (req.user.role === 'super_admin' || claims.includes('*') || accepted.some((claim) => claims.includes(claim))) {
    return next();
  }
  return sendError(res, req, ApiError.forbidden(
    `Missing required permission: ${requiredClaim}`,
    'FORBIDDEN_INSUFFICIENT_PERMISSIONS'
  ));
};

module.exports = {
  verifyCoreAdmin: createVerifyCoreAdmin(),
  createVerifyCoreAdmin,
  requireAdminPermission,
  PERMISSION_ALIASES,
};
