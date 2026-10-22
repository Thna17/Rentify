const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { ApiError, formatErrorEnvelope, sanitizeMessage } = require('../../src/utils/errors');
const errorHandler = require('../../src/middlewares/errorHandler');

test('error envelope: ApiError factories construct expected status, codes, and retryable values', () => {
  const badReq = ApiError.badRequest('Invalid parameter', 'INVALID_PARAM');
  assert.equal(badReq.statusCode, 400);
  assert.equal(badReq.code, 'INVALID_PARAM');
  assert.equal(badReq.retryable, false);
  assert.deepEqual(badReq.fieldErrors, []);

  const valErr = ApiError.validation([{ field: 'email', message: 'Email is required' }]);
  assert.equal(valErr.statusCode, 400);
  assert.equal(valErr.code, 'VALIDATION_FAILED');
  assert.equal(valErr.retryable, false);
  assert.deepEqual(valErr.fieldErrors, [{ field: 'email', message: 'Email is required' }]);

  const unauth = ApiError.unauthorized('Sign-in required');
  assert.equal(unauth.statusCode, 401);
  assert.equal(unauth.code, 'UNAUTHENTICATED');
  assert.equal(unauth.retryable, false);

  const forb = ApiError.forbidden('Forbidden action');
  assert.equal(forb.statusCode, 403);
  assert.equal(forb.code, 'PERMISSION_DENIED');
  assert.equal(forb.retryable, false);

  const notFound = ApiError.notFound('Store not found');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, 'NOT_FOUND');
  assert.equal(notFound.retryable, false);

  const conflict = ApiError.conflict('Duplicate slug');
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.code, 'CONFLICT');
  assert.equal(conflict.retryable, false);

  const rateLimit = ApiError.rateLimited('Rate limit exceeded');
  assert.equal(rateLimit.statusCode, 429);
  assert.equal(rateLimit.code, 'RATE_LIMITED');
  assert.equal(rateLimit.retryable, true);

  const internal = ApiError.internal();
  assert.equal(internal.statusCode, 500);
  assert.equal(internal.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(internal.retryable, false);
});

test('error envelope: formatErrorEnvelope preserves backward-compatible legacy fields and correlation ID', () => {
  const req = {
    correlationId: '018d34b1-827c-74a9-a9c1-5827c9b83701',
    headers: {},
  };
  const err = ApiError.notFound('Product not found');
  const { statusCode, body } = formatErrorEnvelope(err, req);

  assert.equal(statusCode, 404);
  assert.deepEqual(body, {
    error: {
      code: 'NOT_FOUND',
      message: 'Product not found',
      fieldErrors: [],
      retryable: false,
      correlationId: '018d34b1-827c-74a9-a9c1-5827c9b83701',
    },
    message: 'Product not found',
    success: false,
    correlationId: '018d34b1-827c-74a9-a9c1-5827c9b83701',
  });
});

test('error envelope: sanitizes unexpected 500 errors and redacts secrets and stack traces', () => {
  const req = { correlationId: 'test-trace-id-12345', headers: {} };
  const rawErr = new Error('SELECT * FROM users WHERE password="supersecret_password" AND token="bearer_1234567890abcdef1234567890abcdef"');
  rawErr.stack = 'Error: at line 42 /server/secrets.js';

  const { statusCode, body } = formatErrorEnvelope(rawErr, req);

  assert.equal(statusCode, 500);
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
  // Raw SQL and secrets must NOT appear in message
  assert.equal(body.error.message, 'Internal server error');
  assert.equal(body.message, 'Internal server error');
  // Stack trace must never be attached to body
  assert.equal(body.stack, undefined);
  assert.equal(body.error.stack, undefined);
  assert.equal(JSON.stringify(body).includes('supersecret_password'), false);
  assert.equal(JSON.stringify(body).includes('/server/secrets.js'), false);
});

test('error envelope: errorHandler middleware responds with envelope, status code, and correlation header', async (t) => {
  const app = express();
  app.use((req, _res, next) => {
    req.correlationId = 'req-corr-id-998877';
    next();
  });

  app.get('/test-validation', (_req, _res, next) => {
    next(ApiError.validation([{ field: 'name', message: 'Name is required' }]));
  });

  app.get('/test-unauth', (_req, _res, next) => {
    next(ApiError.unauthorized('Sign-in required'));
  });

  app.get('/test-forbidden', (_req, _res, next) => {
    next(ApiError.forbidden('Forbidden action'));
  });

  app.get('/test-conflict', (_req, _res, next) => {
    next(ApiError.conflict('Store name already taken'));
  });

  app.get('/test-crash', (_req, _res, next) => {
    next(new Error('Unexpected database disconnection: db://user:secretpass@host'));
  });

  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  t.after(() => server.close());

  // 1. Validation Error
  const resVal = await fetch(`http://127.0.0.1:${port}/test-validation`);
  const bodyVal = await resVal.json();
  assert.equal(resVal.status, 400);
  assert.equal(resVal.headers.get('x-correlation-id'), 'req-corr-id-998877');
  assert.equal(bodyVal.error.code, 'VALIDATION_FAILED');
  assert.equal(bodyVal.error.retryable, false);
  assert.deepEqual(bodyVal.error.fieldErrors, [{ field: 'name', message: 'Name is required' }]);
  assert.equal(bodyVal.message, 'Validation failed');
  assert.equal(bodyVal.success, false);

  // 2. Authentication Error
  const resAuth = await fetch(`http://127.0.0.1:${port}/test-unauth`);
  const bodyAuth = await resAuth.json();
  assert.equal(resAuth.status, 401);
  assert.equal(bodyAuth.error.code, 'UNAUTHENTICATED');
  assert.equal(bodyAuth.error.message, 'Sign-in required');

  // 3. Authorization Error
  const resForb = await fetch(`http://127.0.0.1:${port}/test-forbidden`);
  const bodyForb = await resForb.json();
  assert.equal(resForb.status, 403);
  assert.equal(bodyForb.error.code, 'PERMISSION_DENIED');
  assert.equal(bodyForb.error.message, 'Forbidden action');

  // 4. Conflict Error
  const resConf = await fetch(`http://127.0.0.1:${port}/test-conflict`);
  const bodyConf = await resConf.json();
  assert.equal(resConf.status, 409);
  assert.equal(bodyConf.error.code, 'CONFLICT');
  assert.equal(bodyConf.error.message, 'Store name already taken');

  // 5. Crash / 500 Redaction
  const resCrash = await fetch(`http://127.0.0.1:${port}/test-crash`);
  const bodyCrash = await resCrash.json();
  assert.equal(resCrash.status, 500);
  assert.equal(bodyCrash.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(bodyCrash.error.message, 'Internal server error');
  assert.equal(JSON.stringify(bodyCrash).includes('secretpass'), false);
  assert.equal(bodyCrash.error.correlationId, 'req-corr-id-998877');
});

test('error envelope: representative internal routes return standard envelope on missing/invalid secret and 404', async (t) => {
  const { Store } = require('../../src/models');
  const originalFindByPk = Store.findByPk;
  Store.findByPk = async () => null;
  t.after(() => { Store.findByPk = originalFindByPk; });

  const app = express();
  process.env.INTERNAL_SERVICE_SECRET = 'valid-test-internal-secret-32-bytes-long';
  app.use('/api/internal', require('../../src/modules/internal/internalRoutes'));
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  t.after(() => server.close());

  // Missing secret -> 401 UNAUTHENTICATED
  const resNoSecret = await fetch(`http://127.0.0.1:${port}/api/internal/store-owner/non-existent-store`);
  const bodyNoSecret = await resNoSecret.json();
  assert.equal(resNoSecret.status, 401);
  assert.equal(bodyNoSecret.error.code, 'UNAUTHENTICATED');
  assert.equal(bodyNoSecret.error.message, 'Invalid internal service secret');
  assert.equal(bodyNoSecret.message, 'Invalid internal service secret');
  assert.equal(bodyNoSecret.success, false);
  assert.ok(bodyNoSecret.error.correlationId);

  // Valid secret but non-existent store -> 404 NOT_FOUND
  const resNotFound = await fetch(`http://127.0.0.1:${port}/api/internal/store-owner/018d34b1-827c-74a9-a9c1-5827c9b83799`, {
    headers: { 'x-internal-secret': 'valid-test-internal-secret-32-bytes-long' },
  });
  const bodyNotFound = await resNotFound.json();
  assert.equal(resNotFound.status, 404);
  assert.equal(bodyNotFound.error.code, 'NOT_FOUND');
  assert.equal(bodyNotFound.error.message, 'Store not found');
  assert.equal(bodyNotFound.message, 'Store not found');
  assert.equal(bodyNotFound.success, false);
});
