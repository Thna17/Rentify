import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { useChannelOrders } from '../../hooks/useChannelOrders';
import { StatusPill } from '../../components/data-table/StatusPill';
import { PageShell, PageTitle, StatePanel } from '../../components/page/PagePrimitives';
import { orderLabel, workTab } from '../order-management/orderModel';

/**
 * Returns & problems (redesign M6): orders with a buyer report (return request, complaint) or a
 * failed delivery, from the order projection Commerce already returns. Store-level case handling
 * with response deadlines (DEC-009) needs a buyer-report endpoint per Store; until then each item
 * opens its order.
 */
export function ReturnsPage() {
  const { t } = useTranslation();
  const { orders, loading, error, reload } = useChannelOrders('all', 'all');
  const problems = useMemo(() => orders.filter((order) => workTab(order) === 'problems'), [orders]);

  return (
    <PageShell width="medium">
      <PageTitle title={t('merchant.returns.title')} description={t('merchant.returns.subtitle')} />

      {loading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <StatePanel
          tone="error"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('merchant.orders.loadError')}
          body={t('merchant.orders.loadErrorBody')}
          action={<Button variant="outline" onClick={reload} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>}
        />
      ) : problems.length === 0 ? (
        <StatePanel icon={<CheckCircle2 className="h-5 w-5" />} title={t('merchant.returns.empty')} body={t('merchant.returns.emptyBody')} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          {problems.map((order) => {
            const latest = order.reports[order.reports.length - 1];
            const type = latest?.type || 'delivery_failed';
            return (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="flex min-h-[64px] items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <span className="min-w-0 space-y-1">
                    <StatusPill tone={type === 'delivery_failed' ? 'warning' : 'danger'}>{t(`merchant.orders.events.${type}`)}</StatusPill>
                    <span className="block truncate text-sm font-semibold text-foreground">{orderLabel(order)}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {order.buyer?.name || t('merchant.orders.buyerUnknown')}
                      {latest?.createdAt ? ` · ${new Date(latest.createdAt).toLocaleDateString()}` : ''}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        {t('merchant.returns.policy')}{' '}
        <Link to="/help" className="font-semibold text-foreground underline">{t('merchant.orders.detail.getHelp')}</Link>
      </p>
    </PageShell>
  );
}

export default ReturnsPage;
