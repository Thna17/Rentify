import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
} from '@rentify/shared/ui/card';

import {
  Button,
} from '@rentify/shared/ui/button';

import {
  Input
} from '@rentify/shared/ui/input';

import {
  Badge,
} from '@rentify/shared/ui/badge';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@rentify/shared/ui/select';

import { useGetMyOrdersQuery } from '@rentify/storefront/api';
import { useStorefrontWebsite as useWebsiteData } from '@rentify/storefront/website';
import { Filter, Package, Search } from 'lucide-react';
import { OrderCard } from './components/OrderCard';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext'; 

export const CustomerOrder = () => {
  const navigate = useNavigate();
  const { websiteId } = useWebsiteData();
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { t } = useTranslation(); // Translation function

  const {
    data: ordersData,
    isLoading,
    isError,
  } = useGetMyOrdersQuery({
    websiteId,
    page: currentPage,
    limit: ordersPerPage,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const filteredOrders = ordersData?.orders || [];
  const totalPages = ordersData?.totalPages || 1;

  // Translation map for status filters
  const statusTranslations = {
    all: t('orders.all_orders', 'All Orders'),
    completed: t('orders.completed', 'Completed'),
    pending: t('orders.pending', 'Pending'),
    processing: t('orders.processing', 'Processing'),
    canceled: t('orders.canceled', 'Canceled'),
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-success/10 text-success' };
      case 'pending':
        return { color: 'bg-warning/10 text-warning' };
      case 'processing':
        return { color: 'bg-info/10 text-info' };
      case 'canceled':
        return { color: 'bg-destructive/10 text-destructive' };
      default:
        return { color: 'bg-muted/10 text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 md:p-8 shadow-elegant animate-pulse w-full max-w-md">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-spin">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {t('orders.loading', 'Loading your orders...')}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 md:p-8 shadow-elegant text-center w-full max-w-md">
          <CardContent className="space-y-4">
            <Package className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('orders.error_loading', 'Error loading orders')}
            </h2>
            <p className="text-muted-foreground">
              {t('orders.try_again', 'Please try again later')}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              {t('orders.retry', 'Retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="border-b border-border/50">
        <div className=" mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {t('orders.order_history', 'Order History')}
                </h1>
              </div>

              <Button
                size="icon"
                variant="outline"
                className="md:hidden"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-muted-foreground text-sm -mt-2">
              {t('orders.track_manage', 'Track and manage your orders')}
            </p>
          </div>

          {/* Mobile Filters */}
          {showMobileFilters && (
            <div className="mt-4 md:hidden space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  placeholder={t(
                    'orders.search_placeholder',
                    'Search orders...'
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full bg-background border-border rounded-lg"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10 bg-background border-border rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">
                    {statusTranslations[statusFilter]}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border border-border bg-background">
                  {Object.entries(statusTranslations).map(([key, label]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="px-4 py-2 hover:bg-muted/50"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Desktop Filters */}
          <div className="hidden md:flex flex-col xs:flex-row gap-3 mt-4">
            <div className="relative flex-1 max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                placeholder={t('orders.search_placeholder', 'Search orders...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-background border-border rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-10 bg-background border-border rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">
                    {statusTranslations[statusFilter]}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border border-border bg-background">
                  {Object.entries(statusTranslations).map(([key, label]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="px-4 py-2 hover:bg-muted/50"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className=" mx-auto px-3 sm:px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {[
            {
              title: t('orders.total_orders', 'Total Orders'),
              value: filteredOrders.length,
            },
            {
              title: t('orders.completed', 'Completed'),
              value: filteredOrders.filter((o) => o.status === 'completed')
                .length,
            },
            {
              title: t('orders.pending', 'Pending'),
              value: filteredOrders.filter((o) => o.status === 'pending')
                .length,
            },
            {
              title: t('orders.total_spent', 'Total Spent'),
              value: `$${filteredOrders
                .reduce((sum, order) => sum + parseFloat(order.totalAmount), 0)
                .toFixed(2)}`,
            },
          ].map((stat, index) => (
            <Card
              key={index}
              className="hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="text-center py-12 sm:py-16 bg-gradient-card border-border/50 shadow-card">
            <CardContent>
              <Package className="w-16 h-16 sm:w-24 sm:h-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
              <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                {t('orders.no_orders', 'No orders found')}
              </h3>
              <p className="text-muted-foreground mb-4 sm:mb-6 px-2">
                {statusFilter === 'all'
                  ? t(
                      'orders.no_orders_message_all',
                      "You haven't placed any orders yet."
                    )
                  : t(
                      'orders.no_orders_message_filtered',
                      'No orders match your current filter criteria.'
                    )}
              </p>
              {statusFilter !== 'all' && (
                <Button
                  variant="outline"
                  onClick={() => setStatusFilter('all')}
                  className="mt-2"
                >
                  {t('orders.view_all_orders', 'View All Orders')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {t('orders.showing_orders', 'Showing {{count}} orders', {
                  count: filteredOrders.length,
                })}
              </p>
              {statusFilter !== 'all' && (
                <Badge
                  className={`${
                    getStatusConfig(statusFilter).color
                  } capitalize w-fit`}
                >
                  {statusTranslations[statusFilter]}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  className="bg-gradient-card border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300"
                  translateStatus={(status) =>
                    statusTranslations[status] || status
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrder;
