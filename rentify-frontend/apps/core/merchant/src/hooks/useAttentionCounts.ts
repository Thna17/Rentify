import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { useChannels } from '../context/ChannelContext';
import { countByTab } from '../pages/order-management/orderModel';

/**
 * Menu counts (redesign M_MENU): orders to act on (to deliver + cash to collect) and problems to
 * answer, from the same order list and rules as the inbox and Home. Re-read when the page changes,
 * so a count drops right after the merchant acts. Skipped for people without the orders permission.
 */
export function useAttentionCounts(enabled: boolean) {
  const { store, view } = useChannels();
  const { pathname } = useLocation();
  const [counts, setCounts] = useState({ toAct: 0, problems: 0 });

  useEffect(() => {
    if (!enabled || !store?.id) return undefined;
    let active = true;
    const url = view && view !== 'all'
      ? `${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders?channel=${view}`
      : `${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders`;
    fetch(url, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data?.orders)) return;
        const tabs = countByTab(data.orders);
        setCounts({ toAct: tabs.deliver + tabs.cash, problems: tabs.problems });
      })
      .catch(() => undefined); // counts are a hint; the pages show the real state
    return () => {
      active = false;
    };
  }, [enabled, store?.id, pathname, view]);

  return counts;
}

export default useAttentionCounts;
