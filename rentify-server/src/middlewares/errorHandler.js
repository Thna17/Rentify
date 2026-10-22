// middlewares/errorHandler.js - Centralized, secure error handling middleware for Core API
const { formatErrorEnvelope } = require('../utils/errors');
const { logger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const { statusCode, body } = formatErrorEnvelope(err, req);
  const correlationId = body.error.correlationId;

  // Always reflect correlation ID on response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Structured logging with redaction
  logger.error(err.message || 'Internal server error', {
    correlationId,
    status: statusCode,
    code: body.error.code,
    route: req.baseUrl ? `${req.baseUrl}${req.path}` : req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
