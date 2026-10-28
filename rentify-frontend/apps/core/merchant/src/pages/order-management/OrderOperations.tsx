import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ExternalLink, PackageCheck, RefreshCw, Search, ShoppingBag, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { Alert, AlertDescription, AlertTitle } from '@rentify/shared/ui/alert';
import { Badge } from '@rentify/shared/ui/badge';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Checkbox } from '@rentify/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@rentify/shared/ui/dialog';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Textarea } from '@rentify/shared/ui/textarea';
import { PageHeader } from '../../layouts/dashboard/PageHeader';
import { WorkspaceState } from '../../components/WorkspaceState';
import { useChannels } from '../../context/ChannelContext';
import { orderOperationsApi } from './orderOperationsApi';
import {
  actionLabel, actionRisk, channelLabel, eventLabel, loadStateFor, orderCopy, statusLabel,
  type MerchantOrder, type OrderAction, type OrderActionCode, type OrderFilters, type OrderLoadState,
} from './orderOperationsModel';

const initialFilters: OrderFilters = { search: '', channel: 'all', status: 'all', dateFrom: '', dateTo: '' };
const statusTone = (status: string): 'destructive' | 'default' | 'secondary' => status === 'cancelled' || status === 'failed' ? 'destructive'
  : status === 'completed' || status === 'fulfilled' || status === 'paid' ? 'default' : 'secondary';

export default function OrderOperations() {
  const { language } = useTranslation() as { language?: string };
  const text = orderCopy(language);
  const { store } = useChannels();
  const storeId = store?.storeId || store?.id;
  const { id: routeOrderId } = useParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [applied, setApplied] = useState<OrderFilters>(initialFilters);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [selected, setSelected] = useState<MerchantOrder | null>(null);
  const [state, setState] = useState<OrderLoadState>('loading');
  const [capped, setCapped] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!storeId) return;
    setState('loading'); setMessage('');
    try {
      const result = await orderOperationsApi.list(storeId, applied);
      setOrders(result.orders); setCapped(result.capped); setState(result.orders.length ? 'ready' : 'empty');
    } catch (error) { setState(loadStateFor(error)); }
  }, [applied, storeId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!storeId || !routeOrderId) { setSelected(null); return; }
    const inList = orders.find((order) => order.id === routeOrderId);
    if (inList) { setSelected(inList); return; }
    void orderOperationsApi.get(storeId, routeOrderId).then(setSelected).catch((error) => {
      setState(loadStateFor(error));
    });
  }, [orders, routeOrderId, storeId]);

  if (!storeId) return <WorkspaceState kind="empty" title={text.noStore} />;
  if (!['ready', 'empty'].includes(state)) {
    const titles = { loading: text.loading, forbidden: text.forbidden, timeout: text.timeout, offline: text.offline, error: text.error, conflict: text.conflict } as Record<string, string>;
    const descriptions = { forbidden: text.forbiddenBody, timeout: text.timeoutBody, offline: text.offlineBody, error: text.errorBody, conflict: text.conflictBody } as Record<string, string>;
    return <WorkspaceState kind={state as Exclude<OrderLoadState, 'ready'>} title={titles[state]} description={descriptions[state]} actionLabel={state === 'loading' || state === 'forbidden' ? undefined : text.retry} onAction={state === 'loading' || state === 'forbidden' ? undefined : load} />;
  }

  return (
    <div className="min-h-full">
      <PageHeader title={text.title} description={text.description} icon={ShoppingBag} breadcrumb={[{ label: text.title }]} />
      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 md:px-8" aria-label={text.title}>
        <form className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] md:grid-cols-2 xl:grid-cols-[minmax(14rem,2fr)_repeat(4,minmax(9rem,1fr))_auto]" onSubmit={(event) => { event.preventDefault(); setApplied(filters); }}>
          <FilterField label={text.search} icon={<Search className="h-4 w-4" aria-hidden="true" />}>{(id) => <Input id={id} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} maxLength={100} />}</FilterField>
          <NativeSelect label={text.channel} value={filters.channel} onChange={(value) => setFilters({ ...filters, channel: value })} options={[['all', text.allChannels], ['marketplace', text.marketplace], ['storefront', text.storefront], ['pos', text.pos], ['invoice', text.invoice]]} />
          <NativeSelect label={text.status} value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={[['all', text.allStatuses], ...['pending', 'confirmed', 'processing', 'fulfilled', 'completed', 'cancelled', 'refunded'].map((status) => [status, statusLabel(status, language)])]} />
          <FilterField label={text.from} icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}>{(id) => <Input id={id} type="date" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />}</FilterField>
          <FilterField label={text.to} icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}>{(id) => <Input id={id} type="date" min={filters.dateFrom || undefined} value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />}</FilterField>
          <div className="flex items-end gap-2"><Button type="submit">{text.apply}</Button><Button type="button" variant="outline" onClick={() => { setFilters(initialFilters); setApplied(initialFilters); }}>{text.clear}</Button></div>
        </form>

        {capped && <Alert><AlertTitle>{text.attention}</AlertTitle><AlertDescription>{text.capped}</AlertDescription></Alert>}
        {message && <Alert role="status"><AlertTitle>{text.attention}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}

        {state === 'empty' ? <WorkspaceState kind="empty" title={text.empty} description={text.emptyBody} /> : (
          <OrderList orders={orders} language={language} text={text} onOpen={(order) => navigate(`/orders/${order.id}`)} />
        )}
        {selected && <OrderDetail order={selected} storeId={storeId} language={language} text={text} onClose={() => navigate('/orders')} onChanged={(order) => { setSelected(order); setOrders((current) => current.map((item) => item.id === order.id ? order : item)); setMessage(text.actionSuccess); }} onError={(error) => { const next = loadStateFor(error); setMessage(next === 'conflict' ? text.conflictBody : next === 'timeout' ? text.timeoutBody : text.errorBody); if (next === 'conflict') void orderOperationsApi.get(storeId, selected.id).then(setSelected); }} />}
      </main>
    </div>
  );
}

function FilterField({ label, icon, children }: { label: string; icon: React.ReactNode; children: (id: string) => React.ReactNode }) {
  const id = `filter-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return <div className="space-y-1.5"><Label htmlFor={id} className="flex items-center gap-1.5">{icon}{label}</Label>{children(id)}</div>;
}

function NativeSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  const id = `filter-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></div>;
}

function OrderList({ orders, language, text, onOpen }: { orders: MerchantOrder[]; language?: string; text: ReturnType<typeof orderCopy>; onOpen: (order: MerchantOrder) => void }) {
  return <section aria-label={text.title}>
    <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] md:block"><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-muted-foreground"><tr>{[text.order, text.customer, text.payment, text.fulfillment, text.total, text.date, ''].map((heading, index) => <th key={`${heading}-${index}`} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{orders.map((order) => <tr key={order.id} className="hover:bg-muted/30"><td className="px-4 py-4"><button className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onOpen(order)}>{order.orderNumber}</button><Badge variant="outline" className="ml-2">{channelLabel(order.channel, language)}</Badge></td><td className="px-4 py-4"><span className="block font-medium">{order.buyer.name}</span><span className="text-xs text-muted-foreground">{order.buyer.phone || order.buyer.email || '—'}</span></td><td className="px-4 py-4"><Badge variant={statusTone(order.payment.status)}>{statusLabel(order.payment.status, language)}</Badge><span className="mt-1 block text-xs text-muted-foreground">{text.amountDue}: {money(order.payment.amountDue, order.currency, language)}</span></td><td className="px-4 py-4"><Badge variant={statusTone(order.fulfillmentStatus)}>{statusLabel(order.fulfillmentStatus, language)}</Badge></td><td className="px-4 py-4 font-semibold">{money(order.totals.total, order.currency, language)}</td><td className="px-4 py-4 text-muted-foreground">{date(order.createdAt, language)}</td><td className="px-4 py-4"><Button variant="ghost" size="sm" onClick={() => onOpen(order)}>{text.view}</Button></td></tr>)}</tbody></table></div>
    <ul className="space-y-3 md:hidden">{orders.map((order) => <li key={order.id}><button type="button" onClick={() => onOpen(order)} className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex flex-wrap items-center justify-between gap-2"><strong>{order.orderNumber}</strong><Badge variant="outline">{channelLabel(order.channel, language)}</Badge></span><span className="mt-3 grid grid-cols-2 gap-3 text-sm"><span><small className="block text-muted-foreground">{text.customer}</small>{order.buyer.name}</span><span><small className="block text-muted-foreground">{text.total}</small>{money(order.totals.total, order.currency, language)}</span><span><small className="block text-muted-foreground">{text.payment}</small>{statusLabel(order.payment.status, language)}</span><span><small className="block text-muted-foreground">{text.fulfillment}</small>{statusLabel(order.fulfillmentStatus, language)}</span></span></button></li>)}</ul>
  </section>;
}

function OrderDetail({ order, storeId, language, text, onClose, onChanged, onError }: { order: MerchantOrder; storeId: string; language?: string; text: ReturnType<typeof orderCopy>; onClose: () => void; onChanged: (order: MerchantOrder) => void; onError: (error: unknown) => void }) {
  const [action, setAction] = useState<OrderAction | null>(null);
  const [busy, setBusy] = useState(false);
  return <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]" aria-labelledby="order-detail-heading"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5"><div><p className="text-sm text-muted-foreground">{channelLabel(order.channel, language)}</p><h2 id="order-detail-heading" className="text-xl font-semibold">{text.details}: {order.orderNumber}</h2></div><Button variant="ghost" onClick={onClose}><X className="mr-2 h-4 w-4" aria-hidden="true" />{text.close}</Button></div>
    <div className="grid gap-5 p-5 xl:grid-cols-3"><div className="space-y-5 xl:col-span-2"><Card><CardHeader><CardTitle>{text.items}</CardTitle></CardHeader><CardContent><ul className="divide-y divide-border">{order.items.map((item) => <li key={item.id} className="grid grid-cols-[1fr_auto] gap-3 py-3"><span><strong className="block">{item.name}</strong><small className="text-muted-foreground">{[item.sku, item.variantName].filter(Boolean).join(' · ') || '—'} · ×{item.quantity}</small></span><span className="font-medium">{money(item.lineTotal, item.currency, language)}</span></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>{text.timeline}</CardTitle></CardHeader><CardContent>{order.timeline.length ? <ol className="border-l border-border pl-5">{order.timeline.map((event) => <li key={event.id} className="relative pb-4"><span className="absolute -left-[1.45rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" /><strong className="block text-sm">{eventLabel(event.type, language)}</strong><span className="text-xs text-muted-foreground">{dateTime(event.createdAt, language)}</span>{event.details.reason && <p className="mt-1 text-sm">{event.details.reason}</p>}{event.details.evidenceCount > 0 && <p className="text-xs text-muted-foreground">{text.evidence}: {event.details.evidenceCount}</p>}</li>)}</ol> : <p className="text-sm text-muted-foreground">{text.noEvents}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{text.reports}</CardTitle></CardHeader><CardContent>{order.reports.length ? order.reports.map((report) => <div key={report.id} className="rounded-xl bg-muted p-3 text-sm"><strong>{eventLabel(report.type, language)}</strong><p>{report.details.reason}</p><small>{text.evidence}: {report.details.evidenceCount}</small></div>) : <p className="text-sm text-muted-foreground">{text.noReports}</p>}</CardContent></Card></div>
      <aside className="space-y-5"><Card><CardHeader><CardTitle>{text.payment}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Fact label={text.paymentMethod} value={order.payment.method || '—'} /><Fact label={text.amountDue} value={money(order.payment.amountDue, order.currency, language)} /><Fact label={text.collected} value={money(order.payment.collectedAmount, order.currency, language)} /><Fact label={text.refunded} value={money(order.payment.refundedAmount, order.currency, language)} />{order.invoice && <Button variant="outline" className="mt-3 w-full" onClick={() => void orderOperationsApi.openDocument(order.invoice!.documentPath).catch(onError)}><ExternalLink className="mr-2 h-4 w-4" />{order.channel === 'pos' ? text.receiptLink : text.invoiceLink}</Button>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{text.contact}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="font-medium">{order.buyer.name}</p><p>{order.buyer.phone || '—'}</p><p>{order.buyer.email || '—'}</p>{order.delivery.minimized && <p className="text-xs text-muted-foreground">{text.minimized}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{text.delivery}</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>{[order.delivery.street, order.delivery.commune, order.delivery.district, order.delivery.province].filter(Boolean).join(', ') || '—'}</p>{order.delivery.note && <p className="text-muted-foreground">{order.delivery.note}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>{text.actions}</CardTitle></CardHeader><CardContent className="space-y-2">{order.allowedActions.length ? order.allowedActions.map((item) => <Button key={item.code} variant={item.risk === 'high' ? 'outline' : 'default'} className="w-full justify-start" onClick={() => setAction(item)}><PackageCheck className="mr-2 h-4 w-4" />{actionLabel(item.code, language)}</Button>) : <p className="text-sm text-muted-foreground">{text.noActions}</p>}</CardContent></Card></aside></div>
    <ActionDialog open={Boolean(action)} action={action} order={order} text={text} language={language} busy={busy} onClose={() => setAction(null)} onSubmit={async (code, details, key) => { setBusy(true); try { onChanged(await orderOperationsApi.act(storeId, order, code, details, key)); setAction(null); } catch (error) { onError(error); } finally { setBusy(false); } }} />
  </section>;
}

function ActionDialog({ open, action, order, text, language, busy, onClose, onSubmit }: { open: boolean; action: OrderAction | null; order: MerchantOrder; text: ReturnType<typeof orderCopy>; language?: string; busy: boolean; onClose: () => void; onSubmit: (code: OrderActionCode, details: Record<string, unknown>, key: string) => Promise<void> }) {
  const refundable = Math.max(0, Number(order.payment.collectedAmount) - Number(order.payment.refundedAmount)).toFixed(2);
  const [reason, setReason] = useState(''); const [resolution, setResolution] = useState('retry'); const [buyerAgreed, setBuyerAgreed] = useState(false); const [refundAmount, setRefundAmount] = useState(refundable); const [method, setMethod] = useState(''); const [confirmation, setConfirmation] = useState(''); const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!open) return;
    key.current = crypto.randomUUID();
    setReason(''); setResolution('retry'); setBuyerAgreed(false);
    setRefundAmount(refundable); setMethod(''); setConfirmation('');
  }, [open, action?.code, refundable]);
  if (!action) return null;
  const submit = (event: FormEvent) => { event.preventDefault(); const details: Record<string, unknown> = {};
    if (action.code === 'delivery_failed') Object.assign(details, { reason, resolution });
    if (action.code === 'retry_delivery') details.buyerAgreed = buyerAgreed;
    if (action.code === 'collect_cod') details.amount = order.payment.amountDue;
    if (action.code === 'confirm_refund') Object.assign(details, { amount: refundAmount, method, confirmation });
    void onSubmit(action.code, details, key.current);
  };
  const disabled = busy || (action.code === 'delivery_failed' && !reason.trim()) || (action.code === 'retry_delivery' && !buyerAgreed) || (action.code === 'confirm_refund' && (!method.trim() || !confirmation.trim() || Number(refundAmount) <= 0 || Number(refundAmount) > Number(refundable)));
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent><form onSubmit={submit} className="space-y-4"><DialogHeader><DialogTitle>{text.actionTitle}</DialogTitle><DialogDescription>{actionRisk(action.code, language)}</DialogDescription></DialogHeader>
    {action.code === 'delivery_failed' && <><div className="space-y-1.5"><Label htmlFor="order-action-reason">{text.reason}</Label><Textarea id="order-action-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></div><NativeSelect label={text.resolution} value={resolution} onChange={setResolution} options={[["retry", text.retryDelivery], ["cancel", text.cancelOrder]]} /></>}
    {action.code === 'retry_delivery' && <label className="flex items-start gap-3 text-sm"><Checkbox checked={buyerAgreed} onCheckedChange={(value) => setBuyerAgreed(Boolean(value))} /><span>{text.buyerAgreed}</span></label>}
    {action.code === 'collect_cod' && <Fact label={text.amount} value={money(order.payment.amountDue, order.currency, language)} />}
    {action.code === 'confirm_refund' && <><div className="space-y-1.5"><Label htmlFor="refund-amount">{text.amount}</Label><Input id="refund-amount" required type="number" min="0.01" max={refundable} step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="refund-method">{text.method}</Label><Input id="refund-method" required maxLength={80} value={method} onChange={(event) => setMethod(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="refund-confirmation">{text.confirmation}</Label><Textarea id="refund-confirmation" required maxLength={500} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div></>}
    <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{text.cancel}</Button><Button type="submit" disabled={disabled}>{busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}{text.confirm}</Button></DialogFooter></form></DialogContent></Dialog>;
}

const Fact = ({ label, value }: { label: string; value: string }) => <p className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value}</strong></p>;
const money = (value: string, currency: string, language?: string) => new Intl.NumberFormat(language === 'kh' ? 'km-KH' : 'en-US', { style: 'currency', currency }).format(Number(value || 0));
const date = (value: string, language?: string) => new Intl.DateTimeFormat(language === 'kh' ? 'km-KH' : 'en-US', { dateStyle: 'medium' }).format(new Date(value));
const dateTime = (value: string, language?: string) => new Intl.DateTimeFormat(language === 'kh' ? 'km-KH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
