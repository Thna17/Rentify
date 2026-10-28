'use strict';

// rentify-server/src/modules/billing/cutluyErrors.js
// P3-PAY-002: Stable Error Codes, Status Mappings, and CutLuy Error Class.

const CUTLUY_ERROR_CODES = Object.freeze({
  KHR_CURRENCY_NOT_SUPPORTED: 'KHR_CURRENCY_NOT_SUPPORTED',
  UNSUPPORTED_CURRENCY: 'UNSUPPORTED_CURRENCY',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  ACCOUNT_MISMATCH: 'ACCOUNT_MISMATCH',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  MISSING_SIGNATURE_HEADER: 'MISSING_SIGNATURE_HEADER',
  STALE_TIMESTAMP: 'STALE_TIMESTAMP',
  FUTURE_TIMESTAMP: 'FUTURE_TIMESTAMP',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  PAYMENT_ATTEMPT_NOT_FOUND: 'PAYMENT_ATTEMPT_NOT_FOUND',
  WRONG_AMOUNT: 'WRONG_AMOUNT',
  WRONG_CURRENCY: 'WRONG_CURRENCY',
  WRONG_ACCOUNT: 'WRONG_ACCOUNT',
  WRONG_REFERENCE: 'WRONG_REFERENCE',
  OUT_OF_ORDER_EVENT: 'OUT_OF_ORDER_EVENT',
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_OUTAGE: 'PROVIDER_OUTAGE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
});

const ATTEMPT_STATUS = Object.freeze({
  PENDING: 'pending',
  CUSTOMER_ACTION: 'customer_action',
  PAID: 'paid',
  EXPIRED: 'expired',
  FAILED: 'failed',
});

class CutLuyError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message || code);
    this.name = 'CutLuyError';
    this.code = code;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

function mapProviderStatus(providerStatus) {
  if (!providerStatus) return ATTEMPT_STATUS.PENDING;
  const norm = String(providerStatus).trim().toLowerCase();
  switch (norm) {
    case 'pending':
      return ATTEMPT_STATUS.PENDING;
    case 'scanned':
      return ATTEMPT_STATUS.CUSTOMER_ACTION;
    case 'paid':
    case 'completed':
    case 'success':
      return ATTEMPT_STATUS.PAID;
    case 'expired':
      return ATTEMPT_STATUS.EXPIRED;
    case 'failed':
    case 'cancelled':
      return ATTEMPT_STATUS.FAILED;
    default:
      return ATTEMPT_STATUS.PENDING;
  }
}

module.exports = {
  CUTLUY_ERROR_CODES,
  ATTEMPT_STATUS,
  CutLuyError,
  mapProviderStatus,
};
