const { UserSession } = require('../models');

const RECENT_AUTH_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Middleware requiring recent authentication for high-risk administrator actions.
 * If authentication was performed > 15 minutes ago, denies request with 403 RECENT_AUTH_REQUIRED.
 */
async function requireRecentAuth(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  let recentAuthAt = req.user.recentAuthAt;

  // If not on JWT token directly, check the active session
  if (!recentAuthAt && req.user.sessionId) {
    try {
      const session = await UserSession.findByPk(req.user.sessionId);
      if (session && !session.revokedAt) {
        recentAuthAt = session.recentAuthAt;
      }
    } catch (_err) {
      // Fall through to deny
    }
  }

  // If still not found and user has a refresh token cookie, check latest active session
  if (!recentAuthAt && req.cookies?.userRefreshToken) {
    try {
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(String(req.cookies.userRefreshToken)).digest('hex');
      const session = await UserSession.findOne({
        where: { tokenHash, userId: req.user.id, revokedAt: null },
      });
      if (session) {
        recentAuthAt = session.recentAuthAt;
        req.user.sessionId = session.id;
      }
    } catch (_err) {
      // Fall through to deny
    }
  }

  if (!recentAuthAt) {
    return res.status(403).json({
      error: 'Recent authentication required for high-risk action',
      code: 'RECENT_AUTH_REQUIRED',
      message: 'Please re-authenticate with your administrator credentials',
      recentAuthWindowMs: RECENT_AUTH_MAX_AGE_MS,
    });
  }

  const authTime = new Date(recentAuthAt).getTime();
  const elapsed = Date.now() - authTime;

  if (isNaN(authTime) || elapsed > RECENT_AUTH_MAX_AGE_MS) {
    return res.status(403).json({
      error: 'Recent authentication required for high-risk action',
      code: 'RECENT_AUTH_REQUIRED',
      message: 'Session authentication has expired for this high-risk action. Please re-authenticate.',
      elapsedMs: elapsed,
      recentAuthWindowMs: RECENT_AUTH_MAX_AGE_MS,
    });
  }

  // Passed recent authentication check
  next();
}

module.exports = {
  requireRecentAuth,
  RECENT_AUTH_MAX_AGE_MS,
};
