import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useTranslation } from '@rentify/utils';
import { AlertTriangle, ChevronRight, ClipboardList, Globe, MonitorSmartphone, ShoppingBag } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { useChannels } from '../../context/ChannelContext';
import { useChannelOrders, type StoreOrder } from '../../hooks/useChannelOrders';
import { useMarketplaceListing } from '../../hooks/useMarketplaceListing';
import { openPosApp, storefrontDomain, storefrontUrl } from '../../utils/storeLinks';
import { SetupGuideCard } from '../../app/features/setup-guide/SetupGuideCard';
import { useSetupGuide } from '../../app/features/setup-guide/SetupGuideContext';
import { StatusPill } from '../../components/data-table/StatusPill';
import { useAccess } from '../../utils/access';
import { StaffHome } from './StaffHome';
import { CampaignInvitation } from '../campaigns/CampaignInvitation';
import { PageShell, StatePanel } from '../../components/page/PagePrimitives';
import { PaymentPill } from '../order-management/components/PaymentPill';
import { countByTab, money, orderLabel, paymentKind, workTab, type WorkTab } from '../order-management/orderModel';


export const Surface = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div data-slot="card" className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6 ${className}`}>{children}</div>
);

export const SectionTitle = ({ title, meta }: { title: string; meta?: ReactNode }) => (
  <div className="mb-3 flex items-baseline justify-between gap-3">
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    {meta && <span className="text-right text-sm text-muted-foreground">{meta}</span>}
  </div>
);

export const ChannelBadge = ({ channel }: { channel: StoreOrder['channel'] }) => {
  const { t } = useTranslation();
  return <StatusPill tone="neutral">{t(`merchant.orders.channels.${channel}`)}</StatusPill>;
};

export const Kpi = ({ label, value, sub, loading }: { label: string; value: string; sub: string; loading: boolean }) => (
  <Surface className="flex min-h-[124px] flex-col justify-between gap-3">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    {loading ? (
      <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
    ) : (
      <p className="truncate text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
    )}
    <p className="truncate text-xs text-muted-foreground">{sub}</p>
  </Surface>
);

const ATTENTION: WorkTab[] = ['deliver', 'cash', 'waiting', 'problems'];
const LISTING_TONE = { listed: 'success', pending: 'info', paused: 'danger', off: 'neutral', unknown: 'neutral' } as const;

const greetingKey = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

/** Home: staff who don't handle orders (a cashier) get their own Home (M29); everyone else gets M1/M2. */
export const Overview = () => {
  const access = useAccess();
  return !access.isOwner && !access.can('manage_orders') ? <StaffHome /> : <OwnerHome />;
};

/** Home (redesign M1, M2): what needs doing, today's numbers, where you sell, recent orders. */
const OwnerHome = () => {
  const { t } = useTranslation();
  const { profile } = useAuth() as { profile?: { name?: string } };
  // The header's channel switcher decides which channel Home shows
  const { store, hasStorefront, hasMarketplace, hasPos, view: channel } = useChannels();
  const { orders, loading, error, reload } = useChannelOrders('all', 'all');
  const listing = useMarketplaceListing();
  const { guide, hidden: guideHidden, setHidden: setGuideHidden } = useSetupGuide();

  const inChannel = useMemo(
    () => (channel === 'all' ? orders : orders.filter((order) => order.channel === channel)),
    [orders, channel],
  );
  const counts = useMemo(() => countByTab(inChannel), [inChannel]);
  const todayKey = new Date().toDateString();
  const today = inChannel.filter((order) => order.status !== 'cancelled' && new Date(order.createdAt).toDateString() === todayKey);
  const todaySales = today.reduce((sum, order) => sum + Number(order.totals?.total || 0), 0);
  const cashToCollect = inChannel
    .filter((order) => order.status !== 'cancelled' && paymentKind(order) === 'cod_due')
    .reduce((sum, order) => sum + Number(order.payment?.amountDue || 0), 0);
  const recent = [...inChannel].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5);
  const lowStock = listing.products
    .filter((product) => product.status === 'active' && Number(product.stockQuantity || 0) <= 3)
    .slice(0, 5);

  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const greeting = t(`merchant.home.greeting.${greetingKey(new Date().getHours())}`, { name: firstName || '' }).replace(/,\s*$/, '');
  const settingUp = Boolean(guide && !guide.complete && !loading && orders.length === 0);
  const domain = storefrontDomain(store);
  const ordersLink = (tab: WorkTab) => `/orders?tab=${tab}${channel !== 'all' ? `&channel=${channel}` : ''}`;

  return (
    <PageShell>
      <CampaignInvitation />
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{store?.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{greeting}</h1>
      </div>

      {/* The setup guide can be hidden; while it is unfinished, Home keeps a way back to it */}
      {guide && !guide.complete && guideHidden && (
        <button
          type="button"
          onClick={() => setGuideHidden(false)}
          className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-left text-sm shadow-[var(--shadow-soft)] hover:bg-muted/40"
        >
          <span>
            <span className="font-semibold text-foreground">{t('merchant.setup.menuEntry')}</span>
            <span className="text-muted-foreground"> · {t('merchant.setup.progress', { done: guide.doneCount, total: guide.totalCount })}</span>
          </span>
          <span className="font-semibold text-foreground">{t('merchant.setup.continue')}</span>
        </button>
      )}

      {settingUp && (
        <div className="space-y-2">
          <SetupGuideCard />
          <p className="text-sm text-muted-foreground">{t('merchant.home.afterFirstOrder')}</p>
        </div>
      )}

      {error ? (
        <StatePanel
          tone="error"
          icon={<AlertTriangle className="h-5 w-5" />}
          title={t('merchant.home.loadError')}
          body={t('merchant.orders.loadErrorBody')}
          action={<Button variant="outline" onClick={reload} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <section>
              <SectionTitle title={t('merchant.home.attention')} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ATTENTION.map((tab) => (
                  <Link
                    key={tab}
                    to={ordersLink(tab)}
                    className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-foreground/30"
                  >
                    {loading ? (
                      <span className="h-7 w-10 animate-pulse rounded bg-muted" aria-hidden="true" />
                    ) : (
                      <span className="text-2xl font-semibold tabular-nums text-foreground">{counts[tab]}</span>
                    )}
                    <span className="text-sm font-medium text-muted-foreground">{t(`merchant.orders.tabs.${tab}`)}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle
                title={t('merchant.home.today')}
                meta={<Link to="/analytics" className="font-semibold text-foreground underline-offset-4 hover:underline">{t('merchant.home.analytics') || t('merchant.home.reports')}</Link>}
              />
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t('merchant.home.ordersToday'), value: String(today.length) },
                  { label: t('merchant.home.salesToday'), value: money(todaySales) },
                  { label: t('merchant.orders.tabs.cash'), value: money(cashToCollect) },
                ].map((tile) => (
                  <div key={tile.label} className="flex min-h-[84px] min-w-0 flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4">
                    <span className="break-words text-xs font-medium text-muted-foreground sm:text-sm">{tile.label}</span>
                    {loading ? (
                      <span className="h-6 w-14 animate-pulse rounded bg-muted" aria-hidden="true" />
                    ) : (
                      <b className="truncate text-base font-semibold tabular-nums text-foreground sm:text-xl">{tile.value}</b>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle title={t('merchant.home.whereYouSell')} />
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                {hasMarketplace && (
                  <ChannelRow
                    to="/marketplace"
                    icon={<ShoppingBag className="h-5 w-5" />}
                    title={t('merchant.home.marketplace')}
                    detail={
                      listing.loading
                        ? '…'
                        : t('merchant.home.productsShown', { count: listing.shown.length })
                    }
                    end={<StatusPill tone={LISTING_TONE[listing.status]}>{t(`merchant.marketplace.status.${listing.status}`)}</StatusPill>}
                  />
                )}
                {hasStorefront && (
                  <ChannelRow
                    to="/online-store"
                    icon={<Globe className="h-5 w-5" />}
                    title={t('merchant.orders.channels.storefront')}
                    detail={domain || t('merchant.home.noAddress')}
                    end={
                      storefrontUrl(store) ? (
                        <a
                          href={storefrontUrl(store) as string}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                        >
                          {t('merchant.home.visit')}
                        </a>
                      ) : null
                    }
                  />
                )}
                {hasPos && (
                  <button
                    type="button"
                    onClick={openPosApp}
                    className="flex min-h-[64px] w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
                        <MonitorSmartphone className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{t('merchant.home.pos')}</span>
                        <span className="block truncate text-sm text-muted-foreground">{t('merchant.home.posDetail')}</span>
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-foreground">{t('merchant.home.openRegister')}</span>
                  </button>
                )}
              </div>
            </section>

            <section>
              <SectionTitle
                title={t('merchant.home.recentOrders')}
                meta={<Link to="/orders" className="font-semibold text-foreground underline-offset-4 hover:underline">{t('merchant.home.seeAll')}</Link>}
              />
              {loading ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-card" />)}
                </div>
              ) : recent.length === 0 ? (
                <StatePanel
                  icon={<ClipboardList className="h-5 w-5" />}
                  title={t('merchant.home.noOrders')}
                  body={t('merchant.orders.emptyBody')}
                />
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                  {recent.map((order) => (
                    <li key={order.id}>
                      <Link to={`/orders/${order.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50">
                        <span className="min-w-0 space-y-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{orderLabel(order)}</span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {order.buyer?.name || t('merchant.orders.buyerUnknown')} · {t(`merchant.orders.tabs.${workTab(order)}`)}
                          </span>
                          <span className="flex flex-wrap gap-1.5">
                            <ChannelBadge channel={order.channel} />
                            <PaymentPill order={order} />
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{money(order.totals?.total, order.currency)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="min-w-0">
            <Surface className="space-y-3">
              <SectionTitle
                title={t('merchant.home.lowStock')}
                meta={<Link to="/products" className="font-semibold text-foreground underline-offset-4 hover:underline">{t('merchant.home.manage')}</Link>}
              />
              {listing.loading ? (
                <div className="h-16 animate-pulse rounded-xl bg-muted" />
              ) : lowStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('merchant.home.stockOk')}</p>
              ) : (
                <ul className="-mx-2 divide-y divide-border">
                  {lowStock.map((product) => (
                    <li key={product.id}>
                      <Link to={`/products/edit/${product.id}`} className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg p-2 hover:bg-muted/50">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                          <span className={`text-xs font-semibold ${Number(product.stockQuantity) === 0 ? 'text-destructive' : 'text-[var(--rentify-color-warning-text)]'}`}>
                            {Number(product.stockQuantity) === 0 ? t('merchant.home.soldOut') : t('merchant.home.left', { count: product.stockQuantity })}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </aside>
        </div>
      )}
    </PageShell>
  );
};

function ChannelRow({ to, icon, title, detail, end }: { to: string; icon: ReactNode; title: string; detail: string; end?: ReactNode }) {
  return (
    <div className="flex min-h-[64px] items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50">
      <Link to={to} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
          <span className="block truncate text-sm text-muted-foreground">{detail}</span>
        </span>
      </Link>
      {end}
    </div>
  );
}

export default Overview;
