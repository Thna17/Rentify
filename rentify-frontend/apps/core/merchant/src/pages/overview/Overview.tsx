import { useState } from 'react';
import { useTranslation } from '@rentify/utils';
import { motion } from 'framer-motion';
import { LayoutDashboard, Calendar, Filter } from 'lucide-react';
import useStats from '../../hooks/useStats';
import { MetricCard } from './components/MetricCard';
// @ts-ignore
import { TopProducts } from './components/TopProducts';
// @ts-ignore
import { RevenueChart } from './components/RevenueChart';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@rentify/shared/ui/select";

export const Overview = () => {
  const { t } = useTranslation();
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
        <SelectTrigger className="w-[140px] bg-background border-border">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Order type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Orders</SelectItem>
          <SelectItem value="online">Online</SelectItem>
          <SelectItem value="pos">POS</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
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
    <div className="min-h-full bg-background">
      <PageHeader
        title="Dashboard Overview"
        description="Monitor your business performance and key metrics at a glance"
        icon={LayoutDashboard}
        actions={<FilterActions />}
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Overview' }
        ]}
      />

      <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3"
        >
          <div className="lg:col-span-2">
            {/* <InventoryStatus inventory={storageData} /> */}
          </div>
          
          <div>
            {/* <StorageOverview 
              storageData={storageData} 
              isLoading={loading} 
            /> */}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Overview;
