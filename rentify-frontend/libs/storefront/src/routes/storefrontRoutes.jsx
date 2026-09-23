import { lazy } from 'react';
import { ROUTES } from '@rentify/utils/config/routes';

const Cart = lazy(() => import('@rentify/cart/ui/Cart').then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import('@rentify/checkout/ui/Checkout').then((m) => ({ default: m.Checkout })));
const OrderConfirmation = lazy(() => import('@rentify/order-confirmation/ui/OrderConfirmation').then((m) => ({ default: m.OrderConfirmation })));
const NotFound = lazy(() => import('@rentify/not-found/ui/NotFound').then((m) => ({ default: m.NotFound })));
const Profile = lazy(() => import('@rentify/profile/ui/Profile').then((m) => ({ default: m.Profile })));
const CustomerOrder = lazy(() => import('@rentify/customer-order/ui/CustomerOrder').then((m) => ({ default: m.CustomerOrder })));
const CustomerOrderDetail = lazy(() => import('@rentify/customer-order/ui/CustomerOrderDetail').then((m) => ({ default: m.CustomerOrderDetail })));
const CustomerPaymentInfo = lazy(() => import('@rentify/customer-order/ui/CustomerPaymentInfo').then((m) => ({ default: m.CustomerPaymentInfo })));

// Explicitly excludes merchant product forms, staff invitations, dashboard
// routes, and administrative API surfaces.
export const storefrontRoutes = [
  { path: ROUTES.CART, element: <Cart /> },
  { path: ROUTES.CHECKOUT, element: <Checkout /> },
  { path: ROUTES.ORDER_SUCCESS, element: <OrderConfirmation /> },
  { path: ROUTES.NOT_FOUND, element: <NotFound /> },
  { path: ROUTES.PROFILE, element: <Profile /> },
  { path: ROUTES.CUSTOMER_ORDER, element: <CustomerOrder /> },
  { path: ROUTES.CUSTOMER_ORDER_DETAIL, element: <CustomerOrderDetail /> },
  { path: ROUTES.CUSTOMER_PAYMENT_DETAIL, element: <CustomerPaymentInfo /> },
];
