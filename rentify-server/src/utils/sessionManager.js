const crypto = require('crypto');
const { Op } = require('sequelize');
const { UserSession, User } = require('../models');

/**
 * Parses user agent string into friendly client descriptor.
 * @param {string} ua
 * @returns {string}
 */
function parseClientType(ua) {
  if (!ua || typeof ua !== 'string') return 'Unknown Client';
  const ual = ua.toLowerCase();

  let os = 'Unknown OS';
  if (ual.includes('iphone') || ual.includes('ipad') || ual.includes('ios')) os = 'iOS';
  else if (ual.includes('android')) os = 'Android';
  else if (ual.includes('mac os') || ual.includes('macintosh')) os = 'macOS';
  else if (ual.includes('windows')) os = 'Windows';
  else if (ual.includes('linux')) os = 'Linux';

  let browser = 'Browser';
  if (ual.includes('edg/')) browser = 'Edge';
  else if (ual.includes('chrome/') || ual.includes('crios/')) browser = 'Chrome';
  else if (ual.includes('safari/') && !ual.includes('chrome')) browser = 'Safari';
  else if (ual.includes('firefox/')) browser = 'Firefox';

  return `${browser} on ${os}`;
}

/**
 * Computes deterministic SHA-256 hash of a refresh token.
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Creates a new tracked user session upon login or verification.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} [params.refreshToken]
 * @param {object} [params.req]
 * @param {boolean} [params.isMfaVerified=false]
 * @param {object} [params.transaction]
 * @returns {Promise<UserSession>}
 */
async function createSession({
  userId,
  refreshToken,
  req,
  isMfaVerified = false,
  transaction,
}) {
  const userAgent = req?.headers?.['user-agent'] || null;
  const rawIp =
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;
  const ipAddress = rawIp ? String(rawIp).slice(0, 45) : null;
  const clientType = parseClientType(userAgent);
  const tokenHash = refreshToken ? hashToken(refreshToken) : null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session = await UserSession.create(
    {
      userId,
      tokenHash,
      userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
      ipAddress,
      clientType,
      lastActiveAt: now,
      expiresAt,
      revokedAt: null,
      recentAuthAt: now, // Initial authentication is recent
      mfaVerified: Boolean(isMfaVerified),
    },
    { transaction }
  );

  return session;
}

/**
 * Rotates an active session's refresh token hash.
 * @param {string} oldRefreshToken
 * @param {string} newRefreshToken
 * @param {object} [transaction]
 * @returns {Promise<UserSession|null>}
 */
async function rotateSessionToken({ oldRefreshToken, newRefreshToken, transaction }) {
  if (!oldRefreshToken || !newRefreshToken) return null;
  const oldHash = hashToken(oldRefreshToken);
  const newHash = hashToken(newRefreshToken);

  const session = await UserSession.findOne({
    where: {
      tokenHash: oldHash,
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    transaction,
  });

  if (session) {
    session.tokenHash = newHash;
    session.lastActiveAt = new Date();
    await session.save({ transaction });
    return session;
  }

  return null;
}

/**
 * Updates the recentAuthAt timestamp for an active session upon step-up re-authentication.
 * @param {string} sessionId
 * @param {object} [transaction]
 * @returns {Promise<UserSession|null>}
 */
async function updateRecentAuth(sessionId, transaction) {
  if (!sessionId) return null;
  const session = await UserSession.findByPk(sessionId, { transaction });
  if (session && !session.revokedAt) {
    session.recentAuthAt = new Date();
    session.lastActiveAt = new Date();
    await session.save({ transaction });
    return session;
  }
  return null;
}

/**
 * Returns session inventory for a user, omitting all raw tokens and hashes.
 * @param {string} userId
 * @param {string} [currentSessionId]
 * @returns {Promise<Array<object>>}
 */
async function listUserSessions(userId, currentSessionId = null) {
  if (!userId) return [];
  const sessions = await UserSession.findAll({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['lastActiveAt', 'DESC']],
  });

  return sessions.map((s) => ({
    id: s.id,
    clientType: s.clientType || 'Browser Session',
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    expiresAt: s.expiresAt,
    recentAuthAt: s.recentAuthAt,
    mfaVerified: s.mfaVerified,
    isCurrent: currentSessionId ? s.id === currentSessionId : false,
  }));
}

/**
 * Revokes a specific session.
 * @param {string} sessionId
 * @param {string} userId
 * @param {object} [transaction]
 * @returns {Promise<boolean>}
 */
async function revokeSession(sessionId, userId, transaction) {
  if (!sessionId || !userId) return false;
  const session = await UserSession.findOne({
    where: { id: sessionId, userId, revokedAt: null },
    transaction,
  });

  if (!session) return false;
  session.revokedAt = new Date();
  await session.save({ transaction });
  return true;
}

/**
 * Revokes all other sessions for a user, preserving the current active session.
 * @param {string} userId
 * @param {string} exceptSessionId
 * @param {object} [transaction]
 * @returns {Promise<number>} Number of sessions revoked
 */
async function revokeAllOtherSessions(userId, exceptSessionId, transaction) {
  if (!userId) return 0;
  const where = {
    userId,
    revokedAt: null,
  };
  if (exceptSessionId) {
    where.id = { [Op.ne]: exceptSessionId };
  }

  const [affectedCount] = await UserSession.update(
    { revokedAt: new Date() },
    { where, transaction }
  );

  return affectedCount;
}

/**
 * Revokes all sessions for a user (e.g. upon account suspension or role demotion).
 * @param {string} userId
 * @param {object} [transaction]
 * @returns {Promise<number>}
 */
async function revokeAllUserSessions(userId, transaction) {
  if (!userId) return 0;
  const [affectedCount] = await UserSession.update(
    { revokedAt: new Date() },
    {
      where: { userId, revokedAt: null },
      transaction,
    }
  );

  await User.update(
    { refreshToken: null, refreshTokenExpires: null },
    { where: { id: userId }, transaction }
  );

  return affectedCount;
}

module.exports = {
  createSession,
  rotateSessionToken,
  updateRecentAuth,
  listUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  revokeAllUserSessions,
  hashToken,
  parseClientType,
};
