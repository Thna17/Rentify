import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Lazy load components
import DashboardLayout from '../layouts/dashboard/Layout';
const Overview = lazy(() => import('../pages/overview/Overview'));
const PlatformAnalytics = lazy(() => import('../pages/overview/PlatformAnalytics'));
const StoreManagement = lazy(() => import('../pages/store-management/StoreManagement'));
const StoreDesign = lazy(() => import('../pages/store-design/StoreDesign'));
const ProductManagement = lazy(() => import('../pages/product-management/ProductManagement'));
const ProductDetailView = lazy(() => import('../pages/product-management/ProductDetailView'));
const CategoriesPage = lazy(() => import('../pages/categories/CategoriesPage'));
const OrderManagement = lazy(() => import('../pages/order-management/OrderManagement'));
const OrderDetailView = lazy(() => import('../pages/order-management/OrderDetailView'));
const InvoiceManual = lazy(() => import('../pages/invoice-manual/InvoiceManual'));
const ProductForm = lazy(() => import('../pages/product-form/ProductForm'));
const AccountSettings = lazy(() => import('../pages/setting/AccountSettings'));
const BillingSetting = lazy(() => import('../pages/setting/BillingSetting'));
const SecuritySetting = lazy(() => import('../pages/setting/SecuritySetting'));
const StaffSetting = lazy(() => import('../pages/setting/StaffSetting'));
const PaymentSetting = lazy(() => import('../pages/setting/PaymentSetting'));
const PreferencesSetting = lazy(() => import('../pages/setting/PreferencesSetting'));
const DeliverySetting = lazy(() => import('../pages/setting/DeliverySetting'));
const SharePage = lazy(() => import('../pages/share/SharePage'));
const SupportPage = lazy(() => import('../pages/support/SupportPage'));
const Customers = lazy(() => import('../pages/customers/Customers'));
const MarketplacePage = lazy(() => import('../pages/marketplace/MarketplacePage'));
const ReturnsPage = lazy(() => import('../pages/returns/ReturnsPage'));
const ComponentGallery = lazy(() => import('../pages/dev/ComponentGallery'));

export const dashboardRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    { index: true, element: <Navigate to="overview" replace /> },
    { path: 'overview', element: <Overview /> },

    // Reports (replaces Analytics; /analytics redirects)
    { path: 'reports', element: <PlatformAnalytics /> },
    { path: 'analytics', element: <Navigate to="/reports" replace /> },

    // Online store (replaces /store-management; /store-management redirects)
    { path: 'online-store', element: <StoreManagement /> },
    { path: 'store-management', element: <Navigate to="/online-store" replace /> },

    // Store design / customization
    { path: 'customization', element: <StoreDesign /> },
    { path: 'customization/:id', element: <Navigate to="/customization" replace /> },

    // Products (one list; /catalog and /products/manage redirect)
    { path: 'products', element: <ProductManagement /> },
    { path: 'products/manage', element: <Navigate to="/products" replace /> },
    { path: 'catalog', element: <Navigate to="/products" replace /> },
    { path: 'categories', element: <Navigate to="/products?tab=categories" replace /> },
    { path: 'products/:id', element: <ProductDetailView /> },
    { path: 'products/create', element: <ProductForm /> },
    { path: 'products/edit/:id', element: <ProductForm /> },

    // Orders (one inbox; /marketplace-orders redirects with channel=marketplace)
    { path: 'orders', element: <OrderManagement /> },
    { path: 'marketplace-orders', element: <Navigate to="/orders?channel=marketplace" replace /> },
    { path: 'orders/:id', element: <OrderDetailView /> },

    // Channels & Operations
    { path: 'marketplace', element: <MarketplacePage /> },
    { path: 'returns', element: <ReturnsPage /> },
    { path: 'customers', element: <Customers /> },
    { path: 'invoices', element: <InvoiceManual /> },
    { path: 'share', element: <SharePage /> },
    { path: 'help', element: <SupportPage /> },
    { path: 'support', element: <Navigate to="/help" replace /> },

    // Settings (one shell; /settings and /usage/* redirect)
    { path: 'settings', element: <Navigate to="/settings/account" replace /> },

    { path: 'settings/account', element: <AccountSettings /> },
    { path: 'settings/security', element: <SecuritySetting /> },
    { path: 'settings/staff', element: <StaffSetting /> },
    { path: 'settings/payments', element: <PaymentSetting /> },
    { path: 'settings/delivery', element: <DeliverySetting /> },
    { path: 'settings/billing', element: <BillingSetting /> },
    { path: 'settings/preferences', element: <PreferencesSetting /> },

    // Usage & billing consolidation (/usage/* and /ops/* redirect to /settings/billing)
    { path: 'usage', element: <Navigate to="/settings/billing" replace /> },
    { path: 'usage/dashboard', element: <Navigate to="/settings/billing" replace /> },
    { path: 'usage/breakdown', element: <Navigate to="/settings/billing" replace /> },
    { path: 'usage/billing', element: <Navigate to="/settings/billing" replace /> },
    { path: 'ops/*', element: <Navigate to="/settings/billing" replace /> },

    // Search
    { path: 'search', element: <Navigate to="/overview" replace /> },

    ...(import.meta.env.DEV ? [{ path: '__ui', element: <ComponentGallery /> }] : []),

    { path: '*', element: <Navigate to="overview" replace /> },
  ],
};
