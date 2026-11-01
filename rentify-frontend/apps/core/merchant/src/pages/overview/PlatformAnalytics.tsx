import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { ChannelBadge, Kpi, SectionTitle, Surface } from './Overview';
import { useChannelOrders } from '../../hooks/useChannelOrders';
import { FilterChips, PageShell, PageTitle, StatePanel, TabBar } from '../../components/page/PagePrimitives';
import { money, paymentKind } from '../order-management/orderModel';
import { RevenueChart } from './components/RevenueChart';

type Period = '7d' | '30d' | '90d' | 'all';
type ReportTab = 'sales' | 'products' | 'channels' | 'payments';

const PERIODS: Period[] = ['7d', '30d', '90d', 'all'];
const TABS: ReportTab[] = ['sales', 'products', 'channels', 'payments'];
/** Commerce returns a Store's latest 250 orders (orderOperationsService.listStoreOrders). */
const ORDER_LIMIT = 250;

const num = (value: unknown) => Number(value || 0);

/** Reports (redesign M13): sales, products, channels and how buyers paid, from recorded orders. */
export default function PlatformAnalytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('30d');
  const [tab, setTab] = useState<ReportTab>('sales');
  const { orders, loading, error, summary, reload } = useChannelOrders(period);
  const periodLabel = t(`merchant.reports.periods.${period}`);

  const channels = useMemo(
    () =>
      summary.byChannel.map((row) => {
        const list = orders.filter((o) => o.channel === row.channel && o.status !== 'cancelled');
        const refunded = list.reduce((sum, o) => sum + num(o.payment.refundedAmount), 0);
        return { ...row, average: row.orders ? row.sales / row.orders : 0, refunded };
      }),
    [summary.byChannel, orders],
  );

  const payments = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'cancelled');
    const group = (kinds: string[], amount: (o: any) => number) => {
      const list = live.filter((o) => kinds.includes(paymentKind(o)));
      return { count: list.length, total: list.reduce((sum, o) => sum + amount(o), 0) };
    };
    const rows: { id: string; count: number; total: number; link?: string }[] = [
      { id: 'khqr', ...group(['online_paid'], (o) => num(o.payment.amount)) },
      { id: 'cashCollected', ...group(['cod_collected', 'cod_refunded'], (o) => num(o.payment.collectedAmount)) },
      { id: 'cashCounter', ...group(['cash_paid', 'paid'], (o) => num(o.payment.amount)) },
      { id: 'cashToCollect', ...group(['cod_due'], (o) => num(o.payment.amountDue)), link: '/orders?tab=cash' },
      { id: 'waiting', ...group(['online_waiting', 'unpaid'], (o) => num(o.payment.amountDue || o.payment.amount)), link: '/orders?tab=waiting' },
    ];
    return rows;
  }, [orders]);

  return (
    <PageShell>
      <PageTitle title={t('merchant.reports.title')} description={t('merchant.reports.subtitle')} />

      <FilterChips
        label={t('merchant.reports.period')}
        items={PERIODS.map((id) => ({ id, label: t(`merchant.reports.periods.${id}`) }))}
        value={period}
        onChange={setPeriod}
      />
      <TabBar
        label={t('merchant.reports.title')}
        items={TABS.map((id) => ({ id, label: t(`merchant.reports.tabs.${id}`) }))}
        value={tab}
        onChange={setTab}
      />

      {!loading && !error && orders.length >= ORDER_LIMIT && (
        <p className="text-sm text-muted-foreground">{t('merchant.reports.limited', { count: ORDER_LIMIT })}</p>
      )}

      {error ? (
        <StatePanel
          tone="error"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('merchant.reports.loadError')}
          body={t('merchant.orders.loadErrorBody')}
          action={<Button variant="outline" onClick={reload} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label={t('merchant.reports.kpi.sales')} value={money(summary.sales)} sub={periodLabel} loading={loading} />
            <Kpi label={t('merchant.reports.kpi.orders')} value={String(summary.orderCount)} sub={t('merchant.reports.kpi.ordersSub')} loading={loading} />
            <Kpi label={t('merchant.reports.kpi.average')} value={money(summary.averageOrder)} sub={t('merchant.reports.kpi.averageSub')} loading={loading} />
            <Kpi label={t('merchant.reports.kpi.refunded')} value={money(summary.refunded)} sub={t('merchant.reports.kpi.refundedSub')} loading={loading} />
          </div>

          {tab === 'sales' && (
            <Surface>
              <SectionTitle title={t('merchant.reports.salesByDay')} meta={periodLabel} />
              <RevenueChart data={summary.trend} dateRange={summary.dateRange} isLoading={loading} />
            </Surface>
          )}

          {(tab === 'sales' || tab === 'products') && (
            <Surface>
              <SectionTitle title={t('merchant.reports.bestSellers')} meta={periodLabel} />
              {summary.topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('merchant.reports.noSales')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {summary.topProducts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                        <span className="text-sm text-muted-foreground">{t('merchant.reports.sold', { count: p.unitsSold })}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{money(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          )}

          {tab === 'channels' && (
            <Surface>
              <SectionTitle title={t('merchant.reports.byChannel')} meta={periodLabel} />
              {channels.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('merchant.reports.noSales')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {channels.map((row) => (
                    <li key={row.channel} className="space-y-1 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <ChannelBadge channel={row.channel} />
                        <span className="text-sm font-semibold tabular-nums text-foreground">{money(row.sales)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('merchant.reports.channelLine', { orders: row.orders, average: money(row.average), refunded: money(row.refunded) })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          )}

          {(tab === 'sales' || tab === 'payments') && (
            <Surface>
              <SectionTitle title={t('merchant.reports.howPaid')} meta={periodLabel} />
              <ul className="divide-y divide-border">
                {payments.map((row) => {
                  const body = (
                    <>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{t(`merchant.reports.payments.${row.id}`)}</span>
                        <span className="text-sm text-muted-foreground">{t('merchant.reports.orderCount', { count: row.count })}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
                        {money(row.total)}
                        {row.link && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                      </span>
                    </>
                  );
                  return (
                    <li key={row.id}>
                      {row.link ? (
                        <Link to={row.link} className="flex min-h-[56px] items-center justify-between gap-3 py-3 hover:underline">{body}</Link>
                      ) : (
                        <div className="flex min-h-[56px] items-center justify-between gap-3 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Surface>
          )}
        </>
      )}
    </PageShell>
  );
}
