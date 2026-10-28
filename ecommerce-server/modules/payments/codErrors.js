'use strict';

// ecommerce-server/modules/payments/codErrors.js
// Error codes and error classes for P3-COD-001 COD Payment & Refund State Machine.

const COD_ERROR_CODES = Object.freeze({
  ILLEGAL_TRANSITION: 'ILLEGAL_TRANSITION',
  ALREADY_COLLECTED: 'ALREADY_COLLECTED',
  UNCOLLECTED_PAYMENT: 'UNCOLLECTED_PAYMENT',
  ALREADY_FULLY_REFUNDED: 'ALREADY_FULLY_REFUNDED',
  REFUND_EXCEEDS_COLLECTED: 'REFUND_EXCEEDS_COLLECTED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  EVIDENCE_REQUIRED: 'EVIDENCE_REQUIRED',
  PAYOUT_EVIDENCE_REQUIRED: 'PAYOUT_EVIDENCE_REQUIRED',
  INVALID_METHOD: 'INVALID_METHOD',
  COLLECTOR_REQUIRED: 'COLLECTOR_REQUIRED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  STORE_MISMATCH: 'STORE_MISMATCH',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PAYMENT_METHOD_MISMATCH: 'PAYMENT_METHOD_MISMATCH',
  CANNOT_FAIL_COLLECTED: 'CANNOT_FAIL_COLLECTED',
  CANNOT_CANCEL_COLLECTED: 'CANNOT_CANCEL_COLLECTED',
});

class CodStateError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message || code);
    this.name = 'CodStateError';
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

module.exports = {
  COD_ERROR_CODES,
  CodStateError,
};
