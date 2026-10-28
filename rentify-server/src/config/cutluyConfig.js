'use strict';

// rentify-server/src/config/cutluyConfig.js
// P3-PAY-002 / ADR 0003: CutLuy Configuration & Environment Contract Validator.
// Enforces strict parsing, boundary isolation, and secret hygiene.

class CutLuyConfigError extends Error {
  constructor(message, code = 'INVALID_CUTLUY_CONFIG') {
    super(message);
    this.name = 'CutLuyConfigError';
    this.code = code;
  }
}

function parseStrictBoolean(value, varName = 'CUTLUY_ENABLED') {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const str = String(value).trim().toLowerCase();
  if (str === 'true') return true;
  if (str === 'false') return false;
  throw new CutLuyConfigError(
    `Invalid boolean value for ${varName}: "${value}". Must be strictly "true" or "false"`,
    'INVALID_BOOLEAN'
  );
}

function parseToleranceSeconds(value) {
  if (value === undefined || value === null || value === '') {
    return 300;
  }
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) {
    throw new CutLuyConfigError(
      `CUTLUY_WEBHOOK_TOLERANCE_SECONDS must contain digits only: "${value}"`,
      'INVALID_TOLERANCE'
    );
  }
  const num = parseInt(str, 10);
  if (num < 10 || num > 3600) {
    throw new CutLuyConfigError(
      `CUTLUY_WEBHOOK_TOLERANCE_SECONDS out of bounds (${num}). Must be between 10 and 3600 seconds`,
      'TOLERANCE_OUT_OF_BOUNDS'
    );
  }
  return num;
}

function validateCutluyConfig(env = process.env) {
  // 1. Prohibited environment variables
  if (env.CUTLUY_STORE_ID) {
    throw new CutLuyConfigError(
      'CUTLUY_STORE_ID is prohibited and unused. Account identity is managed via internal CUTLUY_SUBSCRIPTION_ACCOUNT_REF',
      'PROHIBITED_VARIABLE'
    );
  }
  if (env.CUTLUY_SELLER_API_KEY || env.CUTLUY_MERCHANT_KEY) {
    throw new CutLuyConfigError(
      'Global seller CutLuy credentials are strictly prohibited. Seller credentials must be store-scoped and encrypted in database',
      'PROHIBITED_SELLER_GLOBAL_KEY'
    );
  }

  // 2. Parse enabled flag
  const enabled = parseStrictBoolean(env.CUTLUY_ENABLED, 'CUTLUY_ENABLED');

  // 3. Parse tolerance
  const toleranceSeconds = parseToleranceSeconds(env.CUTLUY_WEBHOOK_TOLERANCE_SECONDS);

  // 4. Parse Base URL
  const rawBaseUrl = (env.CUTLUY_API_BASE_URL || 'https://cutluy.com').trim();
  let baseUrl;
  try {
    baseUrl = new URL(rawBaseUrl).origin;
  } catch {
    throw new CutLuyConfigError(`Invalid CUTLUY_API_BASE_URL format: "${rawBaseUrl}"`, 'INVALID_URL');
  }

  if (env.NODE_ENV === 'production') {
    if (!baseUrl.startsWith('https://')) {
      throw new CutLuyConfigError('CUTLUY_API_BASE_URL must use HTTPS in production', 'INSECURE_URL');
    }
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      throw new CutLuyConfigError('CUTLUY_API_BASE_URL cannot point to localhost in production', 'INVALID_PRODUCTION_URL');
    }
  }

  // 5. Require credentials when enabled
  const apiKey = env.CUTLUY_API_KEY ? String(env.CUTLUY_API_KEY).trim() : null;
  const webhookSecret = env.CUTLUY_WEBHOOK_SECRET ? String(env.CUTLUY_WEBHOOK_SECRET).trim() : null;
  const subscriptionAccountRef = env.CUTLUY_SUBSCRIPTION_ACCOUNT_REF
    ? String(env.CUTLUY_SUBSCRIPTION_ACCOUNT_REF).trim()
    : null;

  if (enabled) {
    if (!apiKey) {
      throw new CutLuyConfigError('CUTLUY_API_KEY is required when CUTLUY_ENABLED=true', 'MISSING_API_KEY');
    }
    if (!webhookSecret) {
      throw new CutLuyConfigError('CUTLUY_WEBHOOK_SECRET is required when CUTLUY_ENABLED=true', 'MISSING_WEBHOOK_SECRET');
    }
    if (!subscriptionAccountRef) {
      throw new CutLuyConfigError(
        'CUTLUY_SUBSCRIPTION_ACCOUNT_REF is required when CUTLUY_ENABLED=true',
        'MISSING_SUBSCRIPTION_ACCOUNT_REF'
      );
    }
  }

  return Object.freeze({
    enabled,
    apiBaseUrl: baseUrl,
    apiKey,
    webhookSecret,
    subscriptionAccountRef,
    webhookToleranceSeconds: toleranceSeconds,
    isSynthetic: parseStrictBoolean(env.CUTLUY_SYNTHETIC_MODE, 'CUTLUY_SYNTHETIC_MODE') || env.NODE_ENV === 'test',
  });
}

function getCutluyConfig() {
  return validateCutluyConfig(process.env);
}

module.exports = {
  CutLuyConfigError,
  parseStrictBoolean,
  parseToleranceSeconds,
  validateCutluyConfig,
  getCutluyConfig,
};
