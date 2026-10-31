import { useMemo, useState, type ReactNode } from 'react';
import { useAuth, useTranslation } from '@rentify/utils';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  MonitorSmartphone,
  Package,
  Plus,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { TopProducts } from './components/TopProducts';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { RevenueChart } from './components/RevenueChart';
import { useChannels, type ChannelView } from '../../context/ChannelContext';
import { CHANNEL_LABEL, formatMoney, useChannelOrders, type StoreOrder } from '../../hooks/useChannelOrders';
import { useAccess, type StaffPermission } from '../../utils/access';
import { Lock } from 'lucide-react';
import { MARKETING_URL } from '@rentify/shared/config/urls';
import { marketplaceStoreUrl, openPosApp, storefrontDomain as storefrontDomainFor, storefrontUrl } from '../../utils/storeLinks';
import { SetupGuideCard } from '../../app/features/setup-guide/SetupGuideCard';
import { useSetupGuide } from '../../app/features/setup-guide/SetupGuideContext';

const PERIODS: [string, string][] = [
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['all', 'All time'],
];

const CHANNEL_TONE: Record<StoreOrder['channel'], string> = {
  marketplace: 'bg-amber-500/10 text-amber-700',
  storefront: 'bg-sky-500/10 text-sky-700',
  pos: 'bg-violet-500/10 text-violet-700',
  invoice: 'bg-slate-500/10 text-slate-700',
};

const CHANNEL_BAR: Record<StoreOrder['channel'], string> = {
  marketplace: 'bg-amber-500',
  storefront: 'bg-sky-500',
  pos: 'bg-violet-500',
  invoice: 'bg-slate-400',
};

/** "Good morning" / "Good afternoon" / "Good evening", based on local time. */
const greetingForHour = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
});

export const Surface = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div data-slot="card" className={`rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)] md:p-6 ${className}`}>{children}</div>
);

export const SectionTitle = ({ title, meta }: { title: string; meta?: ReactNode }) => (
  <div className="mb-3 flex items-baseline justify-between gap-3">
    <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
    {meta && <span className="text-right text-[12.5px] text-muted-foreground">{meta}</span>}
  </div>
);

export const ChannelBadge = ({ channel }: { channel: StoreOrder['channel'] }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${CHANNEL_TONE[channel]}`}>
    {CHANNEL_LABEL[channel]}
  </span>
);

export const Kpi = ({ label, value, sub, loading }: { label: string; value: string; sub: string; loading: boolean }) => (
  <Surface className="flex min-h-[124px] flex-col justify-between gap-3">
    <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
    {loading ? (
      <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
    ) : (
      <p className="truncate text-[24px] font-semibold leading-none tracking-tight text-foreground tabular-nums md:text-[26px]">{value}</p>
    )}
    <p className="truncate text-[12px] text-muted-foreground">{sub}</p>
  </Surface>
);

export const CHANNEL_BARS = CHANNEL_BAR;

// `need` mirrors the backend rule for the action: owner-only setup, or a staff permission
type ChannelAction = { label: string; onClick?: () => void; href?: string; external?: boolean; primary?: boolean; need?: 'owner' | StaffPermission };

interface ChannelCardProps {
  icon: ReactNode;
  name: string;
  kind: string;
  on: boolean;
  status: string;
  detail: string;
  actions: ChannelAction[];
  tint: string;
  footnote?: string;
  wide?: boolean;
}

/** One sales channel: what it is, whether it's on, and what to do next. Off channels invite, never fake a state. */
const ChannelCard = ({ icon, name, kind, on, status, detail, actions, tint, footnote, wide }: ChannelCardProps) => (
  <div
    className={`flex h-full flex-col rounded-3xl p-5 md:p-6 ${on ? 'bg-card shadow-[var(--shadow-soft)]' : 'bg-muted/60'} ${
      wide ? 'md:flex-row md:items-center md:gap-8' : ''
    }`}
  >
    <div className={wide ? 'min-w-0 flex-1' : ''}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${on ? tint : 'bg-card text-foreground/40'}`}>{icon}</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            on ? 'bg-emerald-500/10 text-emerald-700' : 'bg-card text-foreground/50'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-foreground/25'}`} />
          {status}
        </span>
      </div>
      <p className="mt-4 text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{kind}</p>
      <h3 className="mt-0.5 truncate text-[17px] font-semibold tracking-tight text-foreground">{name}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{detail}</p>
      {footnote && <p className="mt-2 text-[12px] font-medium text-foreground/60">{footnote}</p>}
    </div>
    <div className={`flex flex-wrap gap-2 pt-5 ${wide ? 'md:shrink-0 md:pt-0' : 'mt-auto'}`}>
      {actions.map((action) => {
        const cls = `inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition-colors ${
          action.primary ? 'bg-foreground text-background hover:opacity-90' : 'bg-foreground/[0.05] text-foreground hover:bg-foreground/[0.09]'
        }`;
        const Icon = action.external ? ArrowUpRight : action.primary && !on ? Plus : ArrowRight;
        return action.href ? (
          <a key={action.label} href={action.href} className={cls} {...(action.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {action.label}
            <Icon className="h-3.5 w-3.5" />
          </a>
        ) : (
          <button key={action.label} type="button" onClick={action.onClick} className={cls}>
            {action.label}
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  </div>
);

// How returns and refunds are handled per channel — mirrors the recorded order actions, nothing more
const RETURNS_GUIDE: Record<Exclude<ChannelView, 'all'>, { title: string; steps: string[] }> = {
  marketplace: {
    title: 'Returns & refunds on the marketplace',
    steps: [
      'The buyer reports a return or complaint from their Rentify order page.',
      'It shows up in “Needs attention” with a Marketplace label.',
      'Open the order and record the refund with amount, method and confirmation.',
    ],
  },
  storefront: {
    title: 'Returns & refunds on your online store',
    steps: [
      'Online store orders follow the same cash-on-delivery steps as the marketplace.',
      'Mark delivery, then collect cash; only collected cash can be refunded.',
      'Record the refund on the order with amount, method and confirmation.',
    ],
  },
  pos: {
    title: 'Returns at the counter',
    steps: [
      'Counter sales are paid on the spot by KHQR or cash.',
      'Handle returns in the POS app under Returns.',
      'The sale and its stock change stay on the same catalog.',
    ],
  },
};

export const Overview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth() as { profile?: { name?: string } };
  const { store, hasStorefront, hasMarketplace, hasPos, togglePos, toggleMarketplace, view } = useChannels();
  const [period, setPeriod] = useState('30d');
  const { orders, loading, error, summary } = useChannelOrders(period);
  const access = useAccess();
  const canMoney = access.can('manage_analytics');
  const canOrders = access.can('manage_orders');
  const allowed = (action: ChannelAction) => !action.need || (action.need === 'owner' ? access.isOwner : access.can(action.need));

  const firstName = useMemo(() => profile?.name?.split(' ')?.[0] || 'there', [profile?.name]);
  const greeting = useMemo(() => `${greetingForHour(new Date().getHours())}, ${firstName}`, [firstName]);

  const storeObj = store as Record<string, any> | null;
  const storefrontDomain = storefrontDomainFor(storeObj);
  const storefrontHref = storefrontUrl(storeObj);
  const marketplaceShopHref = marketplaceStoreUrl(storeObj);
  const templateOnboardingUrl = `${MARKETING_URL}/onboarding/starter?step=template`;
  // Listing is automatic (DEC-028): approved means listed; anything other than pending is an admin decision.
  const approval = String(storeObj?.marketplaceApprovalStatus || '').toLowerCase();
  const approvalLabel = approval === 'approved' || !approval
    ? t('merchant.setup.marketplaceListed')
    : approval === 'pending' ? t('merchant.setup.marketplaceNotListed') : t('merchant.setup.marketplacePaused');
  const periodLabel = PERIODS.find(([v]) => v === period)?.[1] || '30 days';
  const handleOpenPos = openPosApp;
  const { guide } = useSetupGuide();
  // A new store has nothing to report yet: keep Home to the guide and channels until the first order.
  const settingUp = Boolean(guide && !guide.complete && !loading && orders.length === 0);

  const openOrder = (order: StoreOrder) => navigate(order.channel === 'marketplace' ? '/marketplace-orders' : `/orders/${order.id}`);

  const cards: Record<Exclude<ChannelView, 'all'>, ChannelCardProps> = {
    marketplace: {
      icon: <ShoppingBag className="h-5 w-5" />,
      kind: 'Marketplace',
      name: 'Rentify Marketplace',
      on: hasMarketplace,
      status: hasMarketplace ? approvalLabel : 'Off',
      detail: hasMarketplace
        ? 'Shoppers across Cambodia find and order from your store. Paid by cash on delivery.'
        : 'List your products where shoppers already browse and compare stores.',
      tint: 'bg-amber-500/10 text-amber-700',
      footnote: hasMarketplace ? 'Marketplace fee: none recorded on your orders.' : undefined,
      actions: hasMarketplace
        ? [
            { label: 'Marketplace orders', onClick: () => navigate('/marketplace-orders'), primary: true, need: 'manage_orders' },
            { label: 'View shop', href: marketplaceShopHref, external: true },
          ]
        : [{ label: 'Join marketplace', onClick: () => toggleMarketplace(true), primary: true, need: 'owner' }],
    },
    storefront: {
      icon: <Store className="h-5 w-5" />,
      kind: 'Online store',
      name: hasStorefront ? storefrontDomain : 'Your own website',
      on: hasStorefront,
      status: hasStorefront ? 'Live' : 'Not set up',
      detail: hasStorefront
        ? 'Your branded website, using the same products and stock as everywhere else.'
        : 'Pick a template and get a branded website with your products. 14-day free trial.',
      tint: 'bg-sky-500/10 text-sky-700',
      actions: hasStorefront
        ? [
            { label: 'Customize', onClick: () => navigate('/store-management'), primary: true, need: 'owner' },
            { label: 'Visit', href: storefrontHref, external: true },
          ]
        : [{ label: 'Add online store', href: templateOnboardingUrl, primary: true, need: 'owner' }],
    },
    pos: {
      icon: <MonitorSmartphone className="h-5 w-5" />,
      kind: 'Point of sale',
      name: 'In-store register',
      on: hasPos,
      status: hasPos ? 'Ready' : 'Off',
      detail: hasPos
        ? 'Ring up counter sales with KHQR or cash. Sales come off the same stock.'
        : 'Sell at your counter with KHQR or cash, synced with your catalog.',
      tint: 'bg-violet-500/10 text-violet-700',
      actions: hasPos
        ? [{ label: 'Open POS', onClick: handleOpenPos, primary: true, external: true, need: 'manage_pos' }]
        : [{ label: 'Turn on POS', onClick: () => togglePos(true), primary: true, need: 'owner' }],
    },
  };

  (Object.keys(cards) as (keyof typeof cards)[]).forEach((key) => {
    cards[key].actions = cards[key].actions.filter(allowed);
  });

  const activeCount = [hasMarketplace, hasStorefront, hasPos].filter(Boolean).length;
  const recent = orders.slice(0, 6);
  const maxChannelSales = Math.max(1, ...summary.byChannel.map((row) => row.sales));

  const isCashier = !access.isOwner && !canOrders && !canMoney && !access.can('manage_products') && access.can('manage_pos');
  if (isCashier) {
    return (
      <div className="min-h-full">
        <div className="mx-auto max-w-xl space-y-6 px-4 py-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{storeObj?.name || 'Rentify'} · Cashier</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{greeting}</h1>
          </div>
          <button
            type="button"
            onClick={handleOpenPos}
            className="w-full h-14 rounded-2xl text-base font-semibold bg-primary text-primary-foreground shadow-md hover:bg-primary/90 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <MonitorSmartphone className="h-5 w-5" />
            <span>Open the point of sale</span>
          </button>
          <div data-slot="card" className="rounded-2xl border border-card-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-foreground mb-3">Today at the counter</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-4">
                <span className="text-xs text-muted-foreground block">Sales</span>
                <span className="text-xl font-bold font-mono text-foreground mt-1 block">$0.00</span>
              </div>
              <div className="rounded-xl bg-muted/50 p-4">
                <span className="text-xs text-muted-foreground block">Items sold</span>
                <span className="text-xl font-bold font-mono text-foreground mt-1 block">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {/* Greeting + period */}
        <motion.div {...fadeUp(0)} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">{store?.name || 'Your store'}</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[32px]">{greeting}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label={t('merchant.p.period')} className="flex rounded-xl bg-muted p-1">
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
            {access.can('manage_products') && <button
              type="button"
              onClick={() => navigate('/products/create')}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-card px-4 text-[13px] font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-muted"
            >
              <Package className="h-4 w-4" />
              {t('merchant.p.addProduct')}
            </button>}
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.02)}>
          <SetupGuideCard />
        </motion.div>

        {/* Channels: all three side by side, or the focused one full width */}
        <motion.section {...fadeUp(0.04)}>
          {view === 'all' ? (
            <>
              <SectionTitle title={t('merchant.p.whereYouSell')} meta={`${activeCount} of 3 on · one catalog, one stock count`} />
              <div className="grid gap-3 md:grid-cols-3 md:gap-4">
                <ChannelCard {...cards.marketplace} />
                <ChannelCard {...cards.storefront} />
                <ChannelCard {...cards.pos} />
              </div>
            </>
          ) : (
            <ChannelCard {...cards[view]} wide />
          )}
        </motion.section>

        {/* Money for the selected channel(s) */}
        {!settingUp && (
        <motion.section {...fadeUp(0.08)}>
          <SectionTitle title={t('merchant.p.money')} meta={`${view === 'all' ? 'All channels' : CHANNEL_LABEL[view]} · ${periodLabel}`} />
          {!canMoney ? (
            <Surface className="flex items-center gap-3 text-[13.5px] text-muted-foreground">
              <Lock className="h-4 w-4 shrink-0" />
              {t('merchant.p.salesAndMoneyAre')}
            </Surface>
          ) : error ? (
            <Surface className="text-center text-sm text-muted-foreground">{t('merchant.p.couldnTLoadOrders')}</Surface>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
              <Kpi
                label={t('merchant.p.sales')}
                value={formatMoney(summary.sales)}
                sub={`${summary.orderCount} order${summary.orderCount === 1 ? '' : 's'} · avg ${formatMoney(summary.averageOrder)}`}
                loading={loading}
              />
              <Kpi label={t('merchant.p.paid')} value={formatMoney(summary.paid)} sub={`Net after refunds ${formatMoney(summary.net)}`} loading={loading} />
              <Kpi label={t('merchant.p.awaitingPayment')} value={formatMoney(summary.awaiting)} sub="Not yet collected" loading={loading} />
              <Kpi label={t('merchant.p.refunded')} value={formatMoney(summary.refunded)} sub="Recorded refunds" loading={loading} />
            </div>
          )}
        </motion.section>
        )}

        {/* Split + attention, two equal halves */}
        {canOrders && !settingUp && (
        <motion.div {...fadeUp(0.12)} className={`grid grid-cols-1 gap-3 md:gap-4 ${canMoney || view !== 'all' ? 'lg:grid-cols-2' : ''}`}>
          {view === 'all' ? (canMoney && (
            <Surface>
              <SectionTitle title={t('merchant.p.salesByChannel')} meta={periodLabel} />
              {summary.byChannel.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('merchant.p.noSalesInThis')}</p>
              ) : (
                <ul className="space-y-4">
                  {summary.byChannel.map((row) => (
                    <li key={row.channel}>
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <ChannelBadge channel={row.channel} />
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatMoney(row.sales)} <span className="font-normal text-muted-foreground">· {row.orders} orders</span>
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${CHANNEL_BAR[row.channel]}`} style={{ width: `${(row.sales / maxChannelSales) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          )) : (
            <Surface>
              <SectionTitle title={RETURNS_GUIDE[view].title} />
              <ol className="space-y-3">
                {RETURNS_GUIDE[view].steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[13.5px] leading-relaxed text-foreground/80">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold text-foreground">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Surface>
          )}

          <Surface>
            <SectionTitle title={t('merchant.p.needsAttention')} meta={summary.attention.length ? `${summary.attention.length} open` : undefined} />
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : summary.attention.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t('merchant.p.allCaughtUp')}</p>
                  <p className="text-xs text-muted-foreground">{t('merchant.p.returnsComplaintsAndCash')}</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {summary.attention.slice(0, 5).map(({ order, reason }) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => openOrder(order)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-muted/60 px-3.5 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-foreground">{reason}</p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          #{order.orderNumber || order.id.slice(0, 8)} · {order.buyer.name}
                        </p>
                      </div>
                      <ChannelBadge channel={order.channel} />
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </motion.div>

        )}

        {/* Sales trend + best sellers */}
        {canMoney && !settingUp && (
        <motion.div {...fadeUp(0.16)} className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RevenueChart data={summary.trend} dateRange={summary.dateRange} isLoading={loading} />
          </div>
          <TopProducts products={summary.topProducts} isLoading={loading} />
        </motion.div>
        )}

        {/* Recent orders, each labelled with its channel */}
        {canOrders && !settingUp && (
        <motion.div {...fadeUp(0.2)}>
          <Surface>
            <SectionTitle
              title={t('merchant.p.recentOrders')}
              meta={
                <button type="button" onClick={() => navigate('/orders')} className="font-semibold text-primary hover:underline">
                  {t('merchant.p.viewAll')}
                </button>
              }
            />
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-40" />
                <p className="text-sm">{t('merchant.p.noOrdersInThis')}</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {recent.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => openOrder(order)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted/60 md:grid-cols-[minmax(0,1.4fr)_120px_120px_110px]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-foreground">#{order.orderNumber || order.id.slice(0, 8)}</p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {order.buyer.name} · {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="justify-self-end md:justify-self-start">
                        <ChannelBadge channel={order.channel} />
                      </span>
                      <span className="hidden text-[12.5px] capitalize text-muted-foreground md:block">
                        {String(order.status).replace(/_/g, ' ')}
                      </span>
                      <span className="text-[13.5px] font-semibold tabular-nums text-foreground md:text-right">
                        {formatMoney(Number(order.totals.total), order.currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </motion.div>
        )}
      </div>
    </div>
  );
};

export default Overview;
