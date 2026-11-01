import { describe, it, expect } from 'vitest';
import { resolveChannelView, type ChannelView } from './channelViewPolicy';
import { countByTab, workTab, type ChannelFilter } from '../pages/order-management/orderModel';

describe('Channel switcher cross-feature policy & integration', () => {
  describe('Channel view resolution & switcher state', () => {
    it('defaults to "all" when no channel has been chosen', () => {
      expect(resolveChannelView(null, ['all', 'marketplace', 'storefront', 'pos'])).toBe('all');
      expect(resolveChannelView('', ['all', 'marketplace', 'storefront', 'pos'])).toBe('all');
    });

    it('retains an explicitly chosen channel when available', () => {
      expect(resolveChannelView('marketplace', ['all', 'marketplace', 'storefront', 'pos'])).toBe('marketplace');
      expect(resolveChannelView('storefront', ['all', 'marketplace', 'storefront', 'pos'])).toBe('storefront');
      expect(resolveChannelView('pos', ['all', 'marketplace', 'storefront', 'pos'])).toBe('pos');
      expect(resolveChannelView('all', ['all', 'marketplace', 'storefront', 'pos'])).toBe('all');
    });

    it('orders channel options with storefront first: all, storefront, marketplace, pos', () => {
      const buildAvailableViews = (hasStorefront: boolean, hasMarketplace: boolean, posEnabled: boolean): ChannelView[] => [
        'all',
        ...(hasStorefront ? (['storefront'] as const) : []),
        ...(hasMarketplace ? (['marketplace'] as const) : []),
        ...(posEnabled ? (['pos'] as const) : []),
      ];

      expect(buildAvailableViews(true, true, true)).toEqual([
        'all',
        'storefront',
        'marketplace',
        'pos',
      ]);
      expect(buildAvailableViews(true, false, true)).toEqual(['all', 'storefront', 'pos']);
      expect(buildAvailableViews(false, true, true)).toEqual(['all', 'marketplace', 'pos']);
    });
  });

  describe('Orders inbox filtering & URL synchronization', () => {
    const mockOrders = [
      { id: 'o1', orderNumber: 'ORD-1', channel: 'marketplace', status: 'pending', fulfillmentStatus: 'pending', payment: { method: 'COD', status: 'pending' }, reports: [], allowedActions: [{ code: 'delivered' }] },
      { id: 'o2', orderNumber: 'ORD-2', channel: 'storefront', status: 'confirmed', fulfillmentStatus: 'pending', payment: { method: 'KHQR', status: 'completed' }, reports: [], allowedActions: [] },
      { id: 'o3', orderNumber: 'ORD-3', channel: 'pos', status: 'completed', fulfillmentStatus: 'delivered', payment: { method: 'CASH', status: 'completed' }, reports: [], allowedActions: [] },
      { id: 'o4', orderNumber: 'ORD-4', channel: 'invoice', status: 'pending', fulfillmentStatus: 'pending', payment: { method: 'KHQR', status: 'pending' }, reports: [], allowedActions: [] },
    ];

    it('filters orders appropriately when channel view is selected', () => {
      const filterBy = (view: ChannelFilter) =>
        mockOrders.filter((o) => (view === 'all' ? true : o.channel === view));

      expect(filterBy('all')).toHaveLength(4);
      expect(filterBy('marketplace').map((o) => o.id)).toEqual(['o1']);
      expect(filterBy('storefront').map((o) => o.id)).toEqual(['o2']);
      expect(filterBy('pos').map((o) => o.id)).toEqual(['o3']);
      expect(filterBy('invoice').map((o) => o.id)).toEqual(['o4']);
    });

    it('calculates tab counts correctly per channel view', () => {
      const marketOrders = mockOrders.filter((o) => o.channel === 'marketplace');
      const posOrders = mockOrders.filter((o) => o.channel === 'pos');

      const marketCounts = countByTab(marketOrders);
      expect(marketCounts.deliver).toBe(1);
      expect(marketCounts.done).toBe(0);

      const posCounts = countByTab(posOrders);
      expect(posCounts.deliver).toBe(0);
      expect(posCounts.done).toBe(1);
    });

    it('resolves channel from view while respecting non-switcher channels like invoice', () => {
      const resolveOrderChannel = (channelParam: string | null, view: ChannelView): ChannelFilter =>
        channelParam === 'invoice' ? 'invoice' : view;

      // Normal switcher operation
      expect(resolveOrderChannel(null, 'marketplace')).toBe('marketplace');
      expect(resolveOrderChannel(null, 'pos')).toBe('pos');
      expect(resolveOrderChannel(null, 'all')).toBe('all');

      // Manual invoice deep link
      expect(resolveOrderChannel('invoice', 'all')).toBe('invoice');

      // If user switches away from invoice via the switcher to storefront
      expect(resolveOrderChannel(null, 'storefront')).toBe('storefront');
    });
  });

  describe('Products catalog hidden filter per channel', () => {
    const products = [
      { id: 'p1', name: 'Product 1', status: 'active', marketplaceVisibility: true, storefrontVisibility: true },
      { id: 'p2', name: 'Product 2', status: 'active', marketplaceVisibility: false, storefrontVisibility: true },
      { id: 'p3', name: 'Product 3', status: 'active', marketplaceVisibility: true, storefrontVisibility: false },
      { id: 'p4', name: 'Product 4', status: 'active', marketplaceVisibility: false, storefrontVisibility: false },
    ];

    const isHiddenOnChannel = (p: typeof products[0], view: ChannelView, hasStorefront: boolean) => {
      if (view === 'storefront') return p.storefrontVisibility === false;
      if (view === 'marketplace') return p.marketplaceVisibility === false;
      return p.marketplaceVisibility === false || (hasStorefront && p.storefrontVisibility === false);
    };

    it('identifies hidden products correctly for the marketplace view', () => {
      const hidden = products.filter((p) => isHiddenOnChannel(p, 'marketplace', true));
      expect(hidden.map((p) => p.id)).toEqual(['p2', 'p4']);
    });

    it('identifies hidden products correctly for the storefront view', () => {
      const hidden = products.filter((p) => isHiddenOnChannel(p, 'storefront', true));
      expect(hidden.map((p) => p.id)).toEqual(['p3', 'p4']);
    });

    it('identifies hidden products correctly for all channels', () => {
      const hidden = products.filter((p) => isHiddenOnChannel(p, 'all', true));
      expect(hidden.map((p) => p.id)).toEqual(['p2', 'p3', 'p4']);
    });
  });

  describe('Customers channel filtering', () => {
    const customers = [
      { name: 'Buyer A', channels: new Set(['marketplace']) },
      { name: 'Buyer B', channels: new Set(['storefront']) },
      { name: 'Buyer C', channels: new Set(['pos']) },
      { name: 'Buyer Multi', channels: new Set(['marketplace', 'pos']) },
    ];

    const filterCustomers = (channelView: ChannelView) => {
      if (channelView === 'all') return customers;
      return customers.filter((c) => c.channels.has(channelView));
    };

    it('filters customer directory to the active channel', () => {
      expect(filterCustomers('all')).toHaveLength(4);
      expect(filterCustomers('marketplace').map((c) => c.name)).toEqual(['Buyer A', 'Buyer Multi']);
      expect(filterCustomers('storefront').map((c) => c.name)).toEqual(['Buyer B']);
      expect(filterCustomers('pos').map((c) => c.name)).toEqual(['Buyer C', 'Buyer Multi']);
    });
  });

  describe('Categories channel visibility', () => {
    const checkCategoryVisibility = (view: ChannelView, hasStorefront: boolean, hasMarketplace: boolean) => {
      const combined = view === 'all' || view === 'pos';
      const showStore = hasStorefront && (combined || view === 'storefront');
      const showMarket = hasMarketplace && (combined || view === 'marketplace');
      return { showStore, showMarket };
    };

    it('shows only marketplace categories when marketplace is active', () => {
      expect(checkCategoryVisibility('marketplace', true, true)).toEqual({ showStore: false, showMarket: true });
    });

    it('shows only storefront categories when storefront is active', () => {
      expect(checkCategoryVisibility('storefront', true, true)).toEqual({ showStore: true, showMarket: false });
    });

    it('shows both category sets when all channels or POS is active', () => {
      expect(checkCategoryVisibility('all', true, true)).toEqual({ showStore: true, showMarket: true });
      expect(checkCategoryVisibility('pos', true, true)).toEqual({ showStore: true, showMarket: true });
    });
  });
});
