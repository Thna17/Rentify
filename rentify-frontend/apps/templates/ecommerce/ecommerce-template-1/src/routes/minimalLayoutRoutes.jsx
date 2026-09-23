import { ROUTES } from '@rentify/storefront';
import { lazy } from 'react';

const ProductDetail = lazy(() => import('../pages/ProductDetail'));

// MinimalLayout routes
export const minimalLayoutRoutes = [
  { path: ROUTES.PRODUCT_DETAIL, element: <ProductDetail /> },
];
