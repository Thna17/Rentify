import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from "@rentify/shared/ui/card";
import { Button } from "@rentify/shared/ui/button";
import { Badge } from "@rentify/shared/ui/badge";
import { Input } from "@rentify/shared/ui/input";
import { 
  Search, 
  Filter, 
  RefreshCw,
  Eye,
  Package
} from 'lucide-react';
import { useGetPOSOrdersQuery } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export const OrderHistory = ({ orders: sessionOrders = [], websiteId, storeId }) => {
  const { t } = useTranslation();
  const { data: ordersData, isLoading, isError } = useGetPOSOrdersQuery(
    { websiteId: websiteId || undefined, storeId: websiteId ? undefined : storeId },
    { skip: !websiteId && !storeId }
  );
  const [searchTerm, setSearchTerm] = useState('');

  const orders = useMemo(() => {
    const fetched = ordersData?.orders ? ordersData.orders.map(order => ({
      id: order.id,
      items: order.items?.map(item => ({
        ...item,
        product: item.product || { name: item.name || "Product" }
      })) || [],
      total: order.totalAmount || order.total,
      paymentMethod: order.paymentMethod,
      timestamp: new Date(order.orderDate || order.createdAt),
      status: order.status || 'completed'
    })) : [];

    // Combine session orders with backend orders without duplicate IDs
    const combined = [...sessionOrders];
    fetched.forEach((item) => {
      if (!combined.some((o) => o.id === item.id)) {
        combined.push(item);
      }
    });

    return combined;
  }, [ordersData, sessionOrders]);

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.some((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted h-20 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">{t('dashboard.pos.order_history')}</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-60">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.pos.search_orders')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('dashboard.pos.filter')}
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('dashboard.pos.refresh')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {orders.length === 0 ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center p-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
                <Package className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.pos.no_orders_found')}</h3>
              <p className="text-muted-foreground">{t('dashboard.pos.orders_appear_here')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader className="bg-muted/50 border-b">
              <h3 className="font-semibold">
                {t('dashboard.pos.recent_orders')}
                <span className="text-muted-foreground ml-2">({filteredOrders.length})</span>
              </h3>
            </CardHeader>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.order_id')}</th>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.date_time')}</th>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.items')}</th>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.total')}</th>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.payment')}</th>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.status')}</th>
                    <th className="text-left p-4 font-semibold">{t('dashboard.pos.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono font-medium">{order.id}</td>
                      <td className="p-4">
                        <div>
                          <p>{order.timestamp.toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item) => (
                            <p key={item.id} className="text-sm flex items-center">
                              <span className="w-2 h-2 bg-muted-foreground rounded-full mr-2"></span>
                              {item.name} × {item.quantity}
                            </p>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-sm text-muted-foreground">
                              {t('dashboard.pos.more_items', { count: order.items.length - 2 })}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-semibold">${order.total}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="border-dashed">
                          {order.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};