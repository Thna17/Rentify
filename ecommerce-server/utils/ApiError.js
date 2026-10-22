// utils/ApiError.js - Standard API Error Definitions and Enveloping for Commerce API
const { getCorrelationId, validateCorrelationId } = require('./logger');

const STATUS_CODE_MAP = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'PERMISSION_DENIED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

function normalizeFieldErrors(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (typeof item === 'string') return { field: 'general', message: item };
      return {
        field: String(item.field || item.path || item.productId || 'general'),
        message: String(item.message || item.msg || item.error || 'Invalid value'),
      };
    });
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([field, message]) => ({
      field,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    }));
  }
  return [];
}

class ApiError extends Error {
  constructor(statusCode, message, codeOrDetails = null, fieldErrors = [], retryable = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode || 500;

    let resolvedCode = null;
    let resolvedFieldErrors = fieldErrors;
    let rawDetails = null;

    if (typeof codeOrDetails === 'string') {
      resolvedCode = codeOrDetails;
    } else if (codeOrDetails && typeof codeOrDetails === 'object') {
      rawDetails = codeOrDetails;
      resolvedFieldErrors = codeOrDetails;
    }

    this.code = resolvedCode || STATUS_CODE_MAP[this.statusCode] || 'INTERNAL_SERVER_ERROR';
    this.fieldErrors = normalizeFieldErrors(resolvedFieldErrors);
    this.details = rawDetails !== null ? rawDetails : (this.fieldErrors.length > 0 ? this.fieldErrors : null);
    this.retryable = typeof retryable === 'boolean' ? retryable : RETRYABLE_STATUSES.has(this.statusCode);
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', detailsOrCode = 'BAD_REQUEST', fieldErrors = []) {
    return new ApiError(400, message, detailsOrCode, fieldErrors, false);
  }

  static validation(fieldErrors = [], message = 'Validation failed') {
    return new ApiError(400, message, 'VALIDATION_FAILED', fieldErrors, false);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHENTICATED') {
    return new ApiError(401, message, code, [], false);
  }

  static forbidden(message = 'Forbidden', code = 'PERMISSION_DENIED') {
    return new ApiError(403, message, code, [], false);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code, [], false);
  }

  static conflict(message = 'Conflict occurred', code = 'CONFLICT') {
    return new ApiError(409, message, code, [], false);
  }

  static rateLimited(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new ApiError(429, message, code, [], true);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', retryable = false) {
    return new ApiError(500, message, code, [], retryable);
  }
}

/**
 * Strips secrets, passwords, or connection strings from user-facing error messages.
 */
function sanitizeMessage(message, statusCode, isOperational) {
  if (!message || typeof message !== 'string') return 'Internal server error';

  if (statusCode >= 500 && !isOperational) {
    return 'Internal server error';
  }

  return message
    .replace(/(?:bearer\s+)?[a-zA-Z0-9_\-\.]{30,}/gi, '[REDACTED]')
    .replace(/(?:password|secret|key)=[^&;\s]+/gi, '$1=[REDACTED]');
}

/**
 * Builds the standard backward-compatible error envelope.
 */
function formatErrorEnvelope(err, req) {
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const isOperational = Boolean(err.isOperational);

  let rawMessage = err.message || 'Internal server error';
  let code = err.code || STATUS_CODE_MAP[statusCode] || 'INTERNAL_SERVER_ERROR';
  let fieldErrors = normalizeFieldErrors(err.fieldErrors || err.details);
  let retryable = typeof err.retryable === 'boolean' ? err.retryable : RETRYABLE_STATUSES.has(statusCode);

  // Sequelize error adaptations
  if (err.name === 'SequelizeValidationError') {
    code = 'VALIDATION_FAILED';
    rawMessage = 'Validation failed';
    fieldErrors = (err.errors || []).map((e) => ({
      field: e.path || 'unknown',
      message: e.message || 'Invalid value',
    }));
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    code = 'CONFLICT';
    rawMessage = 'Resource already exists';
    fieldErrors = (err.errors || []).map((e) => ({
      field: e.path || 'unknown',
      message: `${e.path} must be unique`,
    }));
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    code = 'UNAUTHENTICATED';
    rawMessage = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
  }

  const safeMessage = sanitizeMessage(rawMessage, statusCode, isOperational);

  const correlationId =
    validateCorrelationId(req?.correlationId) ||
    validateCorrelationId(req?.headers?.['x-correlation-id']) ||
    getCorrelationId() ||
    'unknown-correlation-id';

  return {
    statusCode,
    body: {
      error: {
        code,
        message: safeMessage,
        fieldErrors,
        retryable,
        correlationId,
      },
      // Backward-compatibility properties preserved during migration
      message: safeMessage,
      success: false,
      statusCode,
      correlationId,
    },
  };
}

module.exports = {
  ApiError,
  STATUS_CODE_MAP,
  RETRYABLE_STATUSES,
  sanitizeMessage,
  formatErrorEnvelope,
  normalizeFieldErrors,
};