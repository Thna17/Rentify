import {
  BarChart2, Boxes, ClipboardList, CreditCard, Headphones, LayoutGrid,
  MonitorSmartphone, Package, Receipt, Search, Settings, ShoppingBag,
  Store, Users, Warehouse,
} from 'lucide-react';
import { POS_URL } from '@rentify/shared/config/urls';

// Merchant workspace information architecture. This configuration controls
// presentation only; server APIs remain the authorization authority.
export const ALL_TABS = [
  {
    name: 'dashboard.overview', label: 'Overview', icon: LayoutGrid, path: 'overview',
    roles: ['admin', 'user', 'staff'], permission: null, section: 'workspace',
  },
  {
    name: 'dashboard.product.title', label: 'Products', icon: Package, path: 'products',
    roles: ['admin', 'user', 'staff'], permission: 'manage_products', section: 'catalog',
  },
  {
    name: 'dashboard.navigation.inventory', label: 'Inventory', icon: Warehouse, path: 'inventory',
    roles: ['admin', 'user', 'staff'], permission: 'manage_products', section: 'catalog',
  },
  {
    name: 'dashboard.product.detail', label: 'Product Detail', icon: Package, path: 'products/:id',
    roles: ['admin', 'user', 'staff'], permission: 'manage_products', hideInSidebar: true,
  },
  {
    name: 'create product', label: 'Create Product', icon: Package, path: 'products/create',
    roles: ['admin', 'user', 'staff'], permission: 'manage_products', hideInSidebar: true,
  },
  {
    name: 'edit product', label: 'Edit Product', icon: Package, path: 'products/edit/:id',
    roles: ['admin', 'user', 'staff'], permission: 'manage_products', hideInSidebar: true,
  },
  {
    name: 'Store catalog', label: 'Store Catalog', icon: Boxes, path: 'catalog',
    roles: ['admin', 'user', 'staff'], permission: null, channel: 'storefront', hideInSidebar: true,
  },
  {
    name: 'dashboard.order.title', label: 'Orders', icon: ClipboardList, path: 'orders',
    roles: ['admin', 'user', 'staff'], permission: 'manage_orders', section: 'operations',
  },
  {
    name: 'dashboard.order.detail', label: 'Order Detail', icon: ClipboardList, path: 'orders/:id',
    roles: ['admin', 'user', 'staff'], permission: 'manage_orders', hideInSidebar: true,
  },
  {
    name: 'dashboard.navigation.pos', label: 'POS', icon: MonitorSmartphone, path: 'pos',
    externalHref: POS_URL, roles: ['admin', 'user', 'staff'], permission: 'manage_pos',
    channel: 'pos', section: 'operations',
  },
  {
    name: 'dashboard.invoices.title', label: 'Invoices', icon: Receipt, path: 'invoices',
    roles: ['admin', 'user', 'staff'], permission: 'manage_invoices', section: 'operations',
  },
  {
    name: 'dashboard.navigation.storefront', label: 'Storefront', icon: Store, path: 'store-management',
    roles: ['admin', 'user', 'staff'], permission: null, channel: 'storefront', section: 'channels',
  },
  {
    name: 'dashboard.navigation.marketplace', label: 'Marketplace', icon: ShoppingBag, path: 'marketplace-orders',
    roles: ['admin', 'user', 'staff'], permission: 'manage_orders', channel: 'marketplace', section: 'channels',
  },
  {
    name: 'dashboard.navigation.reports', label: 'Reports', icon: BarChart2, path: 'reports',
    roles: ['admin', 'user', 'staff'], permission: 'manage_analytics', section: 'insights',
  },
  {
    name: 'dashboard.navigation.staff', label: 'Staff', icon: Users, path: 'staff',
    roles: ['admin', 'user', 'staff'], permission: 'manage_staff', section: 'manage',
  },
  {
    name: 'dashboard.settings.title', label: 'Settings', icon: Settings, path: 'settings',
    roles: ['admin', 'user', 'staff'], permission: 'settings', section: 'manage',
  },

  // Compatibility routes remain route-matchable without duplicating the
  // primary Phase 4 navigation.
  {
    name: 'dashboard.customers.title', label: 'Customers', icon: Users, path: 'customers',
    roles: ['admin', 'user', 'staff'], permission: 'manage_orders', hideInSidebar: true,
  },
  {
    name: 'dashboard.analytics', label: 'Analytics', icon: BarChart2, path: 'analytics',
    roles: ['admin', 'user', 'staff'], permission: 'manage_analytics', hideInSidebar: true,
  },
  {
    name: 'dashboard.usage.title', label: 'Billing', icon: CreditCard, path: 'usage',
    roles: ['admin', 'user', 'staff'], permission: 'manage_analytics', hideInSidebar: true,
  },
  {
    name: 'dashboard.support', label: 'Support', icon: Headphones, path: 'help',
    roles: ['admin', 'user', 'staff'], permission: null, hideInSidebar: true,
  },
];

export const ADDITIONAL_NAV_ITEMS = {
  documents: [],
  secondary: [{ name: 'Search', icon: Search, path: 'search' }],
};
