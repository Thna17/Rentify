import { useMemo, useState } from 'react';
import { useAuth } from '@rentify/utils';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Check,
  ExternalLink,
  Globe,
  Package,
  PlusCircle,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  TerminalSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStats from '../../hooks/useStats';
import { MetricCard } from './components/MetricCard';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { TopProducts } from './components/TopProducts';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { RevenueChart } from './components/RevenueChart';
// @ts-expect-error Legacy JSX component has no declaration file yet.
import { RecentOrders } from './components/RecentOrders';
import { useChannels } from '../../context/ChannelContext';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { HOSTED_STOREFRONT_DOMAIN, MARKETING_URL, MARKETPLACE_URL } from '@rentify/shared/config/urls';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';

const PERIOD_LABEL: Record<string, string> = {
  '24h': 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

/** "Good morning" / "Good afternoon" / "Good evening", based on local time. */
const greetingForHour = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const slugify = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'store-name';

export const Overview = () => {
  const navigate = useNavigate();
  const { profile } = useAuth() as { profile?: { name?: string } };
  const { store, hasStorefront, hasMarketplace, hasPos } = useChannels();
  const [posVisited, setPosVisited] = useState(() => {
    try {
      return localStorage.getItem('rentify_pos_visited') === 'true';
    } catch {
      return false;
    }
  });

  const {
    loading,
    error,
    ownershipError,
    metrics,
    revenueData,
    productSales,
    recentOrders,
    dateRange,
    selectedPeriod,
    handlePeriodChange,
  } = useStats();

  const firstName = useMemo(
    () => profile?.name?.split(' ')?.[0] || 'there',
    [profile?.name]
  );
  const greeting = useMemo(
    () => `${greetingForHour(new Date().getHours())}, ${firstName}`,
    [firstName]
  );

  const storeObj = store as Record<string, any> | null;
  const rawStoreSlug = String(storeObj?.slug || '').trim();
  const isAutoUuidSlug = /^store-[0-9a-f-]{20,}$/i.test(rawStoreSlug);
  const storeSlug = slugify(
    (!isAutoUuidSlug && rawStoreSlug) || storeObj?.name
  );
  const storefrontDomain =
    storeObj?.websiteDomain ||
    `${storeSlug}.${HOSTED_STOREFRONT_DOMAIN || 'mekhla.digital'}`;
  const posUrl =
    typeof window !== 'undefined' && window.location.hostname.includes('mekhla.digital')
      ? 'https://rentify-pos.mekhla.digital'
      : 'http://localhost:4401';
  const templateOnboardingUrl = `${MARKETING_URL}/onboarding/starter?step=template`;

  const handleOpenPos = () => {
    try {
      localStorage.setItem('rentify_pos_visited', 'true');
      setPosVisited(true);
    } catch {
      // ignore storage errors
    }
    window.open(posUrl, '_blank', 'noopener,noreferrer');
  };

  if (ownershipError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            You don't have permission to view this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Couldn't load your dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
        {/* Greeting + date filter + quick actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
              {greeting}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here's how {store?.name || 'your store'} is doing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[160px] h-10 bg-card border-transparent [box-shadow:var(--shadow-soft)]">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue>
                  {PERIOD_LABEL[selectedPeriod] || 'Last 7 days'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => navigate('/products/create')}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-card [box-shadow:var(--shadow-soft)] text-sm font-medium text-foreground hover:bg-muted/60"
            >
              <Package className="h-4 w-4" />
              Add Product
            </button>

            <button
              type="button"
              onClick={handleOpenPos}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"
            >
              <TerminalSquare className="h-4 w-4" />
              Open POS
            </button>
          </div>
        </div>

        {/* Sales channel status — compact pills */}
        <div className="flex flex-wrap items-center gap-2">
          {hasMarketplace && (
            <a
              href={`${(MARKETPLACE_URL || 'https://rentify-market.mekhla.digital').replace(/\/+$/, '')}/stores/${(!isAutoUuidSlug && rawStoreSlug) || store?.id || storeSlug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors"
              title="View your shop on Rentify Marketplace"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Marketplace ·{' '}
              <span className="capitalize">
                {store?.marketplaceApprovalStatus || 'Active'}
              </span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          )}

          {hasStorefront ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <Store className="w-3.5 h-3.5" />
              Storefront · Live ({storefrontDomain})
            </span>
          ) : (
            <a
              href={templateOnboardingUrl}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-card shadow-[var(--shadow-soft)] text-primary hover:bg-primary/5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Get your own website (14-day free trial)
            </a>
          )}

          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              hasPos
                ? 'bg-violet-500/10 text-violet-700'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            POS · {hasPos ? 'Ready at Counter' : 'Available'}
          </span>
        </div>

        {/* Dashboard Checklist — Upgrade when ready */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
        >
          <Card className="border border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-teal-50/20 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                    <Sparkles className="h-3.5 w-3.5" />
                    Store Growth Checklist
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-foreground">
                    You’re live on Rentify Marketplace 🎉 — upgrade when ready
                  </h2>
                </div>
                <span className="inline-flex w-fit items-center rounded-full bg-blue-600/10 px-3.5 py-1 text-xs font-semibold text-blue-700">
                  Both unlock Starter (≈$5/mo) • 14-day free trial
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {/* Item 1: Get your own website */}
                <div
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                    hasStorefront
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                        hasStorefront
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Get your own website → pick template
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Live on{' '}
                        <span className="font-mono text-blue-600">
                          {storefrontDomain}
                        </span>
                      </p>
                    </div>
                  </div>

                  {hasStorefront ? (
                    <button
                      type="button"
                      onClick={() => navigate('/store-management')}
                      className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Customize
                    </button>
                  ) : (
                    <a
                      href={templateOnboardingUrl}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Pick Template
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {/* Item 2: Sell at your counter -> open POS */}
                <div
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                    posVisited || hasStorefront
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                        posVisited || hasStorefront
                          ? 'bg-emerald-600 text-white'
                          : 'border-2 border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Sell at your counter → open POS
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        Instant KHQR & cash checkout synced with your catalog
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenPos}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <TerminalSquare className="h-3.5 w-3.5" />
                    Open POS
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI cards */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
        >
          {metrics.map((metric: any, index: number) => (
            <MetricCard key={index} {...(metric as any)} loading={loading} />
          ))}
        </motion.div>

        {/* Revenue chart + Top products */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:gap-5 grid-cols-1 xl:grid-cols-3"
        >
          <div className="xl:col-span-2">
            <RevenueChart
              data={revenueData}
              dateRange={dateRange}
              isLoading={loading}
            />
          </div>

          <div>
            <TopProducts products={productSales} isLoading={loading} />
          </div>
        </motion.div>

        {/* Recent orders */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <RecentOrders orders={recentOrders} isLoading={loading} />
        </motion.div>

        {/* Storefront upsell, marketplace-only merchants */}
        {!hasStorefront && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-primary/[0.04] shadow-none">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 text-center md:text-left">
                  <Rocket className="hidden md:block h-8 w-8 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">
                      Ready for your own branded storefront?
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xl">
                      Your products and stock are already set up — pick a template and go live on{' '}
                      <span className="font-mono font-medium text-foreground">
                        {storefrontDomain}
                      </span>{' '}
                      with a 14-day free trial of Starter (≈$5/mo).
                    </p>
                  </div>
                </div>
                <a
                  href={templateOnboardingUrl}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-colors whitespace-nowrap shadow-sm shrink-0"
                >
                  Pick Website Template
                </a>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Overview;
