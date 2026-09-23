import { ROUTES } from '@rentify/storefront';
import { lazy } from 'react';

const Home = lazy(() => import('../pages/Home'));
const ProductCatalog = lazy(() => import('../pages/ProductCatalog'));

export const localRoutes = [
  { path: ROUTES.HOME, element: <Home /> },
  { path: ROUTES.PRODUCTS, element: <ProductCatalog /> },
];
