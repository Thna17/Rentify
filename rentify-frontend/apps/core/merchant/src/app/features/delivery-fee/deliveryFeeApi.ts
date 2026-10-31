import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';

/** A Store's flat delivery fee (Commerce StoreDeliveryPolicy). Checkout refuses orders without one. */
export interface DeliveryPolicy {
  storeId: string;
  flatFee: string;
  currency: string;
  version: number;
}

const url = (storeId: string) => `${ECOMMERCE_API_ROOT}/api/stores/${storeId}/marketplace-delivery`;

async function request(storeId: string, init?: RequestInit): Promise<DeliveryPolicy | null> {
  const response = await fetch(url(storeId), { credentials: 'include', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || 'Request failed');
  return body.policy ?? null;
}

export const getDeliveryPolicy = (storeId: string) => request(storeId);

/** Saves the fee; sends the version it was read at so two edits can't silently overwrite each other. */
export const saveDeliveryPolicy = (storeId: string, flatFee: string, current: DeliveryPolicy | null) =>
  request(storeId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flatFee, ...(current ? { expectedVersion: current.version } : {}) }),
  });

/** Same rule as Commerce: 0.00 to 1000.00 USD with at most two decimals. Returns the amount to send, or null. */
export function parseDeliveryFee(input: string): string | null {
  const text = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 1000) return null;
  return amount.toFixed(2);
}

export const formatFee = (fee: string | number) => `$${Number(fee || 0).toFixed(2)}`;
