import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetWebsiteStatsQuery,
  useGetOrderHistoryQuery,
} from '@rentify/apis';

import { 
  BarChart3, 
  CreditCard, 
  ShoppingCart, 
  TrendingUp 
} from 'lucide-react';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { useChannels } from '../context/ChannelContext';
import { commerceClient } from '@rentify/shared/api';
import { useTranslation } from '@rentify/utils';

export function useStats() {
  const { language } = useTranslation() as { language?: string };
  const labels = language === 'kh' ? {
    orders: 'ការបញ្ជាទិញសរុប', ordersHelp: 'ការបញ្ជាទិញទាំងអស់ក្នុងរយៈពេលដែលបានជ្រើសរើស',
    revenue: 'ចំណូលសរុប', revenueHelp: 'ចំណូលដែលបានកត់ត្រាក្នុងរយៈពេលដែលបានជ្រើសរើស',
    average: 'តម្លៃមធ្យមនៃការបញ្ជាទិញ', averageHelp: 'ចំនួនមធ្យមក្នុងមួយការបញ្ជាទិញ',
    growth: 'កំណើនចំណូល', growthHelp: 'ការប្រែប្រួលចំណូលធៀបនឹងរយៈពេលមុន',
  } : {
    orders: 'Total Orders', ordersHelp: 'All orders placed in the selected period',
    revenue: 'Total Revenue', revenueHelp: 'Revenue recorded in the selected period',
    average: 'Average Order', averageHelp: 'Average amount per order',
    growth: 'Revenue Growth', growthHelp: 'Change in revenue versus the previous period',
  };
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [orderType, setOrderType] = useState('all');
  const [ownershipError, setOwnershipError] = useState(false);
  const [storeOrders, setStoreOrders] = useState<any[]>([]);
  const [storeOrdersLoading, setStoreOrdersLoading] = useState(false);

  const navigate = useNavigate();
  const { websiteData } = useThemeService();
  const { store } = useChannels();
  const websiteId = websiteData?.websiteId || null;
  
  const statsQuery = useGetWebsiteStatsQuery(
    {
      websiteId: websiteId || '', 
      period: selectedPeriod, 
      orderType,
    },
    {
      skip: !websiteId,
    }
  );

  // A handful of the newest orders for the dashboard's Recent Orders table.
  const recentOrdersQuery = useGetOrderHistoryQuery(
    { websiteId, page: 1, limit: 6 },
    { skip: !websiteId },
  );

  // If no websiteId, fetch marketplace orders for the store
  useEffect(() => {
    const storeId = store?.storeId || store?.id;
    if (websiteId || !storeId) return;
    let active = true;
    setStoreOrdersLoading(true);
    commerceClient.request<any>({ method: 'GET', path: `/api/stores/${storeId}/orders`, credentials: 'include' })
      .then((response) => {
        if (active && response.data?.orders) {
          setStoreOrders(response.data.orders.map((order: any) => ({
            ...order, totalAmount: order.totals?.total, orderDate: order.createdAt,
            shippingDetails: order.buyer,
          })));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setStoreOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [websiteId, store?.id, store?.storeId]);

  useEffect(() => {
    if (statsQuery.error && (statsQuery.error as any).status === 403) {
      setOwnershipError(true);
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [statsQuery.error, navigate]);

  const handlePeriodChange = (period: string) => setSelectedPeriod(period);
  const handleOrderTypeChange = (type: string) => setOrderType(type);

  // Compute metrics from websiteStats or storeOrders fallback
  const storeTotalRevenue = storeOrders.reduce(
    (sum, o) => sum + (parseFloat(o.totalAmount) || 0),
    0
  );
  const storeTotalOrders = storeOrders.length;
  const storeAvgOrderValue =
    storeTotalOrders > 0 ? storeTotalRevenue / storeTotalOrders : 0;

  // Plain, non-technical labels — a merchant reads these directly, no
  // translation key or jargon should ever surface here.
  const defaultMetrics = [
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      title: labels.orders,
      value: (websiteId
        ? statsQuery.data?.overview?.totalOrders?.toLocaleString()
        : storeTotalOrders.toLocaleString()) || '0',
      trend: statsQuery.data?.overview?.growthRate?.orders || 0,
      color: 'primary',
      tooltip: labels.ordersHelp,
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: labels.revenue,
      value: `$${(
        (websiteId ? statsQuery.data?.overview?.totalRevenue : storeTotalRevenue) || 0
      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: statsQuery.data?.overview?.growthRate?.revenue?.toFixed(2) || '0.00',
      color: 'success',
      tooltip: labels.revenueHelp,
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: labels.average,
      value: `$${parseFloat(
        String(
          (websiteId ? statsQuery.data?.overview?.avgOrderValue : storeAvgOrderValue) || 0
        )
      ).toFixed(2)}`,
      color: 'warning',
      tooltip: labels.averageHelp,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: labels.growth,
      value: `${statsQuery.data?.overview?.growthRate?.revenue?.toFixed(2) || '0.00'}%`,
      color: 'info',
      tooltip: labels.growthHelp,
    },
  ];

  // Marketplace-only Stores do not have a comparable Website stats period.
  // Keep their observed order values, but do not invent trend or growth data.
  const metrics = websiteId
    ? defaultMetrics
    : defaultMetrics.slice(0, 3).map(({ trend: _trend, ...metric }) => metric);

  const revenueData = (statsQuery.data?.trends || []).map((t: any) => ({
    date: t.date,
    revenue: parseFloat(t.revenue) || 0,
    orders: t.orders || 0,
  }));

  const productSales = [...(statsQuery.data?.products || [])]
    .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  // A short, most-recent-first list for the dashboard's Recent Orders table.
  // The marketplace-only fallback already has full order objects; the
  // website-backed path reuses whatever the stats endpoint returned.
  const recentOrders = (
    websiteId ? (recentOrdersQuery.data?.orders || []) : storeOrders
  )
    .slice()
    .sort((a: any, b: any) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 6);

  return {
    loading: websiteId ? statsQuery.isLoading : storeOrdersLoading,
    error: Boolean(statsQuery.isError && !storeOrders.length),
    ownershipError,
    metrics,
    revenueData,
    productSales,
    recentOrders,
    dateRange: statsQuery.data?.dateRange,
    selectedPeriod,
    orderType,
    handlePeriodChange,
    handleOrderTypeChange,
  };
}

export default useStats;
