import {
  LayoutGrid,
  BarChart2,
  Package,
  Store,
  ClipboardList,
  Receipt,
  Settings,
  ShoppingBag,
  CreditCard,
  Headphones,
  Search,
  Users,
  Boxes,
  MonitorSmartphone,
  UserCog,
  QrCode,
  ShieldCheck,
  Gauge,
  Tags,
} from 'lucide-react';
import { POS_URL } from '@rentify/shared/config/urls';

// One Store, three ways to sell. The sidebar is grouped by what a merchant does:
// Home · Catalog · Orders · Sales channels (Marketplace / Online store / POS,
// each shown only when the Store uses it) · Customers · Analytics · Finance ·
// Settings. `channel` hides an item when that channel is off for the Store.
export const ALL_TABS = [
  // --- Home ---
  {
    name: 'dashboard.overview',
    label: 'Home',
    icon: LayoutGrid,
    path: 'overview',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    section: 'overview',
  },

  // --- Products ---
  {
    name: 'dashboard.product.title',
    label: 'Products',
    icon: Package,
    path: 'products',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_products',
    section: 'sell',
  },
  {
    name: 'dashboard.categories',
    label: 'Categories',
    hint: 'Online store categories and marketplace categories',
    icon: Tags,
    path: 'categories',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_products',
    section: 'sell',
  },
  {
    name: 'dashboard.product.detail',
    label: 'Product Detail',
    icon: Package,
    path: 'products/:id',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_products',
    hideInSidebar: true,
  },
  {
    name: 'create product',
    label: 'Create Product',
    icon: Package,
    path: 'products/create',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_products',
    hideInSidebar: true,
  },
  {
    name: 'edit product',
    label: 'Edit Product',
    icon: Package,
    path: 'products/edit/:id',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_products',
    hideInSidebar: true,
  },
  {
    name: 'Store catalog',
    label: 'Store Catalog',
    icon: Boxes,
    path: 'catalog',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    hideInSidebar: true,
  },

  // --- Orders ---
  {
    name: 'dashboard.order.title',
    label: 'Orders',
    icon: ClipboardList,
    path: 'orders',
    views: ['all', 'storefront', 'pos'],
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    section: 'sell',
  },
  {
    name: 'dashboard.order.detail',
    label: 'Order Detail',
    icon: ClipboardList,
    path: 'orders/:id',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    hideInSidebar: true,
  },

  // --- Sales Channels: Marketplace, POS, Storefront ---
  {
    name: 'COD orders',
    label: 'Marketplace',
    hint: 'Orders from Rentify Marketplace',
    icon: ShoppingBag,
    path: 'marketplace-orders',
    views: ['all', 'marketplace'],
    // On its own the Marketplace view is simply "Orders" (cash-on-delivery orders).
    inView: { marketplace: { label: 'Orders', hint: 'Cash-on-delivery orders from the marketplace', section: 'sell' } },
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    channel: 'marketplace',
    section: 'channels',
  },
  {
    name: 'dashboard.channels.online_store',
    label: 'Online store',
    hint: 'Your own branded website',
    icon: Store,
    path: 'store-management',
    views: ['all', 'storefront'],
    inView: { storefront: { label: 'Customize store', hint: 'Theme, branding and store content', section: 'store' } },
    roles: ['admin', 'user', 'staff'],
    permission: null,
    ownerOnly: true,
    channel: 'storefront',
    section: 'channels',
  },
  {
    name: 'POS',
    label: 'Point of sale',
    hint: 'Sell at your counter',
    icon: MonitorSmartphone,
    path: 'pos',
    views: ['all', 'pos'],
    inView: { pos: { label: 'Point of sale', section: 'sell' } },
    externalHref: POS_URL,
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_pos',
    channel: 'pos',
    section: 'channels',
  },

  // --- Customers ---
  {
    name: 'dashboard.customers.title',
    label: 'Customers',
    icon: Users,
    path: 'customers',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    section: 'grow',
  },

  // --- Analytics ---
  {
    name: 'dashboard.analytics',
    label: 'Analytics',
    icon: BarChart2,
    path: 'analytics',
    views: ['all', 'storefront', 'pos'],
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
    section: 'grow',
  },

  // --- Finance: Invoices, Billing ---
  {
    name: 'dashboard.invoices.title',
    label: 'Invoices',
    icon: Receipt,
    path: 'invoices',
    views: ['all', 'storefront', 'pos'],
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_invoices',
    section: 'money',
  },
  {
    name: 'dashboard.usage.title',
    label: 'Billing',
    icon: CreditCard,
    path: 'usage',
    views: ['all', 'storefront', 'pos'],
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
    ownerOnly: true,
    section: 'money',
  },

  // --- Settings ---
  {
    name: 'dashboard.settings.title',
    label: 'Settings',
    icon: Settings,
    path: 'settings',
    roles: ['admin', 'user', 'staff'],
    permission: 'settings',
    section: 'settings',
    inView: { storefront: { path: 'settings/account', label: 'Account' } },
  },

  // --- Online store: the storefront admin. Only shown in the Online store view;
  // each item is an existing page. ---
  {
    name: 'Staff & roles',
    label: 'Staff & roles',
    hint: 'Invite people and set what they can do',
    icon: UserCog,
    path: 'settings/staff',
    roles: ['admin', 'user', 'staff'],
    permission: 'settings',
    ownerOnly: true,
    channel: 'storefront',
    views: ['storefront'],
    section: 'store',
  },
  {
    name: 'Payments',
    label: 'Payments',
    hint: 'KHQR and how customers pay',
    icon: QrCode,
    path: 'settings/payments',
    roles: ['admin', 'user', 'staff'],
    permission: 'settings',
    channel: 'storefront',
    views: ['storefront'],
    section: 'store',
  },
  {
    name: 'Security',
    label: 'Security',
    hint: 'Password and sign-in protection',
    icon: ShieldCheck,
    path: 'settings/security',
    roles: ['admin', 'user', 'staff'],
    permission: 'settings',
    views: ['storefront'],
    section: 'store',
  },
  {
    name: 'Usage',
    label: 'Usage',
    hint: 'What your store has used this period',
    icon: Gauge,
    path: 'usage/dashboard',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
    views: ['storefront'],
    section: 'store',
  },

  // --- Support: kept reachable, but folded under Settings rather than its
  // own top-level section, to stay to the eight requested sections. ---
  {
    name: 'dashboard.support',
    label: 'Support',
    icon: Headphones,
    path: 'help',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    section: 'settings',
  },
];

export const ADDITIONAL_NAV_ITEMS = {
  documents: [],
  secondary: [
    {
      name: 'Search',
      icon: Search,
      path: 'search',
    },
  ],
};
