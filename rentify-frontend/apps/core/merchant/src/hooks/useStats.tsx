import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetWebsiteStatsQuery 
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

  const defaultMetrics = [
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      title: 'platform.total_orders',
      value: (websiteId
        ? statsQuery.data?.overview?.totalOrders?.toLocaleString()
        : storeTotalOrders.toLocaleString()) || '0',
      trend: statsQuery.data?.overview?.growthRate?.orders || 0,
      color: 'primary',
      tooltip: 'platform.total_orders_tooltip',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'platform.total_revenue',
      value: `$${(
        (websiteId ? statsQuery.data?.overview?.totalRevenue : storeTotalRevenue) || 0
      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      trend: statsQuery.data?.overview?.growthRate?.revenue?.toFixed(2) || '0.00',
      color: 'success',
      tooltip: 'platform.total_revenue_tooltip',
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: 'platform.avg_order_value',
      value: `$${parseFloat(
        String(
          (websiteId ? statsQuery.data?.overview?.avgOrderValue : storeAvgOrderValue) || 0
        )
      ).toFixed(2)}`,
      color: 'warning',
      tooltip: 'platform.avg_order_value_tooltip',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'platform.revenue_growth',
      value: `${statsQuery.data?.overview?.growthRate?.revenue?.toFixed(2) || '0.00'}%`,
      color: 'info',
      tooltip: 'platform.revenue_growth_tooltip',
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

  return {
    loading: websiteId ? statsQuery.isLoading : storeOrdersLoading,
    error: Boolean(statsQuery.isError && !storeOrders.length),
    ownershipError,
    metrics,
    revenueData,
    productSales,
    dateRange: statsQuery.data?.dateRange,
    selectedPeriod,
    orderType,
    handlePeriodChange,
    handleOrderTypeChange,
  };
}

export default useStats;
