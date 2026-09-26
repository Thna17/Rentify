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
  Users,
  Boxes,
} from 'lucide-react';

// Simplified, non-technical structure: Home, Products, Orders, Sales
// Channels, Customers, Analytics, Finance, Settings. Storefront, Marketplace
// and POS live inside Sales Channels; Invoices and Billing live inside
// Finance — a merchant never has to guess where something lives.
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
    channel: 'storefront',
    hideInSidebar: true,
  },

  // --- Orders ---
  {
    name: 'dashboard.order.title',
    label: 'Orders',
    icon: ClipboardList,
    path: 'orders',
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

  // --- Sales Channels: Storefront, Marketplace, POS ---
  {
    name: 'dashboard.store_management.title',
    label: 'Storefront',
    icon: Store,
    path: 'store-management',
    roles: ['admin', 'user', 'staff'],
    permission: null,
    channel: 'storefront',
    section: 'sell',
  },
  {
    name: 'COD orders',
    label: 'Marketplace',
    icon: ShoppingBag,
    path: 'marketplace-orders',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    channel: 'marketplace',
    section: 'sell',
  },
  {
    name: 'dashboard.pos.title',
    label: 'Point of Sale',
    icon: TerminalSquare,
    path: 'pos',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_pos',
    channel: 'pos',
    section: 'sell',
  },

  // --- Customers ---
  {
    name: 'dashboard.customers.title',
    label: 'Customers',
    icon: Users,
    path: 'customers',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_orders',
    section: 'customers',
  },

  // --- Analytics ---
  {
    name: 'dashboard.analytics',
    label: 'Analytics',
    icon: BarChart2,
    path: 'analytics',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
    section: 'insights',
  },

  // --- Finance: Invoices, Billing ---
  {
    name: 'dashboard.invoices.title',
    label: 'Invoices',
    icon: Receipt,
    path: 'invoices',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_invoices',
    section: 'money',
  },
  {
    name: 'dashboard.usage.title',
    label: 'Billing',
    icon: CreditCard,
    path: 'usage',
    roles: ['admin', 'user', 'staff'],
    permission: 'manage_analytics',
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
