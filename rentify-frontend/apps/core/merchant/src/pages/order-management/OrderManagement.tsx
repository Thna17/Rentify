import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { toast } from 'sonner';
import { AlertCircle, ChevronRight, Download, Inbox, Plus, Search } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { StatusPill } from '../../components/data-table/StatusPill';
import { FilterChips, PageShell, PageTitle, StatePanel, TabBar } from '../../components/page/PagePrimitives';
import { RecordCashSheet } from './components/RecordCashSheet';
import { PaymentPill } from './components/PaymentPill';
import { actionErrorKey, confirmOnlineOrder, markOnlineOrderDelivered, runDeliveryAction } from './orderActions';
import {
  CHANNEL_FILTERS,
  WORK_TABS,
  countByTab,
  money,
  onlineAction,
  orderLabel,
  workTab,
  type ChannelFilter,
  type WorkTab,
} from './orderModel';

export { workTab as classifyOrder } from './orderModel';

const isWorkTab = (value: string | null): value is WorkTab => WORK_TABS.includes(value as WorkTab);
const isChannel = (value: string | null): value is ChannelFilter => CHANNEL_FILTERS.includes(value as ChannelFilter);

/** Orders — one inbox for every channel (redesign M3). */
export function OrderManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { store } = useChannels();

  const channelParam = searchParams.get('channel');
  const tabParam = searchParams.get('tab');
  const channel: ChannelFilter = isChannel(channelParam) ? channelParam : 'all';
  const [tab, setTab] = useState<WorkTab>(isWorkTab(tabParam) ? tabParam : 'deliver');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cashOrder, setCashOrder] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders`, { credentials: 'include' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const inChannel = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (channel !== 'all' && order.channel !== channel) return false;
      if (!q) return true;
      return [order.orderNumber, order.id, order.buyer?.name, order.buyer?.phone]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [orders, channel, query]);

  const counts = useMemo(() => countByTab(inChannel), [inChannel]);
  const shown = useMemo(() => inChannel.filter((order) => workTab(order) === tab), [inChannel, tab]);

  const act = async (order: any, run: () => Promise<unknown>, doneKey: string) => {
    setBusyId(order.id);
    try {
      await run();
      toast.success(t(doneKey));
      await load();
    } catch (err) {
      toast.error(t(actionErrorKey(err)));
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = ['Order', 'Channel', 'Date', 'Buyer', 'Total', 'Payment method', 'Payment status', 'Order status'];
    const rows = shown.map((o) => [
      o.orderNumber || o.id, o.channel, new Date(o.createdAt).toISOString().slice(0, 10), o.buyer?.name || '',
      o.totals?.total || '0.00', o.payment?.method || '', o.payment?.status || '', o.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const rowAction = (order: any) => {
    const busy = busyId === order.id;
    const codes = new Set((order.allowedActions || []).map((a: any) => a.code));
    if (codes.has('collect_cod')) {
      return (
        <Button size="sm" disabled={busy} onClick={() => setCashOrder(order)} className="min-h-[44px] rounded-xl px-4">
          {t('merchant.orders.actions.recordCash')}
        </Button>
      );
    }
    if (codes.has('delivered')) {
      return (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => act(order, () => runDeliveryAction(store!.id, order, 'delivered'), 'merchant.orders.done.delivered')}
          className="min-h-[44px] rounded-xl px-4"
        >
          {t('merchant.orders.actions.markDelivered')}
        </Button>
      );
    }
    const online = onlineAction(order);
    if (online) {
      return (
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            online === 'confirm'
              ? act(order, () => confirmOnlineOrder(order), 'merchant.orders.done.confirmed')
              : act(order, () => markOnlineOrderDelivered(order), 'merchant.orders.done.delivered')
          }
          className="min-h-[44px] rounded-xl px-4"
        >
          {t(online === 'confirm' ? 'merchant.orders.actions.confirm' : 'merchant.orders.actions.markDelivered')}
        </Button>
      );
    }
    return (
      <Button asChild size="sm" variant="outline" className="min-h-[44px] rounded-xl px-4">
        <Link to={`/orders/${order.id}`}>{t('merchant.orders.actions.view')}</Link>
      </Button>
    );
  };

  const channelName = (id: string) => t(`merchant.orders.channels.${id}`);

  return (
    <PageShell>
      <PageTitle
        title={t('merchant.orders.title')}
        description={t('merchant.orders.subtitle')}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!shown.length} className="hidden min-h-[44px] rounded-xl sm:inline-flex">
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('merchant.orders.export')}
            </Button>
            <Button onClick={() => navigate('/invoices?new=1')} className="min-h-[44px] rounded-xl">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('merchant.orders.newOrder')}
            </Button>
          </>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('merchant.orders.search')}
          aria-label={t('merchant.orders.search')}
          className="h-11 rounded-xl pl-10"
        />
      </div>

      <FilterChips
        label={t('merchant.orders.channelFilter')}
        items={CHANNEL_FILTERS.map((id) => ({ id, label: id === 'all' ? t('merchant.orders.channels.all') : channelName(id) }))}
        value={channel}
        onChange={(id) => setParam('channel', id === 'all' ? null : id)}
      />

      <TabBar
        label={t('merchant.orders.workTabs')}
        items={WORK_TABS.map((id) => ({ id, label: t(`merchant.orders.tabs.${id}`), count: counts[id] }))}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setParam('tab', id);
        }}
      />

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label={t('merchant.orders.loading')}>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : error ? (
        <StatePanel
          tone="error"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('merchant.orders.loadError')}
          body={t('merchant.orders.loadErrorBody')}
          action={<Button variant="outline" onClick={load} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>}
        />
      ) : shown.length === 0 ? (
        <StatePanel
          icon={<Inbox className="h-5 w-5" />}
          title={t(`merchant.orders.empty.${tab}`)}
          body={orders.length === 0 ? t('merchant.orders.emptyBody') : undefined}
        />
      ) : (
        <>
          {/* Phones: one card per order with its next action */}
          <ul className="space-y-3 md:hidden">
            {shown.map((order) => (
              <li key={order.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <Link to={`/orders/${order.id}`} className="block space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-all font-semibold text-foreground">{orderLabel(order)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-foreground">{money(order.totals?.total, order.currency)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.buyer?.name || t('merchant.orders.buyerUnknown')} · {t(order.items?.length === 1 ? 'merchant.orders.itemOne' : 'merchant.orders.items', { count: order.items?.length || 0 })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="neutral">{channelName(order.channel)}</StatusPill>
                    <PaymentPill order={order} />
                  </div>
                </Link>
                <div className="mt-3 [&>*]:w-full">{rowAction(order)}</div>
              </li>
            ))}
          </ul>

          {/* Tablet and desktop: a table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">{t('merchant.orders.columns.order')}</th>
                  <th scope="col" className="px-4 py-3">{t('merchant.orders.columns.buyer')}</th>
                  <th scope="col" className="px-4 py-3">{t('merchant.orders.columns.channel')}</th>
                  <th scope="col" className="px-4 py-3">{t('merchant.orders.columns.payment')}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t('merchant.orders.columns.total')}</th>
                  <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">{t('merchant.orders.columns.action')}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline">
                        {orderLabel(order)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                      <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-foreground">{order.buyer?.name || t('merchant.orders.buyerUnknown')}</td>
                    <td className="px-4 py-3"><StatusPill tone="neutral">{channelName(order.channel)}</StatusPill></td>
                    <td className="px-4 py-3"><PaymentPill order={order} /></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">{money(order.totals?.total, order.currency)}</td>
                    <td className="px-4 py-3 text-right">{rowAction(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <RecordCashSheet
        open={Boolean(cashOrder)}
        onOpenChange={(open) => !open && setCashOrder(null)}
        order={cashOrder}
        onConfirm={async () => {
          const order = cashOrder;
          setCashOrder(null);
          await act(
            order,
            () => runDeliveryAction(store!.id, order, 'collect_cod', { amount: order.payment?.amountDue }),
            'merchant.orders.done.cashRecorded',
          );
        }}
      />
    </PageShell>
  );
}

export default OrderManagement;
