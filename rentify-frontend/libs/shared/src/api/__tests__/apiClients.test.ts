import { describe, it, expect, vi } from 'vitest';
import { createCoreClient, createCommerceClient } from '../index';
import { ApiClientError } from '../generated';

describe('React typed API clients (@rentify/shared/api)', () => {
  it('instantiates Core client and executes typed call with credentials and correlation ID', async () => {
    let capturedUrl = '';
    let capturedInit: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(
        JSON.stringify({ user: { id: 'usr-react-001', name: 'Merchant Test' } }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-correlation-id': 'resp-cid-001',
          },
        }
      );
    });

    const client = createCoreClient({
      baseUrl: 'http://localhost:3001',
      fetch: mockFetch,
    });

    const res = await client.getSessionProfileAlias({ correlationId: 'req-cid-test' });

    expect(capturedUrl).toBe('http://localhost:3001/api/auth/me');
    expect(capturedInit.method).toBe('GET');
    expect(capturedInit.credentials).toBe('include');
    expect(capturedInit.headers['X-Correlation-ID']).toBe('req-cid-test');
    expect(res.data.user.id).toBe('usr-react-001');
    expect(res.correlationId).toBe('resp-cid-001');
  });

  it('instantiates Commerce client and serializes path parameters and query parameters', async () => {
    let capturedUrl = '';
    let capturedInit: any = null;

    const mockFetch = vi.fn().mockImplementation(async (url: string, init: any) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(
        JSON.stringify({ id: 'prod-123', name: 'Silk Scarf', price: '45.00' }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    });

    const client = createCommerceClient({
      baseUrl: 'http://localhost:4001',
      fetch: mockFetch,
    });

    const res = await client.getApiMarketplaceProductsProductId({
      path: { productId: 'prod-123' },
    });

    expect(capturedUrl).toBe('http://localhost:4001/api/marketplace/products/prod-123');
    expect(capturedInit.method).toBe('GET');
    expect(capturedInit.credentials).toBe('include');
    expect(res.data.id).toBe('prod-123');
  });

  it('parses standard error envelope and throws typed ApiClientError', async () => {
    const errorBody = {
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid product input',
        fieldErrors: [{ field: 'name', message: 'Name is required' }],
        retryable: false,
        correlationId: 'err-cid-789',
      },
      message: 'Invalid product input',
      success: false,
      statusCode: 400,
      correlationId: 'err-cid-789',
    };

    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: {
          'content-type': 'application/json',
          'x-correlation-id': 'err-cid-789',
        },
      });
    });

    const client = createCoreClient({
      baseUrl: 'http://localhost:3001',
      fetch: mockFetch,
    });

    await expect(client.getSessionProfile()).rejects.toThrow(ApiClientError);

    try {
      await client.getSessionProfile();
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.code).toBe('VALIDATION_FAILED');
      expect(err.message).toBe('Invalid product input');
      expect(err.status).toBe(400);
      expect(err.retryable).toBe(false);
      expect(err.fieldErrors).toEqual([{ field: 'name', message: 'Name is required' }]);
      expect(err.correlationId).toBe('err-cid-789');
    }
  });

  it('supports legacy error shapes with safe fallback parsing', async () => {
    const legacyBody = {
      error: 'Legacy error description',
      statusCode: 404,
    };

    const mockFetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify(legacyBody), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    });

    const client = createCommerceClient({
      baseUrl: 'http://localhost:4001',
      fetch: mockFetch,
    });

    try {
      await client.getApiMarketplaceCart();
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Legacy error description');
      expect(err.status).toBe(404);
    }
  });
});
