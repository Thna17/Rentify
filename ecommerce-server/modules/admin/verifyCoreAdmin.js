const axios = require('axios');
const { RENTIFY_API_BASE } = require('../../config/serviceUrls');
const cookieConfig = require('../../config/cookieConfig');
const { ApiError, formatErrorEnvelope } = require('../../utils/ApiError');

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
  if (req.user.role === 'super_admin' || claims.includes('*') || claims.includes(requiredClaim)) {
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
};
