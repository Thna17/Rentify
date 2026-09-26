import { useMemo } from 'react';
import { useAuth } from '@rentify/utils';
import { motion } from 'framer-motion';
import { Calendar, Store, ShoppingBag, TerminalSquare, PlusCircle, Package, Rocket } from 'lucide-react';
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
import { MARKETING_URL } from '@rentify/shared/config/urls';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@rentify/shared/ui/select";

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

export const Overview = () => {
  const navigate = useNavigate();
  const { profile } = useAuth() as { profile?: { name?: string } };
  const { store, hasStorefront, hasMarketplace, hasPos } = useChannels();
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

  const firstName = useMemo(() => profile?.name?.split(' ')?.[0] || 'there', [profile?.name]);
  const greeting = useMemo(() => `${greetingForHour(new Date().getHours())}, ${firstName}`, [firstName]);

  if (ownershipError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Access denied</h2>
          <p className="text-sm text-muted-foreground">You don't have permission to view this dashboard.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Couldn't load your dashboard</h2>
          <p className="text-sm text-muted-foreground">Please try again in a moment.</p>
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
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{greeting}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here's how {store?.name || 'your store'} is doing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[160px] h-10 bg-card border-transparent [box-shadow:var(--shadow-soft)]">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue>{PERIOD_LABEL[selectedPeriod] || 'Last 7 days'}</SelectValue>
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

            {hasPos && (
              <button
                type="button"
                onClick={() => navigate('/pos')}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 shadow-sm"
              >
                <TerminalSquare className="h-4 w-4" />
                Open POS
              </button>
            )}
          </div>
        </div>

        {/* Sales channel status — compact pills, not boxes */}
        <div className="flex flex-wrap items-center gap-2">
          {hasMarketplace && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700">
              <ShoppingBag className="w-3.5 h-3.5" />
              Marketplace · <span className="capitalize">{store?.marketplaceApprovalStatus || 'Active'}</span>
            </span>
          )}

          {hasStorefront ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <Store className="w-3.5 h-3.5" />
              Storefront · Live
            </span>
          ) : (
            <a
              href={`${MARKETING_URL}/start`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-card [box-shadow:var(--shadow-soft)] text-primary hover:bg-primary/5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add a storefront
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
            POS · {hasPos ? 'Enabled' : 'Off'}
          </span>
        </div>

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
            <TopProducts
              products={productSales}
              isLoading={loading}
            />
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
                      Your products and stock are already set up — add a custom-domain website in minutes.
                    </p>
                  </div>
                </div>
                <a
                  href={`${MARKETING_URL}/start`}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-colors whitespace-nowrap shadow-sm shrink-0"
                >
                  Create Storefront
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
