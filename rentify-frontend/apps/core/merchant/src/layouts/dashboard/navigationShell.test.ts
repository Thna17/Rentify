import { describe, it, expect } from 'vitest';
import { ALL_TABS } from '../../config/dashboard-tabs';
import { filterTabsByUserRole } from '../../utils/filterTabsByUserRole';
import { getCurrentTabData } from '../../utils/getCurrentTabData';
import { dashboardRoutes } from '../../routes/dashboardRoutes';
import { isNavItemActive } from './NavMain';

describe('MR1 · Navigation Shell & Redirects', () => {
  describe('Sitemap Redirects', () => {
    const children = dashboardRoutes.children;

    const findRedirect = (path: string) => {
      const match = children.find((c: any) => c.path === path);
      return match?.element?.props?.to;
    };

    it('redirects /marketplace-orders to /orders?channel=marketplace', () => {
      expect(findRedirect('marketplace-orders')).toBe('/orders?channel=marketplace');
    });

    it('redirects /catalog to /products', () => {
      expect(findRedirect('catalog')).toBe('/products');
    });

    it('redirects /products/manage to /products', () => {
      expect(findRedirect('products/manage')).toBe('/products');
    });

    it('redirects /analytics to /reports', () => {
      expect(findRedirect('analytics')).toBe('/reports');
    });

    it('redirects /store-management to /online-store', () => {
      expect(findRedirect('store-management')).toBe('/online-store');
    });

    it('redirects /usage and subroutes to /settings/billing', () => {
      expect(findRedirect('usage')).toBe('/settings/billing');
      expect(findRedirect('usage/dashboard')).toBe('/settings/billing');
      expect(findRedirect('usage/breakdown')).toBe('/settings/billing');
      expect(findRedirect('usage/billing')).toBe('/settings/billing');
    });

    it('redirects /ops/* to /settings/billing', () => {
      expect(findRedirect('ops/*')).toBe('/settings/billing');
    });

    it('redirects /support to /help', () => {
      expect(findRedirect('support')).toBe('/help');
    });

    it('serves /settings as the Settings list (no redirect)', () => {
      expect(findRedirect('settings')).toBeUndefined();
    });
  });

  describe('Sidebar Menu Structure (M_MENU)', () => {
    it('groups tabs exactly into main, channels, and more', () => {
      const visibleTabs = ALL_TABS.filter((t) => !t.hideInSidebar);

      const mainTabs = visibleTabs.filter((t) => t.section === 'main').map((t) => t.path);
      const channelTabs = visibleTabs.filter((t) => t.section === 'channels').map((t) => t.path);
      const moreTabs = visibleTabs.filter((t) => t.section === 'more').map((t) => t.path);

      // Group 1 (main): Home, Orders, Products, Customers, Reports, Invoices
      expect(mainTabs).toEqual(['overview', 'orders', 'products', 'customers', 'reports', 'invoices']);

      // Group 2 (channels): Marketplace, Online store, Point of sale
      expect(channelTabs).toEqual(['marketplace', 'online-store', 'pos']);

      // Group 3 (more): Returns & problems, Share your store, Settings, Help
      expect(moreTabs).toEqual(['returns', 'share', 'settings', 'help']);
    });
  });

  describe('Active Nav Item Resolution & Subroutes', () => {
    const overviewItem = { path: 'overview', label: 'Home' };
    const settingsItem = { path: 'settings', label: 'Settings' };
    const marketplaceItem = { path: 'marketplace', label: 'Marketplace' };
    const ordersItem = { path: 'orders', label: 'Orders' };

    it('activates settings and does NOT activate overview on /settings/delivery', () => {
      const { matchedTab } = getCurrentTabData('/settings/delivery', ALL_TABS);
      expect(matchedTab?.parentPath || matchedTab?.path).toBe('settings');

      expect(isNavItemActive(overviewItem, '/settings/delivery', matchedTab)).toBe(false);
      expect(isNavItemActive(settingsItem, '/settings/delivery', matchedTab)).toBe(true);
      expect(isNavItemActive(marketplaceItem, '/settings/delivery', matchedTab)).toBe(false);
    });

    it('activates overview on /overview and root /', () => {
      expect(isNavItemActive(overviewItem, '/overview', { path: 'overview' })).toBe(true);
      expect(isNavItemActive(overviewItem, '/', { path: 'overview' })).toBe(true);
      expect(isNavItemActive(settingsItem, '/overview', { path: 'overview' })).toBe(false);
    });

    it('activates marketplace on /marketplace and /marketplace/customization', () => {
      expect(isNavItemActive(marketplaceItem, '/marketplace', { path: 'marketplace' })).toBe(true);
      expect(isNavItemActive(marketplaceItem, '/marketplace/customization', { path: 'marketplace/customization' })).toBe(true);
      expect(isNavItemActive(overviewItem, '/marketplace', { path: 'marketplace' })).toBe(false);
      expect(isNavItemActive(overviewItem, '/marketplace/customization', { path: 'marketplace/customization' })).toBe(false);
    });

    it('activates orders on /orders and order details /orders/123', () => {
      expect(isNavItemActive(ordersItem, '/orders', { path: 'orders' })).toBe(true);
      expect(isNavItemActive(ordersItem, '/orders/123', { path: 'orders/:id' })).toBe(true);
      expect(isNavItemActive(overviewItem, '/orders/123', { path: 'orders/:id' })).toBe(false);
    });
  });

  describe('Cashier (Staff) Permission Trimming (Screen M29)', () => {
    it('trims menu to only POS, Home, and Help for a cashier with manage_pos only', () => {
      const cashierTabs = filterTabsByUserRole(
        ALL_TABS,
        'staff',
        ['manage_pos'],
        undefined,
        { hasStorefront: true, hasMarketplace: true, hasPos: true }
      ).filter((t) => !t.hideInSidebar);

      const paths = cashierTabs.map((t) => t.path);

      // Cashier must only see Home, Point of sale, and Help
      expect(paths).toContain('overview');
      expect(paths).toContain('pos');
      expect(paths).toContain('help');

      // Cashier must NOT see owner or management tools
      expect(paths).not.toContain('orders');
      expect(paths).not.toContain('products');
      expect(paths).not.toContain('customers');
      expect(paths).not.toContain('reports');
      expect(paths).not.toContain('invoices');
      expect(paths).not.toContain('marketplace');
      expect(paths).not.toContain('online-store');
      expect(paths).not.toContain('returns');
      expect(paths).not.toContain('share');
      expect(paths).not.toContain('settings');
    });
  });
});
