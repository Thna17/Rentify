import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, CreditCard, DollarSign, Package, ShoppingBag, Banknote } from 'lucide-react';
import { ChannelBadge, Kpi, SectionTitle, Surface } from './Overview';
import { useChannels } from '../../context/ChannelContext';
import { CHANNEL_LABEL, formatMoney, useChannelOrders, type StoreOrder } from '../../hooks/useChannelOrders';
import { useTranslation } from '@rentify/utils';
import { RevenueChart } from './components/RevenueChart';

const PERIODS = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'This year' },
] as const;

type ReportTab = 'sales' | 'products' | 'channels' | 'payments';

const num = (value: unknown) => Number(value || 0);

export default function PlatformAnalytics() {
  const { t } = useTranslation();
  const { view } = useChannels();
  const [period, setPeriod] = useState<string>('30d');
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const { orders, loading, error, summary } = useChannelOrders(period);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label || '30 days';

  // Per-channel comparison
  const rows = useMemo(() => {
    return summary.byChannel.map((row) => {
      const list = orders.filter((o) => o.channel === row.channel && o.status !== 'cancelled');
      const paid = list.reduce(
        (sum, o) => sum + (['completed', 'paid', 'refunded'].includes(o.payment.status) ? num(o.payment.amount) : num(o.payment.collectedAmount)),
        0
      );
      const refunded = list.reduce((sum, o) => sum + num(o.payment.refundedAmount), 0);
      return { ...row, average: row.orders ? row.sales / row.orders : 0, paid, refunded };
    });
  }, [summary.byChannel, orders]);

  // Payment method breakdowns (wireframe M13: How buyers paid)
  const paymentsBreakdown = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'cancelled');

    // KHQR payments (direct or verified)
    const khqrOrders = live.filter(
      (o) => (o.payment.status === 'paid' || o.payment.status === 'completed') && (!o.payment.codState || o.payment.codState === 'none')
    );
    const khqrTotal = khqrOrders.reduce((sum, o) => sum + num(o.payment.amount || o.totals.total), 0);

    // Cash on delivery collected
    const cashCollectedOrders = live.filter((o) => o.payment.codState === 'collected');
    const cashCollectedTotal = cashCollectedOrders.reduce((sum, o) => sum + num(o.payment.collectedAmount || o.totals.total), 0);

    // Cash still to collect
    const cashToCollectOrders = live.filter(
      (o) => o.payment.codState === 'pending_collection' || num(o.payment.amountDue) > 0
    );
    const cashToCollectTotal = cashToCollectOrders.reduce((sum, o) => sum + num(o.payment.amountDue), 0);

    return {
      khqr: { count: khqrOrders.length, total: khqrTotal },
      cashCollected: { count: cashCollectedOrders.length, total: cashCollectedTotal },
      cashToCollect: { count: cashToCollectOrders.length, total: cashToCollectTotal },
    };
  }, [orders]);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {/* Page Head */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[30px] md:text-[32px]">
              Reports
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Needs backend · store-wide sales statistics (not tied to the website, no 50-order cap)</span>
            </div>
          </div>

          {/* Period Chips (wireframe M13: Last 7 days, 30 days, 90 days, This year) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`inline-flex min-h-[36px] shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-foreground text-background shadow-sm'
                      : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Work Tabs (wireframe M13: Sales · Products · Channels · Payments) */}
        <div className="border-b border-border">
          <nav className="-mb-px flex gap-6" aria-label="Reports tabs">
            {[
              { id: 'sales', label: 'Sales' },
              { id: 'products', label: 'Products' },
              { id: 'channels', label: 'Channels' },
              { id: 'payments', label: 'Payments' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ReportTab)}
                  className={`border-b-2 pb-3 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {error ? (
          <Surface className="text-center py-12">
            <p className="text-base font-semibold text-foreground">Could not load reports</p>
            <p className="mt-1 text-sm text-muted-foreground">Please check your connection and try again.</p>
          </Surface>
        ) : (
          <>
            {/* KPI 4-grid: Sales · Orders · Average order · Refunded */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              <Kpi label="Sales" value={formatMoney(summary.sales)} sub={`${summary.orderCount} orders in ${periodLabel}`} loading={loading} />
              <Kpi label="Orders" value={String(summary.orderCount)} sub={`Period: ${periodLabel}`} loading={loading} />
              <Kpi label="Average order" value={formatMoney(summary.averageOrder)} sub="Sales ÷ live orders" loading={loading} />
              <Kpi label="Refunded" value={formatMoney(summary.refunded)} sub="Recorded refunds" loading={loading} />
            </div>

            {/* TAB 1: Sales */}
            {activeTab === 'sales' && (
              <div className="space-y-6">
                {/* Sales by day chart card */}
                <Surface className="p-5 md:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-semibold text-foreground">Sales by day</h2>
                      <p className="text-xs text-muted-foreground">{periodLabel}</p>
                    </div>
                  </div>
                  <RevenueChart data={summary.trend} dateRange={summary.dateRange} isLoading={loading} />
                </Surface>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* How buyers paid (wireframe M13) */}
                  <Surface className="p-5 md:p-6 space-y-4">
                    <SectionTitle title="How buyers paid" meta={periodLabel} />
                    <div className="divide-y divide-border">
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Paid by KHQR</p>
                            <p className="text-xs text-muted-foreground">{paymentsBreakdown.khqr.count} orders</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(paymentsBreakdown.khqr.total)}</p>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Banknote className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Cash collected</p>
                            <p className="text-xs text-muted-foreground">{paymentsBreakdown.cashCollected.count} orders</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(paymentsBreakdown.cashCollected.total)}</p>
                      </div>

                      <Link
                        to="/orders?tab=cash_to_collect"
                        className="group flex items-center justify-between py-3 transition hover:text-foreground"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                            <Banknote className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:underline">Cash still to collect</p>
                            <p className="text-xs text-muted-foreground">{paymentsBreakdown.cashToCollect.count} orders pending</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(paymentsBreakdown.cashToCollect.total)}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    </div>
                  </Surface>

                  {/* Best sellers (wireframe M13) */}
                  <Surface className="p-5 md:p-6 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-[15px] font-semibold text-foreground">Best sellers</h2>
                      <Link to="/products" className="text-xs font-medium text-muted-foreground hover:underline">
                        All products
                      </Link>
                    </div>

                    {summary.topProducts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        <Package className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p>No sales yet in this period</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {summary.topProducts.map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <Package className="h-4 w-4" />
                              </div>
                              <div className="truncate">
                                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground">{p.unitsSold} sold</p>
                              </div>
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-foreground ml-3 shrink-0">{formatMoney(p.revenue)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Surface>
                </div>
              </div>
            )}

            {/* TAB 2: Products */}
            {activeTab === 'products' && (
              <Surface className="p-5 md:p-6">
                <SectionTitle title="Products sold" meta={periodLabel} />
                {summary.topProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No product sales in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="pb-3 font-medium">Product</th>
                          <th className="pb-3 text-right font-medium">Units sold</th>
                          <th className="pb-3 text-right font-medium">Total revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {summary.topProducts.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 font-medium text-foreground">{p.name}</td>
                            <td className="py-3 text-right tabular-nums text-foreground">{p.unitsSold}</td>
                            <td className="py-3 text-right font-semibold tabular-nums text-foreground">{formatMoney(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>
            )}

            {/* TAB 3: Channels */}
            {activeTab === 'channels' && (
              <Surface className="p-5 md:p-6">
                <SectionTitle title="Channel comparison" meta={periodLabel} />
                {rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No recorded sales across channels yet.</p>
                ) : (
                  <div className="-mx-2 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[13.5px]">
                      <thead>
                        <tr className="text-left text-[12px] font-medium text-muted-foreground border-b border-border">
                          <th className="px-2 pb-2 font-medium">Channel</th>
                          <th className="px-2 pb-2 text-right font-medium">Orders</th>
                          <th className="px-2 pb-2 text-right font-medium">Sales</th>
                          <th className="px-2 pb-2 text-right font-medium">Avg Order</th>
                          <th className="px-2 pb-2 text-right font-medium">Paid</th>
                          <th className="px-2 pb-2 text-right font-medium">Refunded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.channel} className="even:bg-muted/40 border-b border-border">
                            <td className="rounded-l-xl px-2 py-3"><ChannelBadge channel={row.channel} /></td>
                            <td className="px-2 py-3 text-right tabular-nums">{row.orders}</td>
                            <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatMoney(row.sales)}</td>
                            <td className="px-2 py-3 text-right tabular-nums">{formatMoney(row.average)}</td>
                            <td className="px-2 py-3 text-right tabular-nums">{formatMoney(row.paid)}</td>
                            <td className="rounded-r-xl px-2 py-3 text-right tabular-nums">{formatMoney(row.refunded)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>
            )}

            {/* TAB 4: Payments */}
            {activeTab === 'payments' && (
              <Surface className="p-5 md:p-6 space-y-4">
                <SectionTitle title="Payment breakdown" meta={periodLabel} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs text-muted-foreground">KHQR verified</p>
                    <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatMoney(paymentsBreakdown.khqr.total)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{paymentsBreakdown.khqr.count} orders</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs text-muted-foreground">Cash on delivery (collected)</p>
                    <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatMoney(paymentsBreakdown.cashCollected.total)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{paymentsBreakdown.cashCollected.count} orders</p>
                  </div>
                  <div className="rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs text-muted-foreground">Cash on delivery (pending)</p>
                    <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{formatMoney(paymentsBreakdown.cashToCollect.total)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{paymentsBreakdown.cashToCollect.count} orders awaiting</p>
                  </div>
                </div>
              </Surface>
            )}
          </>
        )}
      </div>
    </div>
  );
}
