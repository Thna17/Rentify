import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { toast } from 'sonner';
import { AlertCircle, MapPin, Phone, Send } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Checkbox } from '@rentify/shared/ui/checkbox';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { StatusPill } from '../../components/data-table/StatusPill';
import { PageShell, PageTitle, Panel, StatePanel } from '../../components/page/PagePrimitives';
import { RecordCashSheet } from './components/RecordCashSheet';
import { PaymentPill } from './components/PaymentPill';
import { actionErrorKey, confirmOnlineOrder, markOnlineOrderDelivered, runDeliveryAction, type DeliveryAction } from './orderActions';
import { money, onlineAction, orderLabel, paymentKind, workTab } from './orderModel';

type Sheet = null | 'cash' | 'failed' | 'retry' | 'refund';

const EVENT_KEYS = new Set([
  'order_created', 'delivered', 'delivery_failed', 'retry_delivery', 'collect_cod', 'confirm_refund',
  'return_requested', 'complaint', 'merchant_report', 'cancelled', 'confirmed', 'completed',
]);

/** One order, its next step and the actions Commerce allows on it (redesign M4, M4b, M5). */
export function OrderDetailView() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { store } = useChannels();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'missing' | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  const load = useCallback(async () => {
    if (!store?.id || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders/${id}`, { credentials: 'include' });
      if (res.status === 404) {
        setError('missing');
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setOrder(data?.order || null);
      if (!data?.order) setError('missing');
    } catch {
      setError('failed');
    } finally {
      setLoading(false);
    }
  }, [store?.id, id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (call: () => Promise<unknown>, doneKey: string) => {
    setBusy(true);
    try {
      await call();
      setSheet(null);
      toast.success(t(doneKey));
    } catch (err) {
      toast.error(t(actionErrorKey(err)));
    } finally {
      setBusy(false);
      await load();
    }
  };
  const deliveryAction = (action: DeliveryAction, details: Record<string, unknown>, doneKey: string) =>
    run(() => runDeliveryAction(store!.id, order, action, details), doneKey);

  const back = { to: '/orders', label: t('merchant.orders.title') };

  if (loading && !order) {
    return (
      <PageShell width="narrow">
        <Skeleton className="h-10 w-48 rounded-xl" />
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </PageShell>
    );
  }

  if (error || !order) {
    return (
      <PageShell width="narrow">
        <PageTitle back={back} title={t('merchant.orders.detail.title')} />
        <StatePanel
          tone="error"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t(error === 'missing' ? 'merchant.orders.detail.missing' : 'merchant.orders.loadError')}
          body={error === 'missing' ? t('merchant.orders.detail.missingBody') : t('merchant.orders.loadErrorBody')}
          action={
            error === 'missing' ? (
              <Button asChild variant="outline" className="min-h-[44px] rounded-xl"><Link to="/orders">{back.label}</Link></Button>
            ) : (
              <Button variant="outline" onClick={load} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>
            )
          }
        />
      </PageShell>
    );
  }

  const codes = new Set<string>((order.allowedActions || []).map((a: any) => a.code));
  const kind = paymentKind(order);
  const state = workTab(order);
  const total = money(order.totals?.total, order.currency);
  const phone: string = order.buyer?.phone || '';
  const digits = phone.replace(/[^0-9]/g, '');
  const telegramPhone = digits.startsWith('855') ? digits : `855${digits.replace(/^0/, '')}`;
  const address = [order.delivery?.street, order.delivery?.commune, order.delivery?.district, order.delivery?.province]
    .filter(Boolean)
    .join(', ');
  const failure = (order.timeline || []).filter((e: any) => e.type === 'delivery_failed').pop();
  const nextStep = state === 'problems' && failure
    ? t('merchant.orders.next.failed', { reason: failure.details?.reason || '' })
    : onlineAction(order) === 'confirm'
      ? t('merchant.orders.next.confirmOnline')
      : t(`merchant.orders.next.${state}`, { amount: money(order.payment?.amountDue, order.currency) });

  const primary: ReactNode[] = [];
  if (codes.has('collect_cod')) {
    primary.push(
      <Button key="cash" disabled={busy} onClick={() => setSheet('cash')} className="min-h-[48px] flex-1 rounded-xl sm:flex-none">
        {t('merchant.orders.actions.recordCashAmount', { amount: money(order.payment?.amountDue, order.currency) })}
      </Button>,
    );
  }
  if (codes.has('delivered')) {
    primary.push(
      <Button
        key="delivered"
        disabled={busy}
        onClick={() => deliveryAction('delivered', {}, 'merchant.orders.done.delivered')}
        className="min-h-[48px] flex-1 rounded-xl sm:flex-none"
      >
        {t('merchant.orders.actions.markDelivered')}
      </Button>,
    );
  }
  const online = onlineAction(order);
  if (online) {
    primary.push(
      <Button
        key="online"
        disabled={busy}
        onClick={() =>
          online === 'confirm'
            ? run(() => confirmOnlineOrder(order), 'merchant.orders.done.confirmed')
            : run(() => markOnlineOrderDelivered(order), 'merchant.orders.done.delivered')
        }
        className="min-h-[48px] flex-1 rounded-xl sm:flex-none"
      >
        {t(online === 'confirm' ? 'merchant.orders.actions.confirm' : 'merchant.orders.actions.markDelivered')}
      </Button>,
    );
  }
  if (codes.has('retry_delivery')) {
    primary.push(
      <Button key="retry" disabled={busy} onClick={() => setSheet('retry')} className="min-h-[48px] flex-1 rounded-xl sm:flex-none">
        {t('merchant.orders.actions.retryDelivery')}
      </Button>,
    );
  }
  const secondary: ReactNode[] = [];
  if (codes.has('delivery_failed')) {
    secondary.push(
      <Button key="failed" variant="outline" disabled={busy} onClick={() => setSheet('failed')} className="min-h-[48px] rounded-xl">
        {t('merchant.orders.actions.deliveryProblem')}
      </Button>,
    );
  }
  if (codes.has('confirm_refund')) {
    secondary.push(
      <Button key="refund" variant="outline" disabled={busy} onClick={() => setSheet('refund')} className="min-h-[48px] rounded-xl">
        {t('merchant.orders.actions.recordRefund')}
      </Button>,
    );
  }

  return (
    <PageShell width="narrow">
      <div className="space-y-5">
        <PageTitle
          back={back}
          title={orderLabel(order)}
          actions={<StatusPill tone="neutral">{t(`merchant.orders.channels.${order.channel}`)}</StatusPill>}
        />
        <p className="-mt-3 text-sm text-muted-foreground">
          {t('merchant.orders.detail.placed', { date: new Date(order.createdAt).toLocaleString() })}
        </p>

        <Panel className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">{t('merchant.orders.detail.payment')}</h2>
            <PaymentPill order={order} />
          </div>
          <p className="text-sm text-muted-foreground">{t(`merchant.orders.paymentDetail.${kind}`, { amount: total })}</p>
          {kind === 'online_paid' && (
            <p className="text-sm text-muted-foreground">
              {t('merchant.orders.detail.noRefunds')}{' '}
              <Link to="/help" className="font-semibold text-foreground underline">{t('merchant.orders.detail.getHelp')}</Link>
            </p>
          )}
        </Panel>

        <Panel className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">{t('merchant.orders.detail.next')}</h2>
          <p className="text-sm text-muted-foreground">{nextStep}</p>
        </Panel>

        <Panel className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t('merchant.orders.detail.buyer')}</h2>
          <div>
            <p className="font-semibold text-foreground">{order.buyer?.name || t('merchant.orders.buyerUnknown')}</p>
            {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
            {address && (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {address}
              </p>
            )}
            {order.delivery?.note && <p className="mt-1 text-sm text-muted-foreground">{order.delivery.note}</p>}
          </div>
          {phone && !phone.includes('*') && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
                <a href={`tel:${phone}`}><Phone className="h-4 w-4" aria-hidden="true" />{t('merchant.orders.detail.call')}</a>
              </Button>
              <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
                <a href={`https://t.me/+${telegramPhone}`} target="_blank" rel="noreferrer">
                  <Send className="h-4 w-4" aria-hidden="true" />Telegram
                </a>
              </Button>
            </div>
          )}
        </Panel>

        <Panel className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t('merchant.orders.detail.items')}</h2>
          <ul className="divide-y divide-border">
            {(order.items || []).map((item: any) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  {item.variantName && <p className="text-muted-foreground">{item.variantName}</p>}
                  <p className="text-muted-foreground">{item.quantity} × {money(item.unitPrice, item.currency)}</p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{money(item.lineTotal, item.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>{t('merchant.orders.detail.deliveryFee')}</dt>
              <dd className="tabular-nums">{money(order.totals?.shipping, order.currency)}</dd>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <dt>{t('merchant.orders.detail.total')}</dt>
              <dd className="tabular-nums">{total}</dd>
            </div>
          </dl>
        </Panel>

        {order.reports?.length > 0 && (
          <Panel className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">{t('merchant.orders.detail.reports')}</h2>
            <ul className="space-y-2 text-sm">
              {order.reports.map((report: any) => (
                <li key={report.id} className="text-foreground">
                  <span className="font-semibold">{t(`merchant.orders.events.${report.type}`)}</span>
                  <span className="text-muted-foreground"> · {new Date(report.createdAt).toLocaleString()}</span>
                  {report.details?.reason && <p className="text-muted-foreground">{report.details.reason}</p>}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {order.timeline?.length > 0 && (
          <Panel className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">{t('merchant.orders.detail.history')}</h2>
            <ol className="space-y-2 text-sm">
              {order.timeline.map((event: any) => (
                <li key={event.id} className="flex flex-wrap gap-x-2">
                  <span className="font-semibold text-foreground">
                    {EVENT_KEYS.has(event.type) ? t(`merchant.orders.events.${event.type}`) : event.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>

      {(primary.length > 0 || secondary.length > 0) && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 md:justify-end">
            {secondary}
            {primary}
          </div>
        </div>
      )}

      <RecordCashSheet
        open={sheet === 'cash'}
        onOpenChange={(open) => setSheet(open ? 'cash' : null)}
        order={order}
        onConfirm={() => deliveryAction('collect_cod', { amount: order.payment?.amountDue }, 'merchant.orders.done.cashRecorded')}
      />
      <FailedDeliverySheet
        open={sheet === 'failed'}
        busy={busy}
        onOpenChange={(open) => setSheet(open ? 'failed' : null)}
        onSubmit={(reason, resolution) => deliveryAction('delivery_failed', { reason, resolution }, 'merchant.orders.done.failed')}
      />
      <RetrySheet
        open={sheet === 'retry'}
        busy={busy}
        onOpenChange={(open) => setSheet(open ? 'retry' : null)}
        onSubmit={() => deliveryAction('retry_delivery', { buyerAgreed: true }, 'merchant.orders.done.retry')}
      />
      <RefundSheet
        open={sheet === 'refund'}
        busy={busy}
        max={Number(order.payment?.collectedAmount || 0) - Number(order.payment?.refundedAmount || 0)}
        onOpenChange={(open) => setSheet(open ? 'refund' : null)}
        onSubmit={(details) => deliveryAction('confirm_refund', details, 'merchant.orders.done.refund')}
      />
    </PageShell>
  );
}

function ActionDialog({
  open,
  onOpenChange,
  title,
  body,
  children,
  submitLabel,
  busy,
  canSubmit,
  onSubmit,
  destructive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  children?: ReactNode;
  submitLabel: string;
  busy: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  destructive?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6 sm:max-w-md">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) onSubmit();
          }}
        >
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
            <DialogDescription>{body}</DialogDescription>
          </DialogHeader>
          {children}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="min-h-[44px] rounded-xl">
              {t('merchant.common.cancel')}
            </Button>
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'default'}
              disabled={busy || !canSubmit}
              className="min-h-[44px] rounded-xl"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FailedDeliverySheet({ open, busy, onOpenChange, onSubmit }: {
  open: boolean; busy: boolean; onOpenChange: (open: boolean) => void; onSubmit: (reason: string, resolution: 'retry' | 'cancel') => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState<'retry' | 'cancel'>('retry');
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('merchant.orders.failed.title')}
      body={t('merchant.orders.failed.body')}
      submitLabel={t(resolution === 'cancel' ? 'merchant.orders.failed.submitCancel' : 'merchant.orders.failed.submit')}
      destructive={resolution === 'cancel'}
      busy={busy}
      canSubmit={reason.trim().length > 0}
      onSubmit={() => onSubmit(reason.trim(), resolution)}
    >
      <div className="space-y-1.5">
        <Label htmlFor="failed-reason">{t('merchant.orders.failed.reason')}</Label>
        <Input id="failed-reason" required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 rounded-xl" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">{t('merchant.orders.failed.next')}</legend>
        {(['retry', 'cancel'] as const).map((value) => (
          <label key={value} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input
              type="radio"
              name="failed-resolution"
              value={value}
              checked={resolution === value}
              onChange={() => setResolution(value)}
              className="mt-1 h-4 w-4 accent-[var(--rentify-color-brand-primary)]"
            />
            <span className="text-sm">
              <span className="block font-semibold text-foreground">{t(`merchant.orders.failed.${value}`)}</span>
              <span className="text-muted-foreground">{t(`merchant.orders.failed.${value}Body`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </ActionDialog>
  );
}

function RetrySheet({ open, busy, onOpenChange, onSubmit }: {
  open: boolean; busy: boolean; onOpenChange: (open: boolean) => void; onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('merchant.orders.retry.title')}
      body={t('merchant.orders.retry.body')}
      submitLabel={t('merchant.orders.actions.retryDelivery')}
      busy={busy}
      canSubmit={agreed}
      onSubmit={onSubmit}
    >
      <label className="flex min-h-[44px] items-center gap-3 text-sm text-foreground">
        <Checkbox checked={agreed} onCheckedChange={(value) => setAgreed(Boolean(value))} />
        {t('merchant.orders.retry.agreed')}
      </label>
    </ActionDialog>
  );
}

function RefundSheet({ open, busy, max, onOpenChange, onSubmit }: {
  open: boolean; busy: boolean; max: number; onOpenChange: (open: boolean) => void;
  onSubmit: (details: { amount: string; method: string; confirmation: string }) => void;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const value = Number(amount);
  const valid = value > 0 && value <= max && method.trim() && confirmation.trim();
  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('merchant.orders.refund.title')}
      body={t('merchant.orders.refund.body', { max: money(max) })}
      submitLabel={t('merchant.orders.refund.submit')}
      busy={busy}
      canSubmit={Boolean(valid)}
      onSubmit={() => onSubmit({ amount: value.toFixed(2), method: method.trim(), confirmation: confirmation.trim() })}
    >
      <div className="space-y-1.5">
        <Label htmlFor="refund-amount">{t('merchant.orders.refund.amount')}</Label>
        <Input id="refund-amount" type="number" inputMode="decimal" min="0.01" max={max} step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refund-method">{t('merchant.orders.refund.method')}</Label>
        <Input id="refund-method" maxLength={80} value={method} onChange={(e) => setMethod(e.target.value)} className="h-11 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refund-confirmation">{t('merchant.orders.refund.confirmation')}</Label>
        <Input id="refund-confirmation" maxLength={500} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="h-11 rounded-xl" />
      </div>
    </ActionDialog>
  );
}

export default OrderDetailView;
