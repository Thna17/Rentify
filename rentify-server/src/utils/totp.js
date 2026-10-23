const crypto = require('crypto');

// RFC 4648 Base32 alphabet (without padding characters)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to RFC 4648 Base32 string (without padding).
 * @param {Buffer} buffer
 * @returns {string}
 */
function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string to Buffer.
 * @param {string} input
 * @returns {Buffer}
 */
function base32Decode(input) {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Computes RFC 4226 HOTP code for a given secret buffer and counter.
 * @param {Buffer} keyBuffer
 * @param {number} counter
 * @param {number} digits
 * @returns {string}
 */
function computeHotp(keyBuffer, counter, digits = 6) {
  const counterBuffer = Buffer.alloc(8);
  // Write counter as 64-bit big endian integer
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', keyBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const modulus = 10 ** digits;
  const token = (binaryCode % modulus).toString().padStart(digits, '0');
  return token;
}

/**
 * Generates a new 160-bit (20-byte) RFC 6238 TOTP secret.
 * @param {string} accountLabel e.g. "admin@rentify.com"
 * @param {string} issuer e.g. "Rentify"
 * @returns {{ base32: string, otpauthUrl: string }}
 */
function generateTotpSecret(accountLabel, issuer = 'Rentify') {
  const randomBytes = crypto.randomBytes(20);
  const base32 = base32Encode(randomBytes);
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountLabel || 'admin');
  const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${base32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

  return {
    base32,
    otpauthUrl,
  };
}

/**
 * Computes current TOTP token for given Base32 secret at a specified timestamp.
 * @param {string} base32Secret
 * @param {object} options
 * @returns {{ code: string, timeStep: number }}
 */
function generateTotpToken(base32Secret, options = {}) {
  const timeStepSeconds = options.timeStepSeconds || 30;
  const digits = options.digits || 6;
  const timestamp = options.timestamp !== undefined ? options.timestamp : Date.now();

  const counter = Math.floor(timestamp / 1000 / timeStepSeconds);
  const keyBuffer = base32Decode(base32Secret);
  const code = computeHotp(keyBuffer, counter, digits);

  return { code, timeStep: counter };
}

/**
 * Verifies a candidate TOTP token against Base32 secret with clock skew tolerance and replay protection.
 * @param {string} token - 6-digit candidate code
 * @param {string} base32Secret - Base32 encoded secret
 * @param {object} options - { window: 1, lastTimeStep: null, timestamp: Date.now() }
 * @returns {{ valid: boolean, timeStep?: number, error?: string }}
 */
function verifyTotpCode(token, base32Secret, options = {}) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'TOKEN_REQUIRED' };
  }

  const cleanedToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanedToken)) {
    return { valid: false, error: 'INVALID_FORMAT' };
  }

  const window = options.window !== undefined ? options.window : 1;
  const timeStepSeconds = options.timeStepSeconds || 30;
  const timestamp = options.timestamp !== undefined ? options.timestamp : Date.now();
  const lastTimeStep = options.lastTimeStep !== undefined && options.lastTimeStep !== null
    ? Number(options.lastTimeStep)
    : null;

  const currentCounter = Math.floor(timestamp / 1000 / timeStepSeconds);
  let keyBuffer;
  try {
    keyBuffer = base32Decode(base32Secret);
  } catch (err) {
    return { valid: false, error: 'INVALID_SECRET' };
  }

  for (let offset = -window; offset <= window; offset++) {
    const candidateCounter = currentCounter + offset;
    const expectedToken = computeHotp(keyBuffer, candidateCounter, 6);

    // Constant-time token comparison
    if (
      expectedToken.length === cleanedToken.length &&
      crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(cleanedToken))
    ) {
      // Replay protection: counter cannot be <= lastTimeStep
      if (lastTimeStep !== null && candidateCounter <= lastTimeStep) {
        return { valid: false, error: 'TOKEN_REPLAYED' };
      }
      return { valid: true, timeStep: candidateCounter };
    }
  }

  return { valid: false, error: 'INVALID_TOKEN' };
}

// Alphanumeric character set avoiding visually confusing characters (no 0, O, 1, I, L)
const RECOVERY_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates an array of single-use recovery codes.
 * Returns both plaintext for immediate display and hashed objects for storage.
 * @param {number} count
 * @returns {{ plainCodes: string[], hashedCodes: Array<{ hash: string, salt: string, usedAt: null }> }}
 */
function generateRecoveryCodes(count = 8) {
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(12);
    let codeStr = '';
    for (let b = 0; b < bytes.length; b++) {
      codeStr += RECOVERY_CHARSET[bytes[b] % RECOVERY_CHARSET.length];
    }
    // Format into 3 groups of 4: XXXX-XXXX-XXXX
    const formattedCode = `${codeStr.slice(0, 4)}-${codeStr.slice(4, 8)}-${codeStr.slice(8, 12)}`;
    plainCodes.push(formattedCode);

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(`${salt}:${formattedCode.replace(/-/g, '').toUpperCase()}`)
      .digest('hex');

    hashedCodes.push({
      hash,
      salt,
      usedAt: null,
    });
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies a candidate recovery code against the stored hashed recovery codes.
 * @param {string} candidateCode
 * @param {Array<{ hash: string, salt: string, usedAt: string|Date|null }>} storedCodes
 * @returns {{ valid: boolean, matchedIndex?: number }}
 */
function verifyRecoveryCode(candidateCode, storedCodes) {
  if (!candidateCode || typeof candidateCode !== 'string' || !Array.isArray(storedCodes)) {
    return { valid: false };
  }

  const normalized = candidateCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (normalized.length !== 12) {
    return { valid: false };
  }

  for (let i = 0; i < storedCodes.length; i++) {
    const item = storedCodes[i];
    if (item.usedAt) continue; // Single-use already consumed

    const candidateHash = crypto
      .createHash('sha256')
      .update(`${item.salt}:${normalized}`)
      .digest('hex');

    if (
      candidateHash.length === item.hash.length &&
      crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(item.hash))
    ) {
      return { valid: true, matchedIndex: i };
    }
  }

  return { valid: false };
}

module.exports = {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpToken,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
};
