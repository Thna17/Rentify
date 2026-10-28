'use strict';

// tools/reconciliation/safety.js
// P3-REC-001: Safety assertions, connection guards, and data redaction utilities.

class UnsafeReconciliationError extends Error {
  constructor(message, diagnostic = {}) {
    super(message);
    this.name = 'UnsafeReconciliationError';
    this.diagnostic = diagnostic;
  }
}

const PRODUCTION_HOST_PATTERNS = [
  /\bprod\b/i,
  /\bproduction\b/i,
  /\bamazonaws\.com\b/i,
  /\brds\b/i,
  /\bcloudsql\b/i,
  /\bazure\b/i,
  /\brentifymarket\.com\b/i,
];

const SENSITIVE_KEY_PATTERNS = [
  /^password$/i,
  /^secret/i,
  /token$/i,
  /apiKey/i,
  /credential/i,
  /^email$/i,
  /^phone$/i,
  /buyerName/i,
  /customerName/i,
  /shippingAddress/i,
  /billingAddress/i,
  /^address$/i,
  /qr_?payload/i,
  /qr_?data/i,
  /card/i,
  /cvv/i,
  /rawBody/i,
];

/**
 * Validates that the runner environment has explicit safe connection confirmation.
 * Prevents unintended execution without explicit operator opt-in.
 *
 * @param {object} [options]
 * @param {object} [config]
 */
function validateSafeConnection(options = {}, config = {}) {
  const isSafeModeExplicit = (
    options.safeConnection === true ||
    options.confirmReadOnly === true ||
    process.env.RECONCILIATION_SAFE_MODE === 'true'
  );

  if (!isSafeModeExplicit) {
    throw new UnsafeReconciliationError(
      'Reconciliation audit requires explicit safe connection confirmation. ' +
      'Pass { safeConnection: true } programmatically or set RECONCILIATION_SAFE_MODE=true in environment.',
      { options: Object.keys(options), safeMode: false }
    );
  }

  // Detect if host looks like a production cloud host
  const host = config.host || process.env.DB_HOST || '';
  const isProdHost = PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(host));

  if (isProdHost) {
    const hasExplicitProdConfirmation = (
      options.confirmReadOnly === true ||
      process.env.CONFIRM_READ_ONLY_AUDIT === 'true'
    );
    if (!hasExplicitProdConfirmation) {
      throw new UnsafeReconciliationError(
        `Host "${host}" matches production pattern. Audit execution requires explicit read-only confirmation. ` +
        'Pass { confirmReadOnly: true } or set CONFIRM_READ_ONLY_AUDIT=true.',
        { host }
      );
    }
  }

  return {
    safe: true,
    host: host || 'localhost',
    readOnly: true,
  };
}

/**
 * Deeply redacts customer and payment-sensitive data from audit reports.
 *
 * @param {any} val
 * @returns {any}
 */
function redactSensitiveData(val) {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => redactSensitiveData(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(val)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key));
    if (isSensitive) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = redactSensitiveData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Extracts and samples safe identifiers (UUIDs, codes) from an array of entities or strings.
 *
 * @param {Array<string|object>} items
 * @param {number} [limit=5]
 * @returns {string[]}
 */
function sampleSafeIdentifiers(items = [], limit = 5) {
  if (!Array.isArray(items)) return [];
  const safeIds = new Set();

  for (const item of items) {
    if (!item) continue;
    if (typeof item === 'string') {
      safeIds.add(item);
    } else if (typeof item === 'object') {
      const candidate = (
        item.id ||
        item.orderId ||
        item.storeId ||
        item.skuId ||
        item.sku ||
        item.productId ||
        item.variantId ||
        item.cartId ||
        item.paymentId ||
        item.attemptId ||
        item.eventId ||
        item.subscriptionId ||
        item.websiteId
      );
      if (candidate && typeof candidate === 'string') {
        safeIds.add(candidate);
      }
    }
    if (safeIds.size >= limit) break;
  }

  return Array.from(safeIds);
}

/**
 * Converts a dollar amount or minor string to integer cents safely.
 *
 * @param {number|string} val
 * @returns {number}
 */
function toCents(val) {
  const num = Number(val || 0);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

module.exports = {
  UnsafeReconciliationError,
  validateSafeConnection,
  redactSensitiveData,
  sampleSafeIdentifiers,
  toCents,
};
