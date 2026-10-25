const crypto = require('crypto');

/**
 * Derives a 32-byte AES-256 key from environment configurations.
 * Prioritizes MFA_ENCRYPTION_KEY, then PAYMENT_CONFIG_ENCRYPTION_KEY, COOKIE_SECRET, JWT_SECRET.
 * @returns {Buffer} 32-byte key buffer
 */
function getEncryptionKey() {
  const customKey = process.env.MFA_ENCRYPTION_KEY;
  if (customKey) {
    if (customKey.length === 64) {
      // Hex-encoded 32 bytes
      return Buffer.from(customKey, 'hex');
    }
    if (customKey.length === 44 && customKey.endsWith('=')) {
      // Base64-encoded 32 bytes
      return Buffer.from(customKey, 'base64');
    }
    // Hash arbitrary string to 32 bytes
    return crypto.createHash('sha256').update(customKey).digest();
  }

  const fallback =
    process.env.PAYMENT_CONFIG_ENCRYPTION_KEY ||
    process.env.COOKIE_SECRET ||
    process.env.JWT_SECRET ||
    'rentify-mfa-default-fallback-key-32bytes!';

  if (process.env.PAYMENT_CONFIG_ENCRYPTION_KEY) {
    try {
      const buf = Buffer.from(process.env.PAYMENT_CONFIG_ENCRYPTION_KEY, 'base64');
      if (buf.length === 32) return buf;
    } catch (_e) {
      // ignore
    }
  }

  return crypto.createHash('sha256').update(fallback).digest();
}

/**
 * Encrypts a plaintext string (e.g. Base32 TOTP seed) using AES-256-GCM.
 * @param {string} plaintext
 * @returns {string} JSON-serialized encryption envelope { v, iv, tag, ct }
 */
function encryptMfaSecret(plaintext) {
  if (!plaintext) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard GCM 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: ciphertext.toString('base64'),
  });
}

/**
 * Decrypts an AES-256-GCM envelope to plaintext.
 * @param {string} encryptedJson
 * @returns {string} Decrypted plaintext string
 */
function decryptMfaSecret(encryptedJson) {
  if (!encryptedJson) return null;
  let envelope;
  try {
    envelope = JSON.parse(encryptedJson);
  } catch (err) {
    throw new Error('Invalid MFA secret encryption envelope');
  }

  if (!envelope.iv || !envelope.tag || !envelope.ct) {
    throw new Error('Malformed MFA secret encryption payload');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const ciphertext = Buffer.from(envelope.ct, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  encryptMfaSecret,
  decryptMfaSecret,
  getEncryptionKey,
};
