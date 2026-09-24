import { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AppError } from '../errors/app-error';

const rateLimitHandler = (_request: Request, response: Response) => {
  response.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
  });
};

const limiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });

/**
 * Keys the limiter on caller IP *and* the targeted email.
 *
 * IP alone lets a botnet spread guesses across addresses and walk past the
 * limit. Email alone lets an attacker lock a victim out of their own account
 * by deliberately failing. Combining them defeats both.
 *
 * ipKeyGenerator normalises IPv6 addresses to their /64 prefix — without it,
 * an attacker with an IPv6 range gets a fresh budget from every address.
 */
const ipAndEmailKey = (request: Request) => {
  const ip = ipKeyGenerator(request.ip ?? '');
  const email =
    typeof request.body?.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : 'unknown';
  return `${ip}:${email}`;
};

const credentialLimiter = (windowMs: number, limit: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: ipAndEmailKey,
    handler: rateLimitHandler,
  });

export const apiRateLimit = limiter(15 * 60 * 1000, 300);
export const loginRateLimit = credentialLimiter(15 * 60 * 1000, 5);
export const registrationRateLimit = limiter(60 * 60 * 1000, 10);
export const passwordResetRateLimit = credentialLimiter(15 * 60 * 1000, 5);

const containsOperatorKey = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsOperatorKey);
  }
  return Object.entries(value).some(
    ([key, child]) =>
      key.startsWith('$') || key.includes('.') || containsOperatorKey(child),
  );
};

/**
 * MongoDB does not execute SQL, but operator-shaped objects can create the
 * equivalent injection vulnerability. Reject them before validation/querying.
 */
export const preventOperatorInjection = (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  if (
    containsOperatorKey(request.body) ||
    containsOperatorKey(request.query) ||
    containsOperatorKey(request.params)
  ) {
    return next(
      new AppError(
        400,
        'Request contains prohibited input',
        'PROHIBITED_INPUT',
      ),
    );
  }
  return next();
};
