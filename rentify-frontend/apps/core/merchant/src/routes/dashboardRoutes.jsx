import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Lazy load components
const DashboardLayout = lazy(() => import('../layouts/dashboard/Layout'));
const Overview = lazy(() => import('../pages/overview/Overview'));
const PlatformAnalytics = lazy(() => import('../pages/overview/PlatformAnalytics'));
const StoreManagement = lazy(() => import('../pages/store-management/StoreManagement'));
const ProductManagement = lazy(() => import('../pages/product-management/ProductManagement'));
const StoreCatalogPage = lazy(() => import('../pages/product-management/StoreCatalogPage'));
const ProductDetailView = lazy(() => import('../pages/product-management/ProductDetailView'));
const OrderManagement = lazy(() => import('../pages/order-management/OrderManagement'));
const MarketplaceOrders = lazy(() => import('../pages/order-management/MarketplaceOrders'));
const OrderDetailView = lazy(() => import('../pages/order-management/OrderDetailView'));
const InvoiceManual = lazy(() => import('../pages/invoice-manual/InvoiceManual'));
const POSInterface = lazy(() => import('../pages/pos-interface/POSInterface'));
// const Setting = lazy(() => import('@rentify/setting/ui/Setting'));
const ProductForm = lazy(() => import('../pages/product-form/ProductForm'));
const AccountSettings = lazy(() => import('../pages/setting/AccountSettings'));
const BillingSetting = lazy(() => import('../pages/setting/BillingSetting'));
const SecuritySetting = lazy(() => import('../pages/setting/SecuritySetting'));
const StaffSetting = lazy(() => import('../pages/setting/StaffSetting'));
const PaymentSetting = lazy(() => import('../pages/setting/PaymentSetting'));
const PreferencesSetting = lazy(() => import('../pages/setting/PreferencesSetting'));
const UsageDashboard = lazy(() => import('../app/features/usage/pages/DashboardPage'));
const UsageBreakdown = lazy(() => import('../app/features/usage/pages/BreakdownPage'));
const UsageBilling = lazy(() => import('../app/features/usage/pages/BillingPage'));

export const dashboardRoutes = {
  path: '/',
  element: <DashboardLayout />,
  children: [
    { index: true, element: <Navigate to="overview" replace /> },
    { path: 'overview', element: <Overview /> },
    { path: 'analytics', element: <PlatformAnalytics /> },
    { path: 'store-management', element: <StoreManagement /> },
    { path: 'products', element: <ProductManagement /> },
    { path: 'catalog', element: <StoreCatalogPage /> },
    { path: 'products/:id', element: <ProductDetailView /> },
    { path: 'products/create', element: <ProductForm /> },
    { path: 'products/edit/:id', element: <ProductForm /> },
    { path: 'orders', element: <OrderManagement /> },
    { path: 'marketplace-orders', element: <MarketplaceOrders /> },
    { path: 'orders/:id', element: <OrderDetailView /> },
    { path: 'invoices', element: <InvoiceManual /> },
    { path: 'pos', element: <POSInterface /> },
    { path: 'settings', element: <Navigate to="/settings/account" replace /> },
    { path: 'usage', element: <Navigate to="/usage/dashboard" replace /> },
    { path: 'settings/account', element: <AccountSettings /> },
    { path: 'settings/security', element: <SecuritySetting /> },
    { path: 'settings/staff', element: <StaffSetting /> },
    { path: 'settings/payments', element: < PaymentSetting /> },
    { path: 'settings/billing', element: < BillingSetting />},
    { path: 'settings/preferences', element: < PreferencesSetting />},
    { path: 'usage/dashboard', element: <UsageDashboard /> },
    { path: 'usage/breakdown', element: <UsageBreakdown /> },
    { path: 'usage/billing', element: <UsageBilling /> },
    { path: 'ops/dashboard', element: <Navigate to="/usage/dashboard" replace /> },
    { path: 'ops/at-risk', element: <Navigate to="/usage/breakdown" replace /> },
    { path: 'ops/reminders', element: <Navigate to="/usage/breakdown" replace /> },
    { path: 'ops/contract', element: <Navigate to="/usage/billing" replace /> },


    { path: '*', element: <Navigate to="overview" replace /> },
  ],
};
