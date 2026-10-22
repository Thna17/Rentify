const crypto = require('node:crypto');
const { logger, runWithCorrelation, validateCorrelationId } = require('../utils/logger');

function extractRouteTemplate(req) {
  if (req.baseUrl && req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }
  if (req.route?.path) {
    return req.route.path;
  }
  const pathname = (req.path || '/').split('?')[0];
  return pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

function correlationMiddleware(req, res, next) {
  let incoming = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  if (Array.isArray(incoming)) incoming = incoming[0];

  const correlationId = validateCorrelationId(incoming) || crypto.randomUUID();

  req.correlationId = correlationId;
  req.id = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const route = extractRouteTemplate(req);
    logger.info(`HTTP ${req.method} ${route} ${res.statusCode}`, {
      correlationId,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  runWithCorrelation(correlationId, next);
}

module.exports = correlationMiddleware;
