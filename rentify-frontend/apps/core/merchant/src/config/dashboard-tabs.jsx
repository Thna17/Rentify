import {
  LayoutGrid,
  BarChart2,
  Package,
  Store,
  ClipboardList,
  Receipt,
  TerminalSquare,
  Settings,
  ShoppingBag,
  CreditCard,
  Headphones,
  Search,
} from 'lucide-react';

// Define tab structure with clean labels, grouping sections, and channel requirements
export const ALL_TABS = [
  // --- Top Featured: Overview ---
  {
    name: 'dashboard.overview',
    label: 'Overview',
    icon: LayoutGrid,
    path: 'overview',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    section: 'overview',
  },

  // --- Catalog & Products ---
  {
    name: 'dashboard.product.title',
    label: 'Products',
    icon: Package,
    path: 'products',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_products',
    section: 'inventory',
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
    name: 'Store catalog',
    label: 'Store Catalog',
    icon: Package,
    path: 'catalog',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    channel: 'storefront',
    hideInSidebar: true,
  },

  // --- Sales & Orders ---
  {
    name: 'dashboard.order.title',
    label: 'Orders',
    icon: ClipboardList,
    path: 'orders',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    section: 'orders',
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
  {
    name: 'dashboard.invoices.title',
    label: 'Invoices',
    icon: Receipt,
    path: 'invoices',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_invoices',
    section: 'orders',
  },

  // --- Sales Channels ---
  {
    name: 'dashboard.store_management.title',
    label: 'Storefront Customization',
    icon: Store,
    path: 'store-management',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    channel: 'storefront',
    section: 'channels',
  },
  {
    name: 'COD orders',
    label: 'Marketplace Orders',
    icon: ShoppingBag,
    path: 'marketplace-orders',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    channel: 'marketplace',
    section: 'channels',
  },
  {
    name: 'dashboard.pos.title',
    label: 'Point of Sale',
    icon: TerminalSquare,
    path: 'pos',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_pos',
    channel: 'pos',
    section: 'channels',
  },

  // --- Analytics ---
  {
    name: 'dashboard.analytics',
    label: 'Analytics',
    icon: BarChart2,
    path: 'analytics',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
    section: 'analytics',
  },

  // --- Store Plan & Billing ---
  {
    name: 'dashboard.usage.title',
    label: 'Plan & Billing',
    icon: CreditCard,
    path: 'usage',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
    section: 'billing',
  },

  // --- Store Settings ---
  {
    name: 'dashboard.settings.title',
    label: 'Store Settings',
    icon: Settings,
    path: 'settings',
    roles: ['admin', 'user', 'staff'],
    permission: 'settings',
    section: 'settings',
  },

  // --- Issues & Support ---
  {
    name: 'dashboard.support',
    label: 'Support',
    icon: Headphones,
    path: 'help',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    section: 'support',
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
