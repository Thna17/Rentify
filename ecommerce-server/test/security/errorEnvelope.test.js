const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { ApiError, formatErrorEnvelope, sanitizeMessage, normalizeFieldErrors } = require('../../utils/ApiError');
const errorHandler = require('../../middlewares/errorHandler');
const { createVerifyCoreAdmin } = require('../../modules/admin/verifyCoreAdmin');

test('commerce error envelope: ApiError factories construct expected status, codes, and retryable values', () => {
  const badReq = ApiError.badRequest('Invalid cart payload', 'INVALID_CART');
  assert.equal(badReq.statusCode, 400);
  assert.equal(badReq.code, 'INVALID_CART');
  assert.equal(badReq.retryable, false);

  const valErr = ApiError.validation([{ field: 'quantity', message: 'Quantity must be positive' }]);
  assert.equal(valErr.statusCode, 400);
  assert.equal(valErr.code, 'VALIDATION_FAILED');
  assert.equal(valErr.retryable, false);
  assert.deepEqual(valErr.fieldErrors, [{ field: 'quantity', message: 'Quantity must be positive' }]);

  const unauth = ApiError.unauthorized('Buyer sign-in required');
  assert.equal(unauth.statusCode, 401);
  assert.equal(unauth.code, 'UNAUTHENTICATED');
  assert.equal(unauth.retryable, false);

  const forb = ApiError.forbidden('Merchant access required');
  assert.equal(forb.statusCode, 403);
  assert.equal(forb.code, 'PERMISSION_DENIED');
  assert.equal(forb.retryable, false);

  const notFound = ApiError.notFound('Product not found');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, 'NOT_FOUND');
  assert.equal(notFound.retryable, false);

  const conflict = ApiError.conflict('Order already placed');
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

test('commerce error envelope: formatErrorEnvelope preserves backward-compatible legacy fields and correlation ID', () => {
  const req = {
    correlationId: '018d44c2-927c-74a9-a9c1-5827c9b84001',
    headers: {},
  };
  const err = ApiError.notFound('Order item not found');
  const { statusCode, body } = formatErrorEnvelope(err, req);

  assert.equal(statusCode, 404);
  assert.deepEqual(body, {
    error: {
      code: 'NOT_FOUND',
      message: 'Order item not found',
      fieldErrors: [],
      retryable: false,
      correlationId: '018d44c2-927c-74a9-a9c1-5827c9b84001',
    },
    message: 'Order item not found',
    success: false,
    statusCode: 404,
    correlationId: '018d44c2-927c-74a9-a9c1-5827c9b84001',
  });
});

test('commerce error envelope: sanitizes unexpected 500 errors and redacts secrets and stack traces', () => {
  const req = { correlationId: 'test-commerce-trace-001', headers: {} };
  const rawErr = new Error('Database connection failed: mysql://admin:my_secret_pass@10.0.0.1:3306/ecommerce');
  rawErr.stack = 'Error: at Query.run (/app/modules/checkout/service.js:100)';

  const { statusCode, body } = formatErrorEnvelope(rawErr, req);

  assert.equal(statusCode, 500);
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(body.error.message, 'Internal server error');
  assert.equal(body.message, 'Internal server error');
  assert.equal(body.stack, undefined);
  assert.equal(body.error.stack, undefined);
  assert.equal(JSON.stringify(body).includes('my_secret_pass'), false);
  assert.equal(JSON.stringify(body).includes('service.js:100'), false);
});

test('commerce error envelope: errorHandler middleware responds with envelope, status code, and correlation header', async (t) => {
  const app = express();
  app.use((req, _res, next) => {
    req.correlationId = 'req-commerce-999';
    next();
  });

  app.get('/test-validation', (_req, _res, next) => {
    next(ApiError.validation([{ field: 'stockQuantity', message: 'Must be positive' }]));
  });

  app.get('/test-unauth', (_req, _res, next) => {
    next(ApiError.unauthorized('Customer sign-in required'));
  });

  app.get('/test-forbidden', (_req, _res, next) => {
    next(ApiError.forbidden('Cannot manage another store catalog'));
  });

  app.get('/test-conflict', (_req, _res, next) => {
    next(ApiError.conflict('Inventory was modified by another transaction'));
  });

  app.get('/test-rate-limit', (_req, _res, next) => {
    next(ApiError.rateLimited('Checkout rate limit exceeded'));
  });

  app.get('/test-server-crash', (_req, _res, next) => {
    next(new Error('Fatal driver error with token=xyz987654321secret'));
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
  assert.equal(resVal.headers.get('x-correlation-id'), 'req-commerce-999');
  assert.equal(bodyVal.error.code, 'VALIDATION_FAILED');
  assert.equal(bodyVal.error.retryable, false);
  assert.deepEqual(bodyVal.error.fieldErrors, [{ field: 'stockQuantity', message: 'Must be positive' }]);
  assert.equal(bodyVal.message, 'Validation failed');
  assert.equal(bodyVal.success, false);

  // 2. Authentication Error
  const resAuth = await fetch(`http://127.0.0.1:${port}/test-unauth`);
  const bodyAuth = await resAuth.json();
  assert.equal(resAuth.status, 401);
  assert.equal(bodyAuth.error.code, 'UNAUTHENTICATED');
  assert.equal(bodyAuth.error.message, 'Customer sign-in required');

  // 3. Authorization Error
  const resForb = await fetch(`http://127.0.0.1:${port}/test-forbidden`);
  const bodyForb = await resForb.json();
  assert.equal(resForb.status, 403);
  assert.equal(bodyForb.error.code, 'PERMISSION_DENIED');
  assert.equal(bodyForb.error.message, 'Cannot manage another store catalog');

  // 4. Conflict Error
  const resConf = await fetch(`http://127.0.0.1:${port}/test-conflict`);
  const bodyConf = await resConf.json();
  assert.equal(resConf.status, 409);
  assert.equal(bodyConf.error.code, 'CONFLICT');
  assert.equal(bodyConf.error.message, 'Inventory was modified by another transaction');

  // 5. Rate Limit Error
  const resRate = await fetch(`http://127.0.0.1:${port}/test-rate-limit`);
  const bodyRate = await resRate.json();
  assert.equal(resRate.status, 429);
  assert.equal(bodyRate.error.code, 'RATE_LIMITED');
  assert.equal(bodyRate.error.retryable, true);

  // 6. Crash / 500 Redaction
  const resCrash = await fetch(`http://127.0.0.1:${port}/test-server-crash`);
  const bodyCrash = await resCrash.json();
  assert.equal(resCrash.status, 500);
  assert.equal(bodyCrash.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(bodyCrash.error.message, 'Internal server error');
  assert.equal(JSON.stringify(bodyCrash).includes('xyz987654321secret'), false);
});

test('commerce error envelope: representative admin operations module returns standard envelope', async (t) => {
  const app = express();
  app.use(express.json());

  // Test with mock verifyCoreAdmin allowing tests without external Core auth
  const verifyAdmin = createVerifyCoreAdmin({
    validate: async (token) => {
      if (token === 'valid-admin-token') return { data: { valid: true, entity: { id: 'admin-1', type: 'admin' } } };
      if (token === 'user-token') return { data: { valid: true, entity: { id: 'user-1', type: 'user' } } };
      return { data: { valid: false } };
    },
  });
  const controller = require('../../modules/admin/platformOperationsController');
  const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
  const adminRouter = express.Router();
  adminRouter.use(verifyAdmin);
  adminRouter.get('/overview', safe(controller.overview));
  adminRouter.get('/:resource', safe(controller.list));
  adminRouter.patch('/reports/:id', safe(controller.updateReport));

  app.use('/api/admin/operations', adminRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  t.after(() => server.close());

  // 1. Missing credentials -> 401 UNAUTHENTICATED
  const resNoAuth = await fetch(`http://127.0.0.1:${port}/api/admin/operations/overview`);
  const bodyNoAuth = await resNoAuth.json();
  assert.equal(resNoAuth.status, 401);
  assert.equal(bodyNoAuth.error.code, 'UNAUTHENTICATED');
  assert.equal(bodyNoAuth.error.message, 'Admin sign-in required');
  assert.equal(bodyNoAuth.message, 'Admin sign-in required');
  assert.equal(bodyNoAuth.success, false);

  // 2. Non-admin credentials -> 403 PERMISSION_DENIED
  const resUserAuth = await fetch(`http://127.0.0.1:${port}/api/admin/operations/overview`, {
    headers: { authorization: 'Bearer user-token' },
  });
  const bodyUserAuth = await resUserAuth.json();
  assert.equal(resUserAuth.status, 403);
  assert.equal(bodyUserAuth.error.code, 'PERMISSION_DENIED');
  assert.equal(bodyUserAuth.error.message, 'Admin access required');

  // 3. Unknown resource -> 404 NOT_FOUND
  const resNotFound = await fetch(`http://127.0.0.1:${port}/api/admin/operations/non-existent-resource`, {
    headers: { authorization: 'Bearer valid-admin-token' },
  });
  const bodyNotFound = await resNotFound.json();
  assert.equal(resNotFound.status, 404);
  assert.equal(bodyNotFound.error.code, 'NOT_FOUND');
  assert.equal(bodyNotFound.error.message, 'Unknown admin resource');

  // 4. Invalid report update status -> 400 BAD_REQUEST
  const resBadUpdate = await fetch(`http://127.0.0.1:${port}/api/admin/operations/reports/018d44c2-927c-74a9-a9c1-5827c9b84001`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer valid-admin-token',
    },
    body: JSON.stringify({ status: 'invalid_status_value' }),
  });
  const bodyBadUpdate = await resBadUpdate.json();
  assert.equal(resBadUpdate.status, 400);
  assert.equal(bodyBadUpdate.error.code, 'BAD_REQUEST');
  assert.ok(bodyBadUpdate.error.message.includes('Invalid report status'));
});
