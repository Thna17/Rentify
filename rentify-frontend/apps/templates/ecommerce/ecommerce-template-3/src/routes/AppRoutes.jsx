import { lazy } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import { StoreLayout } from '../layout/StoreLayout';
import { PATHS } from '../paths';
import { isHostedStorefrontBuyer } from '@rentify/storefront/hostedBuyer';

// Every page is its own chunk so the first visit only downloads what it renders.
const Home = lazy(() => import('../pages/Home'));
const Catalog = lazy(() => import('../pages/Catalog'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/Checkout'));
const OrderConfirmation = lazy(() => import('../pages/OrderConfirmation'));
const Account = lazy(() => import('../pages/Account'));
const NotFound = lazy(() => import('../pages/NotFound'));
const HostedAccount = lazy(() => import('../pages/HostedAccount'));
const HostedOrder = lazy(() =>
  import('@rentify/storefront/routes/HostedBuyerOrders').then((module) => ({ default: () => <module.HostedBuyerOrders single /> }))
);

// Hosted-storefront buyer mode (see @rentify/storefront/hostedBuyer) keeps orders
// in the shared Rentify checkout, so order pages read from that API instead.
const hosted = isHostedStorefrontBuyer();

/** Customer-facing routes only: no dashboard, staff, admin or owner tooling. */
export const storeRoutes = [
  {
    element: <StoreLayout />,
    children: [
      { path: PATHS.HOME, element: <Home /> },
      { path: PATHS.PRODUCTS, element: <Catalog /> },
      { path: PATHS.PRODUCT_DETAIL, element: <ProductDetail /> },
      { path: PATHS.CART, element: <Cart /> },
      { path: PATHS.CHECKOUT, element: <Checkout /> },
      { path: PATHS.ORDER_CONFIRMATION, element: hosted ? <HostedOrder /> : <OrderConfirmation /> },
      { path: PATHS.ACCOUNT, element: hosted ? <HostedAccount /> : <Account /> },
      ...(hosted ? [{ path: '/order/:id', element: <HostedOrder /> }] : []),
      // Paths used by earlier storefront links.
      { path: '/profile', element: <Navigate to={PATHS.ACCOUNT} replace /> },
      { path: '/orders', element: <Navigate to={PATHS.ACCOUNT} replace /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export default function AppRoutes() {
  return useRoutes(storeRoutes);
}
