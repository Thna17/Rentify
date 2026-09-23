import { ROUTES } from '@rentify/utils';
import { lazy } from 'react';

const ProductForm = lazy(() => import('@rentify/product-form/ui/ProductForm'))
const Cart = lazy(() =>
  import('@rentify/cart/ui/Cart').then((m) => ({ default: m.Cart }))
);
// const Cart = lazy(() => '@rentify/cart/ui/Cart')
const Checkout = lazy(() =>
  import('@rentify/checkout/ui/Checkout').then((m) => ({ default: m.Checkout }))
);
const OrderConfirmation = lazy(() =>
  import('@rentify/order-confirmation/ui/OrderConfirmation').then((m) => ({ default: m.OrderConfirmation }))
);

const StaffAcceptInvitation = lazy(() =>
  import('@rentify/staff-accept/ui/StaffAcceptInvitation').then((m) => ({
    default: m.StaffAcceptInvitation,
  }))
);

const NotFound = lazy(() =>
  import('@rentify/not-found/ui/NotFound').then((m) => ({ default: m.NotFound }))
);

const Profile = lazy(() =>
  import('@rentify/profile/ui/Profile').then((m) => ({ default: m.Profile }))
);

const CustomerOrder = lazy(() =>
  import('@rentify/customer-order/ui/CustomerOrder').then((m) => ({ default: m.CustomerOrder }))
);

const CustomerOrderDetail = lazy(() =>
  import('@rentify/customer-order/ui/CustomerOrderDetail').then((m) => ({ default: m.CustomerOrderDetail }))
);

const CustomerPaymentInfo = lazy(() =>
  import('@rentify/customer-order/ui/CustomerPaymentInfo').then((m) => ({ default: m.CustomerPaymentInfo }))
);
export const pageRoutes = [
  { path: ROUTES.CART, element: <Cart /> },
  { path: ROUTES.CHECKOUT, element: <Checkout /> },
  { path: ROUTES.ORDER_SUCCESS, element: <OrderConfirmation /> },
  { path: ROUTES.CREATE_PRODUCT, element: <ProductForm /> },
  { path: `${ROUTES.EDIT_PRODUCT}/:id`, element: <ProductForm /> },
  {
    path: ROUTES.STAFF_ACCEPTION_INVITATION,
    element: <StaffAcceptInvitation />,
  },
  { path: ROUTES.NOT_FOUND, element: <NotFound /> },
  { path: ROUTES.PROFILE, element: <Profile /> },
  { path: ROUTES.CUSTOMER_ORDER, element: <CustomerOrder /> },
  { path: ROUTES.CUSTOMER_ORDER_DETAIL, element: <CustomerOrderDetail /> },
  { path: ROUTES.CUSTOMER_PAYMENT_DETAIL, element: <CustomerPaymentInfo /> },
];
