const crypto = require('crypto');
const { getMerchantCache } = require('./cache');

/**
 * Refresh tokens rotate on every use. When a page sends several requests at
 * once just after its access token expired, all of them carry the same
 * refresh token: the first rotates it and the rest would be rejected, signing
 * the person out. For a short window after a rotation, the replaced token may
 * still obtain an access token, but never another refresh token.
 *
 * Only a SHA-256 fingerprint of the replaced token is stored, for GRACE_SECONDS.
 * Without Redis this degrades to the previous behaviour (no grace).
 */
const GRACE_SECONDS = 60;

const graceKey = (kind, token) =>
  `auth:rotated:${kind}:${crypto.createHash('sha256').update(String(token)).digest('hex')}`;

const rememberRotatedToken = (kind, token, entityId) =>
  getMerchantCache().set(graceKey(kind, token), { id: entityId }, GRACE_SECONDS);

const wasJustRotated = async (kind, token, entityId) => {
  const entry = await getMerchantCache().get(graceKey(kind, token));
  return Boolean(entry && entry.id === entityId);
};

module.exports = { GRACE_SECONDS, rememberRotatedToken, wasJustRotated };
