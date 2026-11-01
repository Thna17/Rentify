// modules/orders/orderErrors.js
// P3-ORD-001: Stable domain errors and machine codes for order, fulfillment, and return state machines.

class OrderStateError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'OrderStateError';
    this.code = code;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

const ORDER_ERROR_CODES = Object.freeze({
  INVALID_ORDER_TRANSITION: 'INVALID_ORDER_TRANSITION',
  INVALID_FULFILLMENT_TRANSITION: 'INVALID_FULFILLMENT_TRANSITION',
  INVALID_RETURN_TRANSITION: 'INVALID_RETURN_TRANSITION',
  ORDER_ALREADY_CANCELLED: 'ORDER_ALREADY_CANCELLED',
  ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
  RETURN_WINDOW_EXPIRED: 'RETURN_WINDOW_EXPIRED',
  RETURN_NOT_ELIGIBLE: 'RETURN_NOT_ELIGIBLE',
  UNAUTHORIZED_TRANSITION_ACTOR: 'UNAUTHORIZED_TRANSITION_ACTOR',
  SUSPENDED_ACTOR: 'SUSPENDED_ACTOR',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  DIRECT_ASSIGNMENT_PROHIBITED: 'DIRECT_ASSIGNMENT_PROHIBITED',
  ORDER_PAID_CANCEL_UNAVAILABLE: 'ORDER_PAID_CANCEL_UNAVAILABLE',
});

module.exports = {
  OrderStateError,
  ORDER_ERROR_CODES,
};
