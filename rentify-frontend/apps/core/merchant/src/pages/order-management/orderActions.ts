import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { createActionKeys } from './orderModel';

export type DeliveryAction = 'delivered' | 'delivery_failed' | 'retry_delivery' | 'collect_cod' | 'confirm_refund';

/** Status code of a failed order action; screens turn it into words (never the raw backend message). */
export class OrderActionError extends Error {
  constructor(public status: number) {
    super(`Order action failed (${status})`);
  }
}

const keys = createActionKeys();

async function post(url: string, key: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new OrderActionError(res.status);
  keys.done();
  return res.json().catch(() => ({}));
}

/** One of the actions Commerce lists in `order.allowedActions` (COD delivery orders). */
export function runDeliveryAction(storeId: string, order: any, action: DeliveryAction, details: Record<string, unknown> = {}) {
  const body = { ...details, expectedVersion: order.version };
  const key = keys.keyFor(JSON.stringify([order.id, action, details]));
  return post(`${ECOMMERCE_API_ROOT}/api/stores/${storeId}/orders/${order.id}/actions/${action}`, key, body);
}

const merchantOrderUrl = (order: any, step: string) => `${ECOMMERCE_API_ROOT}/api/merchant/orders/${order.id}/${step}`;

/** Confirms an order paid online (Commerce refuses it until the payment is completed). */
export function confirmOnlineOrder(order: any) {
  return post(merchantOrderUrl(order, 'confirm'), keys.keyFor(JSON.stringify([order.id, 'confirm'])), {});
}

/** Marks a confirmed order paid online as delivered: processing, then completed. */
export async function markOnlineOrderDelivered(order: any) {
  if (order.status === 'confirmed') {
    await post(merchantOrderUrl(order, 'process'), keys.keyFor(JSON.stringify([order.id, 'process'])), { action: 'process' });
  }
  return post(merchantOrderUrl(order, 'complete'), keys.keyFor(JSON.stringify([order.id, 'complete'])), {});
}

/** Translation key for a failed action. */
export const actionErrorKey = (error: unknown) => {
  const status = error instanceof OrderActionError ? error.status : 0;
  if (status === 409) return 'merchant.orders.errors.changed';
  if (status === 403) return 'merchant.orders.errors.notAllowed';
  return 'merchant.orders.errors.generic';
};
