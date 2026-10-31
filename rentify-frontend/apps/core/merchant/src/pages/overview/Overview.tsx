import { useMemo, useState, type ReactNode } from 'react';
import { useAuth, useTranslation } from '@rentify/utils';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Globe,
  MonitorSmartphone,
  Package,
  ShoppingBag,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useChannels, type ChannelView } from '../../context/ChannelContext';
import { CHANNEL_LABEL, formatMoney, useChannelOrders, type StoreOrder } from '../../hooks/useChannelOrders';
import { useAccess, type StaffPermission } from '../../utils/access';
import { openPosApp, storefrontDomain as storefrontDomainFor, storefrontUrl, marketplaceStoreUrl } from '../../utils/storeLinks';
import { SetupGuideCard } from '../../app/features/setup-guide/SetupGuideCard';
import { useSetupGuide } from '../../app/features/setup-guide/SetupGuideContext';
import { useGetManagedProductsQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { Button } from '@rentify/shared/ui/button';

const CHANNEL_TONE: Record<StoreOrder['channel'], string> = {
  marketplace: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  storefront: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  pos: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  invoice: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
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
  <div data-slot="card" className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6 ${className}`}>{children}</div>
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

const CHANNELS_FILTER = [
  { id: 'all', label: 'All channels' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'storefront', label: 'Online store' },
  { id: 'pos', label: 'POS' },
] as const;

export const Overview = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth() as { profile?: { name?: string } };
  const { store, hasStorefront, hasMarketplace } = useChannels();
  const [activeChannel, setActiveChannel] = useState<'all' | 'marketplace' | 'storefront' | 'pos'>('all');

  // We load recorded orders for the current store
  const { orders, loading, error, reload } = useChannelOrders('all');
  const access = useAccess();
  const { websiteData } = useThemeService();
  const websiteId = websiteData?.websiteId;

  // Products for low-stock inventory rail and marketplace visibility count
  const { data: productsData } = useGetManagedProductsQuery({ websiteId, page: 1, limit: 50 }, { skip: !websiteId });
  const products = useMemo(() => {
    if (!productsData) return [];
    if (Array.isArray(productsData)) return productsData;
    if (Array.isArray(productsData.products)) return productsData.products;
    if (Array.isArray(productsData.data)) return productsData.data;
    return [];
  }, [productsData]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((p: any) => {
        const qty = p.stockCount ?? p.inventory ?? p.stock ?? 0;
        return Number(qty) <= 3;
      })
      .slice(0, 4);
  }, [products]);

  const firstName = useMemo(() => profile?.name?.split(' ')?.[0] || 'there', [profile?.name]);
  const greeting = useMemo(() => `${greetingForHour(new Date().getHours())}, ${firstName}`, [firstName]);

  const storeObj = store as Record<string, any> | null;
  const storefrontDomain = storefrontDomainFor(storeObj);

  // Filter orders by selected channel chip
  const filteredOrders = useMemo(() => {
    if (activeChannel === 'all') return orders;
    return orders.filter((o) => o.channel === activeChannel);
  }, [orders, activeChannel]);

  // Next actions:
  // 1. To confirm: pending orders
  const toConfirmOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'pending' || o.allowedActions?.some((a) => a.code === 'confirm' || a.code === 'approve')),
    [filteredOrders]
  );
  // 2. To deliver: confirmed, processing, ready for pickup
  const toDeliverOrders = useMemo(
    () => filteredOrders.filter((o) => ['confirmed', 'processing', 'ready_for_pickup'].includes(o.status) || o.allowedActions?.some((a) => a.code === 'ship' || a.code === 'deliver')),
    [filteredOrders]
  );
  // 3. Cash to collect: delivered unpaid COD orders
  const cashToCollectOrders = useMemo(
    () => filteredOrders.filter((o) => o.payment?.status !== 'paid' && (o.status === 'delivered' || o.payment?.codState === 'pending_collection' || o.allowedActions?.some((a) => a.code === 'collect_cod'))),
    [filteredOrders]
  );
  // 4. Problems to answer: returns and buyer complaints
  const problemOrders = useMemo(
    () => filteredOrders.filter((o) => (o.reports && o.reports.length > 0) || ['disputed', 'return_requested'].includes(o.status)),
    [filteredOrders]
  );

  const attentionTotal = toConfirmOrders.length + toDeliverOrders.length + cashToCollectOrders.length + problemOrders.length;

  // Today stats
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = useMemo(
    () => filteredOrders.filter((o) => o.createdAt && o.createdAt.slice(0, 10) === todayKey && o.status !== 'cancelled'),
    [filteredOrders, todayKey]
  );
  const todaySales = useMemo(
    () => todayOrders.reduce((sum, o) => sum + Number(o.totals?.total || 0), 0),
    [todayOrders]
  );
  const todayCashToCollect = useMemo(
    () =>
      todayOrders
        .filter((o) => o.payment?.status !== 'paid')
        .reduce((sum, o) => sum + Number(o.payment?.amountDue || o.totals?.total || 0), 0),
    [todayOrders]
  );

  // Recent 5 orders
  const recentOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [filteredOrders]);

  const { guide } = useSetupGuide();
  const settingUp = Boolean(guide && !guide.complete && !loading && orders.length === 0);

  // Listing is automatic (DEC-028)
  const approval = String(storeObj?.marketplaceApprovalStatus || '').toLowerCase();
  const isMarketplaceListed = approval === 'approved' || !approval;
  const marketplaceStatusLabel = isMarketplaceListed ? 'Listed' : approval === 'pending' ? 'Pending' : 'Paused';

  if (error) {
    return (
      <div className="min-h-full">
        <div className="mx-auto max-w-lg space-y-6 px-4 py-16 text-center">
          <Surface className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">We couldn't load your store overview</h2>
              <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
            </div>
            <Button onClick={reload} variant="outline" className="h-10 px-5 rounded-xl font-semibold">
              Try again
            </Button>
          </Surface>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {/* Page Head: store name eyebrow + personalized greeting */}
        <motion.div {...fadeUp(0)} className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{store?.name || 'Rentify Store'}</p>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-[30px] md:text-[32px]">{greeting}</h1>
        </motion.div>

        {/* Channel Chips (filters this page only, per wireframe Note 3) */}
        <motion.div {...fadeUp(0.02)} className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {CHANNELS_FILTER.map((chip) => {
            const active = activeChannel === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveChannel(chip.id)}
                className={`inline-flex min-h-[38px] shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </motion.div>

        {/* Screen M2: New store setup guide */}
        {settingUp && (
          <motion.div {...fadeUp(0.04)}>
            <SetupGuideCard />
            <p className="mt-3 text-xs text-muted-foreground">Sales and reports appear here after your first order.</p>
          </motion.div>
        )}

        {/* Main 2-column layout: Core workflow on the left, stock alerts on the right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] items-start">
          <div className="space-y-6">
            {/* Section 1: Needs your attention (Next actions first, wireframe Note 2) */}
            <motion.section {...fadeUp(0.06)}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                  Needs your attention
                  {attentionTotal > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                      {attentionTotal}
                    </span>
                  )}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Tile 1: To confirm */}
                <Link
                  to="/orders?tab=to_confirm"
                  className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/50 hover:shadow-md"
                >
                  <span className="text-2xl font-bold tabular-nums text-foreground">{toConfirmOrders.length}</span>
                  <span className="text-xs font-medium text-muted-foreground">New orders to confirm</span>
                </Link>

                {/* Tile 2: To deliver */}
                <Link
                  to="/orders?tab=to_deliver"
                  className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/50 hover:shadow-md"
                >
                  <span className="text-2xl font-bold tabular-nums text-foreground">{toDeliverOrders.length}</span>
                  <span className="text-xs font-medium text-muted-foreground">To deliver</span>
                </Link>

                {/* Tile 3: Cash to collect */}
                <Link
                  to="/orders?tab=cash_to_collect"
                  className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/50 hover:shadow-md"
                >
                  <span className="text-2xl font-bold tabular-nums text-foreground">{cashToCollectOrders.length}</span>
                  <span className="text-xs font-medium text-muted-foreground">Cash to collect</span>
                </Link>

                {/* Tile 4: Problems to answer */}
                <Link
                  to="/returns"
                  className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/50 hover:shadow-md"
                >
                  <span className="text-2xl font-bold tabular-nums text-foreground">{problemOrders.length}</span>
                  <span className="text-xs font-medium text-muted-foreground">Problems to answer</span>
                </Link>
              </div>
            </motion.section>

            {/* Section 2: Today (Summary with link to Reports) */}
            <motion.section {...fadeUp(0.08)}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-foreground">Today</h2>
                <Link to="/reports" className="text-xs font-semibold text-primary hover:underline">
                  Reports
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                  <span className="text-xs font-medium text-muted-foreground">Orders</span>
                  <b className="text-xl font-bold tabular-nums text-foreground">{todayOrders.length}</b>
                </div>
                <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                  <span className="text-xs font-medium text-muted-foreground">Sales</span>
                  <b className="text-xl font-bold tabular-nums text-foreground">{formatMoney(todaySales)}</b>
                </div>
                <div className="flex min-h-[84px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                  <span className="text-xs font-medium text-muted-foreground">Cash to collect</span>
                  <b className="text-xl font-bold tabular-nums text-foreground">{formatMoney(todayCashToCollect)}</b>
                </div>
              </div>
            </motion.section>

            {/* Section 3: Where you sell (Rentify Market, Online store, POS) */}
            <motion.section {...fadeUp(0.1)}>
              <h2 className="mb-3 text-[15px] font-semibold text-foreground">Where you sell</h2>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                {/* Rentify Market */}
                <Link
                  to="/marketplace"
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">Rentify Market</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {isMarketplaceListed ? `Listed · ${products.length} products shown` : 'Pending verification · automatic'}
                      </p>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {marketplaceStatusLabel}
                  </span>
                </Link>

                {/* Online Store */}
                <Link
                  to="/online-store"
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">Online store</p>
                      <p className="truncate text-xs text-muted-foreground">{storefrontDomain}</p>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Live
                  </span>
                </Link>

                {/* Point of Sale */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openPosApp}
                  onKeyDown={(e) => e.key === 'Enter' && openPosApp()}
                  className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-400">
                      <MonitorSmartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">Point of sale</p>
                      <p className="truncate text-xs text-muted-foreground">Ready</p>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 rounded-full border border-slate-500/20 bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                    Open
                  </span>
                </div>
              </div>
            </motion.section>

            {/* Section 4: Recent orders */}
            <motion.section {...fadeUp(0.12)}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold text-foreground">Recent orders</h2>
                <Link to="/orders" className="text-xs font-semibold text-primary hover:underline">
                  See all
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-card" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-10 text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium text-foreground">No recent orders</p>
                  <p className="text-xs text-muted-foreground">Orders from marketplace, online store and POS will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                  {recentOrders.map((order) => {
                    const isToConfirm = order.status === 'pending' || order.allowedActions?.some((a) => a.code === 'confirm');
                    const itemCount = order.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 1;
                    const paymentMethod = order.payment?.status === 'paid' ? 'KHQR' : 'COD';

                    return (
                      <div
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </span>
                            <ChannelBadge channel={order.channel} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {order.buyer?.name || 'Customer'} · {itemCount} {itemCount === 1 ? 'item' : 'items'} · {paymentMethod}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0">
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {formatMoney(Number(order.totals?.total || 0), order.currency)}
                          </span>

                          {isToConfirm ? (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/orders/${order.id}`);
                              }}
                              className="h-9 min-h-[36px] rounded-xl px-4 text-xs font-semibold"
                            >
                              Confirm
                            </Button>
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.section>
          </div>

          {/* Right Rail: Low stock desktop alerts (Screen M1 rail) */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-foreground">Low stock</h3>
                <Link to="/products" className="text-xs font-semibold text-primary hover:underline">
                  Manage
                </Link>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>All products are in stock.</span>
                </div>
              ) : (
                <ul className="divide-y divide-border -mx-2">
                  {lowStockProducts.map((p: any) => {
                    const qty = Number(p.stockCount ?? p.inventory ?? p.stock ?? 0);
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/products`}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate text-xs font-medium text-foreground">{p.name || p.title}</p>
                            <span className={`text-[11px] font-semibold ${qty === 0 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                              {qty} in stock
                            </span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Overview;
