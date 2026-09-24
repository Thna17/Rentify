import type { Request, Response } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { AppError } from '../../src/errors/app-error';
import { legacyWriteFreeze } from '../../src/middleware/legacy-write-freeze';

const pass = (method: string, path: string) => {
  let result: unknown;
  legacyWriteFreeze({ method, path } as Request, {} as Response, (error) => {
    result = error ?? null;
  });
  return result;
};

afterEach(() => vi.unstubAllEnvs());

describe('legacy Mongo write freeze', () => {
  it('leaves normal routes alone until the freeze is enabled', () => {
    vi.stubEnv('LEGACY_MARKETPLACE_WRITES_FROZEN', 'false');
    expect(pass('POST', '/api/orders')).toBeNull();
  });

  it('keeps reads and existing payment callbacks available', () => {
    vi.stubEnv('LEGACY_MARKETPLACE_WRITES_FROZEN', 'true');
    expect(pass('GET', '/api/products')).toBeNull();
    expect(pass('HEAD', '/health')).toBeNull();
    expect(pass('OPTIONS', '/api/cart/items')).toBeNull();
    expect(pass('POST', '/api/payments/aba-payway/callback')).toBeNull();
  });

  it('blocks new legacy catalog, cart, order, auth, and payment writes', () => {
    vi.stubEnv('LEGACY_MARKETPLACE_WRITES_FROZEN', 'true');
    for (const [method, path] of [
      ['POST', '/api/products'], ['PATCH', '/api/products/123'],
      ['DELETE', '/api/cart/items/123'], ['POST', '/api/orders'],
      ['POST', '/auth/register'], ['POST', '/api/payments/aba-payway/checkout'],
    ]) {
      const result = pass(method, path);
      expect(result).toBeInstanceOf(AppError);
      expect((result as AppError).statusCode).toBe(503);
      expect((result as AppError).code).toBe('LEGACY_WRITES_FROZEN');
    }
  });

  it('returns the standard 503 error before a frozen order reaches Mongo', async () => {
    vi.stubEnv('LEGACY_MARKETPLACE_WRITES_FROZEN', 'true');
    const app = createApp();
    const blocked = await request(app).post('/api/orders').send({});
    expect(blocked.status).toBe(503);
    expect(blocked.body.error.code).toBe('LEGACY_WRITES_FROZEN');
    expect((await request(app).get('/health')).status).toBe(200);
  });
});
