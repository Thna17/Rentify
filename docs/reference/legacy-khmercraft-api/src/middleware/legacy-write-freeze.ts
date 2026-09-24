import type { RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

// A late PayWay callback may settle an order placed before the freeze. Keep
// that existing transaction's callback active while blocking new Mongo writes.
const inFlightPaymentCallback = '/api/payments/aba-payway/callback';

export const legacyWriteFreeze: RequestHandler = (request, _response, next) => {
  if (!env.legacyWritesFrozen || request.method === 'GET' || request.method === 'HEAD' ||
      request.method === 'OPTIONS' ||
      (request.method === 'POST' && request.path === inFlightPaymentCallback)) {
    next();
    return;
  }

  next(new AppError(503,
    'Legacy marketplace writes are paused during migration',
    'LEGACY_WRITES_FROZEN'));
};
