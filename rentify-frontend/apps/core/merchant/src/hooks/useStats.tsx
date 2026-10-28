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
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';

export function useStats() {
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
    if (websiteId || !store?.id) return;
    let active = true;
    setStoreOrdersLoading(true);
    fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/marketplace-orders`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.orders) {
          setStoreOrders(data.orders);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setStoreOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [websiteId, store?.id]);

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
      title: 'Total Orders',
      value: (websiteId
        ? statsQuery.data?.overview?.totalOrders?.toLocaleString()
        : storeTotalOrders.toLocaleString()) || '0',
      trend: statsQuery.data?.overview?.growthRate?.orders || 0,
      color: 'primary',
      tooltip: 'All orders placed in the selected period',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Total Revenue',
      value: `$${(
        (websiteId ? statsQuery.data?.overview?.totalRevenue : storeTotalRevenue) || 0
      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: statsQuery.data?.overview?.growthRate?.revenue?.toFixed(2) || '0.00',
      color: 'success',
      tooltip: 'Money earned in the selected period',
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: 'Average Order',
      value: `$${parseFloat(
        String(
          (websiteId ? statsQuery.data?.overview?.avgOrderValue : storeAvgOrderValue) || 0
        )
      ).toFixed(2)}`,
      color: 'warning',
      tooltip: 'Average amount spent per order',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Revenue Growth',
      value: `${statsQuery.data?.overview?.growthRate?.revenue?.toFixed(2) || '0.00'}%`,
      color: 'info',
      tooltip: 'Change in revenue versus the previous period',
    },
  ];

  const metrics = defaultMetrics;

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
