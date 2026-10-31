import { useMemo } from 'react';
import { useChannelOrders } from './useChannelOrders';

/**
 * Customers, derived from the Store's orders on every channel (GET /api/stores/:storeId/orders):
 * each buyer who placed an order, grouped by name and contact, with order count, spend and the
 * channels they bought from. Contact details arrive masked once an order is finished.
 */
export function useCustomers() {
  const { orders, loading, error, reload } = useChannelOrders('all', 'all');

  const customers = useMemo(() => {
    const byContact = new Map();
    for (const order of orders) {
      if (order.channel === 'pos' && !order.buyer?.phone && !order.buyer?.email) continue; // walk-in sales
      const name = order.buyer?.name || '';
      const phone = order.buyer?.phone || '';
      const email = order.buyer?.email || '';
      const key = `${name.toLowerCase()}|${phone || email}`;
      const amount = order.status === 'cancelled' ? 0 : Number(order.totals?.total || 0);
      const createdAt = order.createdAt ? new Date(order.createdAt).getTime() : 0;
      const existing = byContact.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += amount;
        existing.channels.add(order.channel);
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
          channels: new Set([order.channel]),
        });
      }
    }
    return [...byContact.values()].sort((a, b) => b.lastOrderAt - a.lastOrderAt);
  }, [orders]);

  return { customers, isLoading: loading, isError: error, refetch: reload };
}

export default useCustomers;
