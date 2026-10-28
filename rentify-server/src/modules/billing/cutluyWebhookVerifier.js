'use strict';

// rentify-server/src/modules/billing/cutluyWebhookVerifier.js
// P3-PAY-002: Signed Raw-Body Webhook Verification.
// Enforces raw body preservation, timestamp freshness, and constant-time HMAC comparison.

const { createHmac, timingSafeEqual } = require('node:crypto');
const { CUTLUY_ERROR_CODES, CutLuyError } = require('./cutluyErrors');

/**
 * Parses the X-CutLuy-Signature header.
 * Expected format: "t=1729200000,v1=abc123def456..." or "t=1729200000,s=abc123def456..."
 */
function parseSignatureHeader(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.MISSING_SIGNATURE_HEADER,
      'Missing or malformed X-CutLuy-Signature header',
      401
    );
  }

  const parts = headerValue.split(',').map((p) => p.trim());
  let timestamp = null;
  let signature = null;

  for (const part of parts) {
    const [key, ...valParts] = part.split('=');
    const val = valParts.join('=');
    if (!key || !val) continue;

    const trimmedKey = key.trim().toLowerCase();
    const trimmedVal = val.trim();

    if (trimmedKey === 't') {
      const parsedTime = parseInt(trimmedVal, 10);
      if (!Number.isNaN(parsedTime) && /^\d+$/.test(trimmedVal)) {
        timestamp = parsedTime;
      }
    } else if (trimmedKey === 'v1' || trimmedKey === 's' || trimmedKey === 'signature') {
      signature = trimmedVal;
    }
  }

  if (timestamp === null || !signature) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.MISSING_SIGNATURE_HEADER,
      'X-CutLuy-Signature header must contain valid timestamp (t) and signature (v1/s)',
      401
    );
  }

  return { timestamp, signature };
}

/**
 * Verifies incoming webhook raw body and signature.
 */
function verifyWebhookSignature({
  rawBody,
  signatureHeader,
  webhookSecret,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
}) {
  if (!rawBody && rawBody !== '') {
    throw new CutLuyError(CUTLUY_ERROR_CODES.CLIENT_ERROR, 'Raw body is required for signature verification', 400);
  }
  if (!webhookSecret || typeof webhookSecret !== 'string') {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.CONFIGURATION_ERROR,
      'Webhook secret is required for signature verification',
      500
    );
  }

  // 1. Parse header
  const { timestamp, signature: receivedHex } = parseSignatureHeader(signatureHeader);

  // 2. Validate timestamp freshness
  const drift = nowSeconds - timestamp;
  if (drift > toleranceSeconds) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.STALE_TIMESTAMP,
      `Webhook timestamp is stale. Drift (${drift}s) exceeds tolerance (${toleranceSeconds}s)`,
      401,
      { drift, toleranceSeconds, timestamp, nowSeconds }
    );
  }
  if (drift < -60) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.FUTURE_TIMESTAMP,
      `Webhook timestamp is too far in the future (${-drift}s)`,
      401,
      { drift, timestamp, nowSeconds }
    );
  }

  // 3. Compute HMAC-SHA256 over "<timestamp>.<rawBody>"
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const payloadToSign = `${timestamp}.${bodyString}`;
  const computedHex = createHmac('sha256', webhookSecret.trim()).update(payloadToSign).digest('hex');

  // 4. Constant-time comparison
  const computedBuf = Buffer.from(computedHex, 'utf8');
  const receivedBuf = Buffer.from(receivedHex, 'utf8');

  if (computedBuf.length !== receivedBuf.length || !timingSafeEqual(computedBuf, receivedBuf)) {
    throw new CutLuyError(
      CUTLUY_ERROR_CODES.INVALID_SIGNATURE,
      'Webhook HMAC-SHA256 signature verification failed',
      401
    );
  }

  return {
    verified: true,
    timestamp,
    signature: receivedHex,
  };
}

/**
 * Utility to generate a valid signature header for testing and contract fixtures.
 */
function signWebhookPayload(rawBody, webhookSecret, timestamp = Math.floor(Date.now() / 1000)) {
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const payloadToSign = `${timestamp}.${bodyString}`;
  const sig = createHmac('sha256', webhookSecret.trim()).update(payloadToSign).digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

module.exports = {
  parseSignatureHeader,
  verifyWebhookSignature,
  signWebhookPayload,
};
