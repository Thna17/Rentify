import { useEffect, useMemo, useRef, useState } from 'react';
import { PackageSearch, RefreshCw, CheckCircle2, Undo2, ChevronDown } from 'lucide-react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Button } from '@rentify/shared/ui/button';
import { Checkbox } from '@rentify/shared/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';
import { useTranslation } from '@rentify/utils';
import { DataTable, StatusPill } from '../../components/data-table';

const api = `${ECOMMERCE_API_ROOT}/api`;
const fieldClass = 'border-transparent [box-shadow:var(--shadow-soft)] bg-background';
// Tones for the states the COD API returns; unknown values render as-is in a neutral pill
const DELIVERY_TONE = { pending: 'warning', retrying: 'warning', failed: 'danger', delivered: 'success', cancelled: 'neutral' };
const PAYMENT_TONE = {
  pending: 'warning', collected: 'success', paid: 'success', partially_refunded: 'info',
  refunded: 'neutral', failed: 'danger', cancelled: 'neutral',
};

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : result.message || 'Request failed');
  return result;
}

export default function MarketplaceOrders({ storeId: suppliedStoreId }) {
  const { t, formatDate } = useTranslation();
  const [loadError, setLoadError] = useState('');
  const [storeId, setStoreId] = useState(suppliedStoreId || null);
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('retry');
  const [buyerAgreed, setBuyerAgreed] = useState(false);
  const [refund, setRefund] = useState({ amount: '', method: '', confirmation: '' });
  const retry = useRef(null);
  const selected = orders.find((order) => order.id === selectedId);

  async function load(id) {
    const result = await request(`${api}/stores/${id}/marketplace-orders`);
    setOrders(result.orders || []);
    setSelectedId((previous) => previous && result.orders.some((order) => order.id === previous)
      ? previous : null);
  }

  const active = useRef(true);
  async function start() {
    setLoading(true);
    setLoadError('');
    try {
      const id = suppliedStoreId || (await request(`${RENTIFY_API_BASE}/api/stores/mine`)).data?.id;
      if (!id) throw new Error('Create a Store to manage COD orders.');
      if (!active.current) return;
      setStoreId(id);
      await load(id);
    } catch (error) { if (active.current) setLoadError(error.message); }
    finally { if (active.current) setLoading(false); }
  }

  useEffect(() => {
    active.current = true;
    start();
    return () => { active.current = false; };
  }, [suppliedStoreId]);

  useEffect(() => {
    if (!storeId || !selectedId) { setEvents([]); return; }
    let active = true;
    request(`${api}/stores/${storeId}/marketplace-orders/${selectedId}/events`)
      .then((result) => { if (active) setEvents(result.events || []); })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [storeId, selectedId]);

  async function act(action, details = {}) {
    if (!selected || busy) return;
    const fingerprint = JSON.stringify([selected.id, action, details]);
    const key = retry.current?.fingerprint === fingerprint ? retry.current.key : crypto.randomUUID();
    retry.current = { fingerprint, key };
    setBusy(true);
    setMessage('');
    try {
      await request(`${api}/stores/${storeId}/marketplace-orders/${selected.id}/actions/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(details),
      });
      retry.current = null;
      await load(storeId);
      const result = await request(`${api}/stores/${storeId}/marketplace-orders/${selected.id}/events`);
      setEvents(result.events || []);
      setReason('');
      setBuyerAgreed(false);
      setRefund({ amount: '', method: '', confirmation: '' });
      setMessage('Order updated.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const statusText = (group, value) => {
    if (!value) return '—';
    const key = `merchant.table.orders.${group}.${value}`;
    const label = t(key);
    return label === key ? value.replaceAll('_', ' ') : label;
  };
  const toggle = (order) => setSelectedId((current) => (current === order.id ? null : order.id));

  const columns = useMemo(() => [
    {
      id: 'order',
      accessorFn: (order) => order.orderNumber || order.id,
      header: t('merchant.table.orders.order'),
      meta: { sortable: true, mobile: 'primary' },
      cell: ({ row }) => {
        const order = row.original;
        return (
          <span className="block min-w-0">
            <span className="block font-semibold text-foreground">{order.orderNumber || order.id.slice(0, 8)}</span>
            <span className="block text-xs text-muted-foreground">
              {order.createdAt ? formatDate(order.createdAt, { dateStyle: 'medium' }) : ''}
            </span>
          </span>
        );
      },
    },
    {
      id: 'buyer',
      accessorFn: (order) => order.customerInfo?.name || '',
      header: t('merchant.table.orders.buyer'),
      meta: { sortable: true, mobileHideLabel: true, mobileCell: (order) => order.customerInfo?.name || '—' },
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block truncate text-foreground">{row.original.customerInfo?.name || '—'}</span>
          {row.original.customerInfo?.phone && (
            <span className="block truncate text-xs text-muted-foreground">{row.original.customerInfo.phone}</span>
          )}
        </span>
      ),
    },
    {
      id: 'channel',
      accessorFn: (order) => order.salesChannel || '',
      header: t('merchant.table.orders.channel'),
      meta: { mobileHideLabel: true },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.salesChannel === 'storefront' ? t('merchant.table.orders.storefront') : t('merchant.table.orders.marketplace')}
        </span>
      ),
    },
    {
      id: 'total',
      accessorFn: (order) => Number(order.totalAmount) || 0,
      header: t('merchant.table.orders.total'),
      meta: { sortable: true, align: 'right', mobile: 'trailing' },
      cell: ({ row }) => <span className="font-medium tabular-nums text-foreground">${row.original.totalAmount}</span>,
    },
    {
      id: 'delivery',
      accessorFn: (order) => order.deliveryStatus || '',
      header: t('merchant.table.orders.delivery'),
      meta: { sortable: true, mobile: 'badge' },
      cell: ({ getValue }) => (
        <StatusPill tone={DELIVERY_TONE[getValue()] || 'neutral'}>{statusText('deliveryStatus', getValue())}</StatusPill>
      ),
    },
    {
      id: 'payment',
      accessorFn: (order) => order.payment?.status || '',
      header: t('merchant.table.orders.payment'),
      meta: { sortable: true, mobile: 'badge' },
      cell: ({ getValue }) => (
        <StatusPill tone={PAYMENT_TONE[getValue()] || 'neutral'}>{statusText('paymentStatus', getValue())}</StatusPill>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('merchant.p.actions')}</span>,
      meta: { label: t('merchant.p.actions'), align: 'right' },
      enableSorting: false,
      cell: ({ row }) => {
        const open = selectedId === row.original.id;
        return (
          <Button
            type="button"
            variant={open ? 'secondary' : 'outline'}
            size="sm"
            className="h-11 md:h-9"
            aria-expanded={open}
            onClick={() => toggle(row.original)}
          >
            {open ? t('merchant.table.orders.hide') : t('merchant.table.orders.view')}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </Button>
        );
      },
    },
  ], [t, formatDate, selectedId]);

  const detail = selected && (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {t('merchant.table.orders.order')} {selected.orderNumber || selected.id}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusPill tone={DELIVERY_TONE[selected.deliveryStatus] || 'neutral'}>
            {t('merchant.table.orders.delivery')} · {statusText('deliveryStatus', selected.deliveryStatus)}
          </StatusPill>
          <StatusPill tone={PAYMENT_TONE[selected.payment?.status] || 'neutral'}>
            {t('merchant.table.orders.payment')} · {statusText('paymentStatus', selected.payment?.status)}
          </StatusPill>
        </div>
      </div>

      <div className="grid gap-1.5 text-sm text-foreground">
        <p>Buyer: {selected.customerInfo?.name} · {selected.customerInfo?.phone}</p>
        <p>Address: {selected.shippingInfo?.address}</p>
        {selected.items.map((item) => (
          <p key={item.productId}>{item.quantity} × {item.name} · ${item.total}</p>
        ))}
        <p className="text-muted-foreground">Products: ${selected.subtotal} · Delivery: ${selected.deliveryFee}</p>
        <p className="font-semibold">Cash due: ${selected.totalAmount}</p>
        <p className="text-muted-foreground">
          Collected: ${selected.payment?.collectedAmount || '0.00'} · Refunded: ${selected.payment?.refundedAmount || '0.00'}
        </p>
      </div>

      {['pending', 'retrying'].includes(selected.deliveryStatus) && (
        <div className="space-y-4 border-t border-border pt-5">
          <Button type="button" disabled={busy} onClick={() => act('delivered')} className="h-10">
            <CheckCircle2 className="h-4 w-4" />
            {t('merchant.p.markDelivered')}
          </Button>

          <form onSubmit={(event) => { event.preventDefault(); act('delivery_failed', { reason, resolution }); }} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="failed-reason">{t('merchant.p.failedDeliveryReason')}</Label>
              <Input
                id="failed-reason"
                required
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5 w-fit">
              <Label>{t('merchant.p.nextStep')}</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className={`w-full h-9 ${fieldClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retry">{t('merchant.p.waitForBuyerApproved')}</SelectItem>
                  <SelectItem value="cancel">{t('merchant.p.cancelAndRestoreStock')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-fit border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
            >
              {t('merchant.p.recordFailedDelivery')}
            </Button>
          </form>
        </div>
      )}

      {selected.deliveryStatus === 'failed' && selected.status !== 'cancelled' && (
        <div className="space-y-3 border-t border-border pt-5">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={buyerAgreed} onCheckedChange={(value) => setBuyerAgreed(Boolean(value))} />
            {t('merchant.p.buyerAgreedToAnother')}
          </label>
          <Button
            type="button"
            disabled={busy || !buyerAgreed}
            onClick={() => act('retry_delivery', { buyerAgreed: true })}
            className="border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
          >
            <Undo2 className="h-4 w-4" />
            {t('merchant.p.retryDelivery')}
          </Button>
        </div>
      )}

      {selected.deliveryStatus === 'delivered' && selected.payment?.status === 'pending' && (
        <div className="border-t border-border pt-5">
          <Button type="button" disabled={busy} onClick={() => act('collect_cod', { amount: selected.totalAmount })} className="h-10">
            Confirm ${selected.totalAmount} cash collected
          </Button>
        </div>
      )}

      {selected.payment?.status === 'paid' && (
        <form onSubmit={(event) => { event.preventDefault(); act('confirm_refund', refund); }} className="grid gap-3 border-t border-border pt-5">
          <h4 className="text-sm font-semibold text-foreground">{t('merchant.p.recordDirectRefund')}</h4>
          <Input
            required
            type="number"
            min="0.01"
            max={Number(selected.payment.collectedAmount) - Number(selected.payment.refundedAmount)}
            step="0.01"
            placeholder={t('merchant.p.amountUsd')}
            value={refund.amount}
            onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
            className={fieldClass}
          />
          <Input
            required
            maxLength={80}
            placeholder={t('merchant.p.refundMethod')}
            value={refund.method}
            onChange={(event) => setRefund({ ...refund, method: event.target.value })}
            className={fieldClass}
          />
          <Input
            required
            maxLength={500}
            placeholder={t('merchant.p.confirmationReference')}
            value={refund.confirmation}
            onChange={(event) => setRefund({ ...refund, confirmation: event.target.value })}
            className={fieldClass}
          />
          <Button
            type="submit"
            disabled={busy}
            className="w-fit border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
          >
            {t('merchant.p.confirmRefund')}
          </Button>
        </form>
      )}

      <div className="border-t border-border pt-5">
        <h4 className="text-sm font-semibold text-foreground">{t('merchant.p.activity')}</h4>
        {!events.length && <p className="text-sm text-muted-foreground mt-2">{t('merchant.p.noActivityRecordedYet')}</p>}
        {events.map((event) => (
          <p key={event.id} className="mt-2 text-sm text-muted-foreground">
            {event.type.replaceAll('_', ' ')} · {new Date(event.createdAt).toLocaleString()}
            {event.details?.reason ? ` · ${event.details.reason}` : ''}
          </p>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{t('merchant.p.marketplaceOrders')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('merchant.p.buyersPayCashOn')}
            </p>
          </div>
          <Button
            type="button"
            disabled={!storeId || busy}
            onClick={() => load(storeId).catch((error) => setMessage(error.message))}
            className="h-11 border-transparent [box-shadow:var(--shadow-soft)] bg-card text-foreground hover:bg-muted/60"
          >
            <RefreshCw className="h-4 w-4" />
            {t('merchant.p.refresh')}
          </Button>
        </div>

        {message && (
          <p role="status" className="rounded-xl bg-primary/[0.06] px-4 py-3 text-sm text-primary">
            {message}
          </p>
        )}

        <DataTable
          title={t('merchant.table.orders.title')}
          ariaLabel={t('merchant.p.marketplaceOrders')}
          columns={columns}
          data={orders}
          isLoading={loading}
          isError={Boolean(loadError)}
          errorTitle={t('merchant.table.orders.loadError')}
          errorBody={loadError}
          onRetry={start}
          empty={{ icon: PackageSearch, title: t('merchant.p.noMarketplaceOrdersYet'), body: t('merchant.p.whenABuyerOrders') }}
          onRowClick={toggle}
          expandedRows={new Set(selectedId ? [selectedId] : [])}
          renderExpanded={() => detail}
          defaultPageSize={25}
        />
      </div>
    </div>
  );
}
