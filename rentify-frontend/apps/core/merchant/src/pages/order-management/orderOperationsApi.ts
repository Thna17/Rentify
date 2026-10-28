import { commerceClient } from '@rentify/shared/api';
import type { MerchantOrder, OrderActionCode, OrderFilters } from './orderOperationsModel';

const withTimeout = <T>(promise: Promise<T>, milliseconds = 15_000): Promise<T> => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new DOMException('Timed out', 'TimeoutError')), milliseconds);
  promise.then((value) => { window.clearTimeout(timer); resolve(value); }, (error) => { window.clearTimeout(timer); reject(error); });
});

export const orderOperationsApi = {
  async list(storeId: string, filters: OrderFilters) {
    const response = await withTimeout(commerceClient.request<{ orders: MerchantOrder[]; total: number; capped: boolean }>({
      method: 'GET', path: `/api/stores/${storeId}/orders`, credentials: 'include',
      query: Object.fromEntries(Object.entries(filters).filter(([, value]) => value && value !== 'all')),
    }));
    return response.data;
  },
  async get(storeId: string, orderId: string) {
    const response = await withTimeout(commerceClient.request<{ order: MerchantOrder }>({
      method: 'GET', path: `/api/stores/${storeId}/orders/${orderId}`, credentials: 'include',
    }));
    return response.data.order;
  },
  async act(storeId: string, order: MerchantOrder, action: OrderActionCode, details: Record<string, unknown>, idempotencyKey: string) {
    const response = await withTimeout(commerceClient.request<{ order: MerchantOrder }>({
      method: 'POST', path: `/api/stores/${storeId}/orders/${order.id}/actions/${action}`,
      credentials: 'include', headers: { 'Idempotency-Key': idempotencyKey }, body: { ...details, expectedVersion: order.version },
    }));
    return response.data.order;
  },
  async openDocument(path: string) {
    const response = await withTimeout(commerceClient.request<{ pdfUrl?: string }>({ method: 'GET', path, credentials: 'include' }));
    if (!response.data.pdfUrl) throw new Error('Document is not available');
    window.open(response.data.pdfUrl, '_blank', 'noopener,noreferrer');
  },
};
