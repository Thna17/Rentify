import { useMemo, useState, useEffect } from 'react';
import { useGetOrderHistoryQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { useChannels } from '../context/ChannelContext';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';

/**
 * Customers, derived from existing orders rather than a dedicated backend
 * endpoint — every buyer who has placed at least one order, grouped by
 * contact, with their order count and lifetime spend. No new data source,
 * just a different view of orders the merchant already has.
 */
export function useCustomers() {
  const { websiteData } = useThemeService();
  const { store } = useChannels();
  const websiteId = websiteData?.websiteId || null;

  const [storeOrders, setStoreOrders] = useState([]);
  const [storeOrdersLoading, setStoreOrdersLoading] = useState(false);
  const [storeOrdersError, setStoreOrdersError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const orderHistory = useGetOrderHistoryQuery(
    { websiteId, page: 1, limit: 200 },
    { skip: !websiteId },
  );

  useEffect(() => {
    if (websiteId || !store?.id) return;
    let active = true;
    setStoreOrdersLoading(true);
    setStoreOrdersError(false);
    fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/marketplace-orders`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then((data) => {
        if (active && data?.orders) setStoreOrders(data.orders);
      })
      .catch(() => {
        if (active) setStoreOrdersError(true);
      })
      .finally(() => {
        if (active) setStoreOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [websiteId, store?.id, reloadKey]);

  const orders = websiteId ? orderHistory.data?.orders || [] : storeOrders;
  const isLoading = websiteId ? orderHistory.isLoading : storeOrdersLoading;
  const isError = websiteId ? Boolean(orderHistory.isError) : storeOrdersError;
  const refetch = () => (websiteId ? orderHistory.refetch() : setReloadKey((key) => key + 1));

  const customers = useMemo(() => {
    const byContact = new Map();

    for (const order of orders) {
      const name = order.shippingDetails?.name || order.customerName || 'Guest';
      const email = order.shippingDetails?.email || order.customerEmail || '';
      const phone = order.shippingDetails?.phone || order.customerPhone || '';
      const key = email || phone || name;
      if (!key) continue;

      const existing = byContact.get(key);
      const amount = parseFloat(order.totalAmount) || 0;
      const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : 0;

      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += amount;
        if (createdAt > existing.lastOrderAt) existing.lastOrderAt = createdAt;
      } else {
        byContact.set(key, {
          key,
          name,
          email,
          phone,
          orderCount: 1,
          totalSpent: amount,
          lastOrderAt: createdAt,
        });
      }
    }

    return [...byContact.values()].sort((a, b) => b.lastOrderAt - a.lastOrderAt);
  }, [orders]);

  return { customers, isLoading, isError, refetch };
}

export default useCustomers;
