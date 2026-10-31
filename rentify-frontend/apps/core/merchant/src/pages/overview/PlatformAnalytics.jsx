import { useState } from 'react';
import { motion } from 'framer-motion';
import { TopProducts } from './components/TopProducts';
import { RevenueChart } from './components/RevenueChart';
import { ChannelBadge, Kpi, SectionTitle, Surface } from './Overview';
import { useChannels } from '../../context/ChannelContext';
import { CHANNEL_LABEL, formatMoney, useChannelOrders } from '../../hooks/useChannelOrders';
import { useTranslation } from '@rentify/utils';

const PERIODS = [
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['all', 'All time'],
];

const num = (value) => Number(value || 0);

/** Store analytics from recorded orders only. "All channels" compares channels; a focused view drills into one. */
export default function PlatformAnalytics() {
  const { t } = useTranslation();
  const { view } = useChannels();
  const [period, setPeriod] = useState('30d');
  const { orders, loading, error, summary } = useChannelOrders(period);
  const periodLabel = PERIODS.find(([value]) => value === period)?.[1] || '30 days';

  // Per-channel comparison, from the same order list the totals use
  const rows = summary.byChannel.map((row) => {
    const list = orders.filter((o) => o.channel === row.channel && o.status !== 'cancelled');
    const paid = list.reduce(
      (sum, o) => sum + (['completed', 'paid', 'refunded'].includes(o.payment.status) ? num(o.payment.amount) : num(o.payment.collectedAmount)),
      0
    );
    const refunded = list.reduce((sum, o) => sum + num(o.payment.refundedAmount), 0);
    return { ...row, average: row.orders ? row.sales / row.orders : 0, paid, refunded };
  });

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">{view === 'all' ? 'All channels' : CHANNEL_LABEL[view]}</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[32px]">{t('merchant.p2.analytics')}</h1>
          </div>
          <div role="radiogroup" aria-label={t('merchant.p.period')} className="flex w-max rounded-xl bg-muted p-1">
            {PERIODS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={period === value}
                onClick={() => setPeriod(value)}
                className={`h-8 rounded-lg px-3 text-[13px] font-semibold transition-colors ${
                  period === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <Surface className="text-center">
            <p className="text-base font-semibold text-foreground">{t('merchant.p2.couldnTLoadAnalytics')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('merchant.p2.pleaseTryAgainIn')}</p>
          </Surface>
        ) : (
          <>
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <SectionTitle title={t('merchant.p.money')} meta={periodLabel} />
              <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                <Kpi label={t('merchant.p.sales')} value={formatMoney(summary.sales)} sub={`${summary.orderCount} orders`} loading={loading} />
                <Kpi label={t('merchant.p2.averageOrder')} value={formatMoney(summary.averageOrder)} sub="Sales ÷ orders" loading={loading} />
                <Kpi label={t('merchant.p.paid')} value={formatMoney(summary.paid)} sub={`Net after refunds ${formatMoney(summary.net)}`} loading={loading} />
                <Kpi label={t('merchant.p.refunded')} value={formatMoney(summary.refunded)} sub="Recorded refunds" loading={loading} />
              </div>
              {view === 'marketplace' && (
                <p className="mt-3 text-[12.5px] text-muted-foreground">
                  {t('merchant.p2.marketplaceFeeNoneRecorded')}
                </p>
              )}
            </motion.section>

            {view === 'all' && (
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
                <Surface>
                  <SectionTitle title={t('merchant.p2.compareChannels')} meta={periodLabel} />
                  {rows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t('merchant.p.noSalesInThis')}</p>
                  ) : (
                    <div className="-mx-2 overflow-x-auto">
                      <table className="w-full min-w-[560px] text-[13.5px]">
                        <thead>
                          <tr className="text-left text-[12px] font-medium text-muted-foreground">
                            <th className="px-2 pb-2 font-medium">{t('merchant.p2.channel')}</th>
                            <th className="px-2 pb-2 text-right font-medium">{t('merchant.p.orders')}</th>
                            <th className="px-2 pb-2 text-right font-medium">{t('merchant.p.sales')}</th>
                            <th className="px-2 pb-2 text-right font-medium">{t('merchant.p2.avgOrder')}</th>
                            <th className="px-2 pb-2 text-right font-medium">{t('merchant.p.paid')}</th>
                            <th className="px-2 pb-2 text-right font-medium">{t('merchant.p.refunded')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.channel} className="even:bg-muted/40">
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
              </motion.section>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3"
            >
              <div className="xl:col-span-2">
                <RevenueChart data={summary.trend} dateRange={summary.dateRange} isLoading={loading} />
              </div>
              <TopProducts products={summary.topProducts} isLoading={loading} />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
