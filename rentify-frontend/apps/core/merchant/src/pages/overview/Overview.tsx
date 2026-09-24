import { useState } from 'react';
import { useTranslation } from '@rentify/utils';
import { motion } from 'framer-motion';
import { LayoutDashboard, Calendar, Filter, Store, ShoppingBag, TerminalSquare, PlusCircle } from 'lucide-react';
import useStats from '../../hooks/useStats';
import { MetricCard } from './components/MetricCard';
// @ts-ignore
import { TopProducts } from './components/TopProducts';
// @ts-ignore
import { RevenueChart } from './components/RevenueChart';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { useChannels } from '../../context/ChannelContext';
import { Badge } from '@rentify/shared/ui/badge';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { MARKETING_URL } from '@rentify/shared/config/urls';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@rentify/shared/ui/select";

export const Overview = () => {
  const { t } = useTranslation();
  const { store, hasStorefront, hasMarketplace, hasPos } = useChannels();
  const {
    loading,
    error,
    ownershipError,
    metrics,
    revenueData,
    productSales,
    dateRange,
    selectedPeriod,
    orderType,
    handlePeriodChange,
    handleOrderTypeChange
  } = useStats();

  const handleOrderChange = (value: string) => {
    handleOrderTypeChange(value);
  };

  const handlePeriodSelect = (value: string) => {
    handlePeriodChange(value);
  };

  const FilterActions = () => (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select value={selectedPeriod} onValueChange={handlePeriodSelect}>
        <SelectTrigger className="w-[140px] bg-background border-border">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">Last 24 Hours</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={orderType} onValueChange={handleOrderChange}>
        <SelectTrigger className="w-[150px] bg-background border-border">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Order channel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          {hasStorefront && <SelectItem value="online">Storefront</SelectItem>}
          {hasMarketplace && <SelectItem value="marketplace">Marketplace</SelectItem>}
          {hasPos && <SelectItem value="pos">POS</SelectItem>}
          <SelectItem value="manual">Manual Invoice</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (ownershipError) {
    return (
      <div className="flex items-center justify-center h-64 bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view this dashboard</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Error Loading Data</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Dashboard Overview"
        description="Monitor sales performance and operations across your sales channels"
        icon={LayoutDashboard}
        actions={<FilterActions />}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Overview' }
        ]}
      />

      <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
        {/* Sales Channels Status Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card text-card-foreground">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">
            Active Channels:
          </span>

          {/* Marketplace Channel Badge */}
          {hasMarketplace && (
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Marketplace: <span className="capitalize">{store?.marketplaceApprovalStatus || 'Active'}</span></span>
            </Badge>
          )}

          {/* Storefront Channel Badge */}
          {hasStorefront ? (
            <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
              <Store className="w-3.5 h-3.5" />
              <span>Storefront: Active</span>
            </Badge>
          ) : (
            <a
              href={`${MARKETING_URL}/start`}
              className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Storefront Website</span>
            </a>
          )}

          {/* POS Channel Badge */}
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 py-1 px-3 ${
              hasPos
                ? 'border-purple-500/30 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                : 'text-muted-foreground border-border'
            }`}
          >
            <TerminalSquare className="w-3.5 h-3.5" />
            <span>POS: {hasPos ? 'Enabled' : 'Disabled'}</span>
          </Badge>
        </div>

        {/* Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          {metrics.map((metric: any, index: number) => (
            <MetricCard key={index} {...(metric as any)} loading={loading} />
          ))}
        </motion.div>

        {/* Charts & Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 md:gap-6 grid-cols-1 xl:grid-cols-3"
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

        {/* Storefront Promotion Card for Marketplace-Only Merchants */}
        {!hasStorefront && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-900">
              <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <h3 className="text-lg font-semibold text-blue-950 dark:text-blue-200">
                    Ready to launch your own branded storefront?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                    Expand beyond the marketplace with a custom domain, curated themes, and direct checkout. Your products and inventory are already synced and ready.
                  </p>
                </div>
                <a
                  href={`${MARKETING_URL}/start`}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors whitespace-nowrap shadow-sm"
                >
                  Create Storefront Website
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
