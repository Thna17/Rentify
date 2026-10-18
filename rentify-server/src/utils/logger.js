// utils/logger.js - Structured logging, correlation tracking, and redaction for Core API
const winston = require('winston');
const { AsyncLocalStorage } = require('node:async_hooks');
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');

const correlationStorage = new AsyncLocalStorage();

const getCorrelationId = () => correlationStorage.getStore()?.correlationId || null;

const runWithCorrelation = (correlationId, fn) => correlationStorage.run({ correlationId }, fn);

const CORRELATION_ID_REGEX = /^[a-zA-Z0-9_\-\.]{8,128}$/;

function validateCorrelationId(id) {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  return CORRELATION_ID_REGEX.test(trimmed) ? trimmed : null;
}

const SENSITIVE_KEY_PATTERNS = [
  /auth(?:orization)?/i,
  /cookie/i,
  /session(?:id)?/i,
  /password/i,
  /token/i,
  /secret/i,
  /jwt/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /cutluy/i,
  /address/i,
  /street/i,
  /phone/i,
  /email/i,
  /buyer[_-]?name/i,
  /recipient[_-]?name/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /cvc/i,
  /expiry/i,
  /bakong/i,
  /qr[_-]?(?:payload|data)?/i,
  /khqr/i,
];

function isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function redactString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/(?:userAccessToken|userRefreshToken|customerAccessToken|customerRefreshToken|staffAccessToken|staffRefreshToken|connect\.sid)=[^\s;]+/gi, '$1=[REDACTED]')
    .replace(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/(?:password|secret|key|token|cutluyKey)\s*[:=]\s*['"]?[^\s,'"}]+/gi, (match) => {
      const parts = match.split(/[:=]/);
      return `${parts[0]}: [REDACTED]`;
    });
}

function redact(obj, seen = new WeakSet(), depth = 0) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return redactString(obj);
  if (typeof obj !== 'object') return obj;

  if (seen.has(obj) || depth > 8) return '[CIRCULAR]';
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, seen, depth + 1));
  }

  if (obj instanceof Error) {
    const serialized = {
      message: redactString(obj.message),
      name: obj.name,
      code: obj.code,
      statusCode: obj.statusCode,
    };
    if (process.env.NODE_ENV !== 'production' && obj.stack) {
      serialized.stack = redactString(obj.stack);
    }
    return serialized;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(value, seen, depth + 1);
    }
  }
  for (const sym of Object.getOwnPropertySymbols(obj)) {
    result[sym] = obj[sym];
  }
  return result;
}

const isProduction = process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json';

const correlationAndRedactionFormat = winston.format((info) => {
  if (!info.correlationId) {
    const activeId = getCorrelationId();
    if (activeId) {
      info.correlationId = activeId;
    }
  }
  info.service = info.service || 'rentify-server';
  info.environment = info.environment || process.env.NODE_ENV || 'development';
  info.version = info.version || process.env.npm_package_version || '1.0.0';

  return redact(info);
});

class MemoryCaptureTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.records = [];
  }
  log(info, callback) {
    this.records.push({ ...info });
    if (this.records.length > 500) this.records.shift();
    callback();
  }
  clear() {
    this.records.length = 0;
  }
}

const memoryTransport = new MemoryCaptureTransport({ level: 'debug' });

const transports = [memoryTransport];

if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_TEST_LOGGING === 'true') {
  if (isProduction) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      })
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf((info) => {
            const { timestamp, level, message, correlationId, service, route, status, durationMs, ...meta } = info;
            const cid = correlationId ? ` [${correlationId}]` : '';
            const sName = service ? ` [${service}]` : '';
            const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            const httpInfo = route ? ` (${route} -> ${status} in ${durationMs}ms)` : '';
            return `${timestamp}${sName} [${level}]${cid}: ${message}${httpInfo}${extra}`;
          })
        ),
      })
    );
  }

  const logDir = path.resolve(__dirname, '../../logs');
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (_) {}
  }
  if (fs.existsSync(logDir)) {
    transports.push(
      new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    );
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    correlationAndRedactionFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.simple()
  ),
  defaultMeta: { service: 'rentify-server' },
  transports,
});

Object.defineProperty(logger, 'memoryLogs', {
  get: () => memoryTransport.records,
  configurable: true,
});
logger.clearMemoryLogs = () => memoryTransport.clear();

// Attach default correlation ID propagation to axios
axios.interceptors.request.use((config) => {
  const correlationId = getCorrelationId();
  if (correlationId && !config.headers?.['x-correlation-id']) {
    config.headers = config.headers || {};
    config.headers['x-correlation-id'] = correlationId;
  }
  return config;
});

module.exports = {
  logger,
  getCorrelationId,
  runWithCorrelation,
  validateCorrelationId,
  redact,
  correlationStorage,
  isSensitiveKey,
};