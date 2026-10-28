import { useEffect, useMemo, useState } from 'react';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { useChannels, type ChannelView } from '../context/ChannelContext';

/** Shape returned by Commerce `GET /api/stores/:storeId/orders` (orderOperationsService.orderProjection). */
export interface StoreOrder {
  id: string;
  orderNumber?: string;
  channel: 'marketplace' | 'storefront' | 'pos' | 'invoice';
  status: string;
  createdAt: string;
  currency: string;
  totals: { total: string };
  payment: { status: string; codState: string; amount: string; amountDue: string; collectedAmount: string; refundedAmount: string };
  buyer: { name: string };
  items: { productId: string; name: string; quantity: number; lineTotal: string }[];
  reports: { id: string; type: string; createdAt: string }[];
  allowedActions: { code: string }[];
}

export const CHANNEL_LABEL: Record<StoreOrder['channel'], string> = {
  marketplace: 'Marketplace',
  storefront: 'Online store',
  pos: 'POS',
  invoice: 'Invoice',
};

export const PERIOD_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, '90d': 90, all: null };

const SETTLED = new Set(['completed', 'paid', 'refunded']);
const num = (value: string | number | undefined) => Number(value || 0);
const dayKey = (value: string) => new Date(value).toISOString().slice(0, 10);

/**
 * Orders for the selected channel view and period, plus money figures derived only from
 * recorded order and payment facts. Nothing here estimates fees or states the backend doesn't record.
 */
export function useChannelOrders(period: string, viewOverride?: ChannelView) {
  const { store, view: contextView } = useChannels();
  const view = viewOverride || contextView;
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!store?.id) return undefined;
    let active = true;
    const params = new URLSearchParams();
    if (view !== 'all') params.set('channel', view);
    const days = PERIOD_DAYS[period];
    if (days) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      params.set('dateFrom', from.toISOString().slice(0, 10));
    }
    setLoading(true);
    setError(false);
    fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders?${params}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => active && setOrders(Array.isArray(data?.orders) ? data.orders : []))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [store?.id, view, period, reloadKey]);

  const summary = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'cancelled');
    const sales = live.reduce((sum, o) => sum + num(o.totals.total), 0);
    const paid = live.reduce((sum, o) => sum + (SETTLED.has(o.payment.status) ? num(o.payment.amount) : num(o.payment.collectedAmount)), 0);
    const refunded = orders.reduce((sum, o) => sum + num(o.payment.refundedAmount), 0);
    const awaiting = live.reduce((sum, o) => sum + num(o.payment.amountDue), 0);

    const byChannel = (['marketplace', 'storefront', 'pos', 'invoice'] as const)
      .map((channel) => {
        const list = live.filter((o) => o.channel === channel);
        return { channel, orders: list.length, sales: list.reduce((sum, o) => sum + num(o.totals.total), 0) };
      })
      .filter((row) => row.orders > 0);

    // One inbox for both channels: buyer reports first, then orders with a recorded next step
    const attention = orders
      .filter((o) => o.reports.length > 0 || o.allowedActions.length > 0)
      .map((o) => ({
        order: o,
        reason: o.reports.some((r) => r.type === 'return_requested')
          ? 'Return requested'
          : o.reports.some((r) => r.type === 'complaint')
            ? 'Buyer complaint'
            : o.allowedActions.some((a) => a.code === 'collect_cod')
              ? 'Collect cash on delivery'
              : o.allowedActions.some((a) => a.code === 'refund' || a.code === 'confirm_refund')
                ? 'Refund can be recorded'
                : 'Delivery update needed',
      }));

    const trendMap = new Map<string, { revenue: number; orders: number }>();
    live.forEach((o) => {
      const key = dayKey(o.createdAt);
      const row = trendMap.get(key) || { revenue: 0, orders: 0 };
      row.revenue += num(o.totals.total);
      row.orders += 1;
      trendMap.set(key, row);
    });
    const days = PERIOD_DAYS[period] || Math.max(7, trendMap.size);
    const trend = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, revenue: trendMap.get(key)?.revenue || 0, orders: trendMap.get(key)?.orders || 0 };
    });

    const productMap = new Map<string, { id: string; name: string; revenue: number; unitsSold: number }>();
    live.forEach((o) =>
      o.items.forEach((item) => {
        const row = productMap.get(item.productId) || { id: item.productId, name: item.name, revenue: 0, unitsSold: 0 };
        row.revenue += num(item.lineTotal);
        row.unitsSold += item.quantity || 0;
        productMap.set(item.productId, row);
      })
    );
    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      sales,
      paid,
      refunded,
      awaiting,
      net: paid - refunded,
      orderCount: live.length,
      averageOrder: live.length ? sales / live.length : 0,
      byChannel,
      attention,
      trend,
      dateRange: { start: trend[0]?.date, end: trend[trend.length - 1]?.date },
      topProducts,
    };
  }, [orders, period]);

  return { view, orders, loading: loading && !error, error, summary, reload: () => setReloadKey((k) => k + 1) };
}

export const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);

export default useChannelOrders;
