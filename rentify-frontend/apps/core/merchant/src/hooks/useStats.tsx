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

export function useStats() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [orderType, setOrderType] = useState('all');
  const [ownershipError, setOwnershipError] = useState(false);

  const navigate = useNavigate();
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  
  const statsQuery = useGetWebsiteStatsQuery(
    {
      websiteId, 
      period: selectedPeriod, 
      orderType,
    },
    {
      skip: !websiteId,
    }
  );

  useEffect(() => {
    if (statsQuery.error?.status === 403) {
      setOwnershipError(true);
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [statsQuery.error, navigate]);

  const handlePeriodChange = (period: string) => setSelectedPeriod(period);
  const handleOrderTypeChange = (type: string) => setOrderType(type);

  const metrics = statsQuery.data?.overview ? [
    {
      icon: <ShoppingCart className="w-5 h-5" />,
      title: 'platform.total_orders',
      value: statsQuery.data.overview.totalOrders?.toLocaleString() || '0',
      trend: statsQuery.data.overview.growthRate?.orders,
      color: 'primary',
      tooltip: 'platform.total_orders_tooltip',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'platform.total_revenue',
      value: `$${(statsQuery.data.overview.totalRevenue || 0).toLocaleString()}`,
      trend: statsQuery.data.overview.growthRate?.revenue?.toFixed(2) || '0.00',
      color: 'success',
      tooltip: 'platform.total_revenue_tooltip',
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: 'platform.avg_order_value',
      value: `$${parseFloat(statsQuery.data.overview.avgOrderValue || 0).toFixed(2)}`,
      color: 'warning',
      tooltip: 'platform.avg_order_value_tooltip',
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'platform.revenue_growth',
      value: `${statsQuery.data.overview.growthRate?.revenue?.toFixed(2) || '0.00'}%`,
      color: 'info',
      tooltip: 'platform.revenue_growth_tooltip',
    },
  ] : [];

  const revenueData = (statsQuery.data?.trends || []).map(t => ({
    date: t.date,
    revenue: parseFloat(t.revenue) || 0,
    orders: t.orders || 0,
  }));

  const productSales = [...(statsQuery.data?.products || [])]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 5);

  return {
    loading: statsQuery.isLoading,
    error: statsQuery.isError,
    ownershipError,
    metrics,
    revenueData,
    productSales,
    dateRange: statsQuery.data?.dateRange,
    selectedPeriod,
    orderType,
    handlePeriodChange,
    handleOrderTypeChange
  };
}

export default useStats;