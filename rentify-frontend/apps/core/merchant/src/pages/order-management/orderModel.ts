/**
 * One reading of a Commerce order projection (GET /api/stores/:storeId/orders) for the inbox,
 * the order page and Home. Work states and actions come only from recorded facts: delivery
 * status, payment status and the `allowedActions` Commerce returns. Nothing here invents a step
 * the backend does not record (there is no "confirm" step for delivery orders).
 */

export type WorkTab = 'deliver' | 'cash' | 'waiting' | 'problems' | 'done' | 'cancelled';
export type ChannelFilter = 'all' | 'marketplace' | 'storefront' | 'pos' | 'invoice';
export type PaymentKind =
  | 'cod_due'
  | 'cod_collected'
  | 'cod_refunded'
  | 'online_paid'
  | 'online_waiting'
  | 'online_failed'
  | 'cash_paid'
  | 'paid'
  | 'unpaid'
  | 'none';

export const WORK_TABS: WorkTab[] = ['deliver', 'cash', 'waiting', 'problems', 'done', 'cancelled'];
export const CHANNEL_FILTERS: ChannelFilter[] = ['all', 'marketplace', 'storefront', 'pos', 'invoice'];

const PAID = new Set(['paid', 'completed']);
const ONLINE = new Set(['KHQR', 'CUTLUY', 'ABA_PAYWAY', 'ABA']);

const methodOf = (order: any) => String(order?.payment?.method || '').toUpperCase();
const statusOf = (order: any) => String(order?.payment?.status || '').toLowerCase();
const hasAction = (order: any, code: string) =>
  Array.isArray(order?.allowedActions) && order.allowedActions.some((action: any) => action?.code === code);

export const isOnlinePayment = (order: any) => ONLINE.has(methodOf(order));
export const isCodPayment = (order: any) => methodOf(order) === 'COD';

/** What the merchant should know about the money on this order, in one word. */
export function paymentKind(order: any): PaymentKind {
  const method = methodOf(order);
  const status = statusOf(order);
  if (!method || status === 'not_recorded') return 'none';
  if (method === 'COD') {
    const codState = order?.payment?.codState;
    if (codState === 'refunded' || codState === 'partially_refunded') return 'cod_refunded';
    if (codState === 'collected') return 'cod_collected';
    return 'cod_due';
  }
  if (ONLINE.has(method)) {
    if (PAID.has(status)) return 'online_paid';
    if (status === 'failed' || status === 'expired') return 'online_failed';
    return 'online_waiting';
  }
  if (method === 'CASH') return PAID.has(status) ? 'cash_paid' : 'unpaid';
  return PAID.has(status) ? 'paid' : 'unpaid';
}

const isDelivered = (order: any) =>
  order?.fulfillmentStatus === 'delivered' || ['completed', 'fulfilled', 'delivered'].includes(order?.status);

/**
 * Delivery for an order paid online goes through Commerce's order completion
 * (POST /api/merchant/orders/:id/complete); COD delivery orders use `allowedActions`.
 */
export const canMarkOnlineDelivered = (order: any) =>
  paymentKind(order) === 'online_paid' && order?.status !== 'cancelled' && !isDelivered(order) &&
  ['marketplace', 'storefront'].includes(order?.channel);

/** The inbox tab an order belongs to. */
export function workTab(order: any): WorkTab {
  if (order?.status === 'cancelled') return 'cancelled';
  if ((order?.reports?.length || 0) > 0 || order?.fulfillmentStatus === 'failed') return 'problems';
  if (hasAction(order, 'collect_cod')) return 'cash';
  if (hasAction(order, 'delivered') || canMarkOnlineDelivered(order)) return 'deliver';
  const kind = paymentKind(order);
  if (kind === 'online_waiting' || kind === 'unpaid') return 'waiting';
  if (isDelivered(order) || order?.channel === 'pos' || order?.channel === 'invoice') return 'done';
  // Still in progress, but Commerce lists no action for it yet: shown under To deliver, view only.
  return 'deliver';
}

export function countByTab(orders: any[]): Record<WorkTab, number> {
  const counts: Record<WorkTab, number> = { deliver: 0, cash: 0, waiting: 0, problems: 0, done: 0, cancelled: 0 };
  orders.forEach((order) => {
    counts[workTab(order)] += 1;
  });
  return counts;
}

export const orderLabel = (order: any) => `#${order?.orderNumber || String(order?.id || '').slice(0, 8)}`;

export const money = (value: string | number | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(value || 0));

/** Idempotency keys that are reused when the same request is retried (Commerce dedupes on them). */
export function createActionKeys() {
  let last: { fingerprint: string; key: string } | null = null;
  return {
    keyFor(fingerprint: string) {
      if (last?.fingerprint !== fingerprint) {
        const key = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        last = { fingerprint, key };
      }
      return last.key;
    },
    done() {
      last = null;
    },
  };
}
