import { afterEach, describe, expect, it, vi } from 'vitest';
import { commerceClient } from '@rentify/shared/api';
import { orderOperationsApi } from './orderOperationsApi';
import type { MerchantOrder } from './orderOperationsModel';

const order = {
  id: 'order-1', version: 7, payment: { amountDue: '25.00' },
} as MerchantOrder;

afterEach(() => vi.restoreAllMocks());

describe('merchant order operations API safety', () => {
  it('sends filters to the Store-scoped unified list', async () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    const request = vi.spyOn(commerceClient, 'request').mockResolvedValue({ data: { orders: [], total: 0, capped: false } } as never);
    await orderOperationsApi.list('store-1', { search: 'RNT-1', channel: 'pos', status: 'completed', dateFrom: '2026-10-01', dateTo: '' });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/stores/store-1/orders',
      query: { search: 'RNT-1', channel: 'pos', status: 'completed', dateFrom: '2026-10-01' },
    }));
    vi.unstubAllGlobals();
  });

  it('includes one idempotency key and the server version with a transition', async () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    const request = vi.spyOn(commerceClient, 'request').mockResolvedValue({ data: { order } } as never);
    await orderOperationsApi.act('store-1', order, 'collect_cod', { amount: '25.00' }, 'safe_retry_key');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/stores/store-1/orders/order-1/actions/collect_cod',
      headers: { 'Idempotency-Key': 'safe_retry_key' },
      body: { amount: '25.00', expectedVersion: 7 },
    }));
    vi.unstubAllGlobals();
  });
});
