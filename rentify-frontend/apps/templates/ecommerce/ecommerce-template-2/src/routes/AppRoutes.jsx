import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import MainLayout from '../layout';
import { motion } from 'framer-motion';

import { localRoutes } from './localRoutes';
import { minimalLayoutRoutes } from './minimalLayoutRoutes';
import { storefrontRoutes } from '@rentify/storefront';

import MinimalLayout from '@rentify/shared/layouts/minimal-layout/MinimalLayout';

// Convert dashboardRoutes object to array format for useRoutes
const routes = [
  // Routes using MainLayout (e.g., home, product catalog, detail)
  {
    element: <MainLayout />,
    children: localRoutes,
  },

  // Routes using MinimalLayout (e.g., cart, checkout, order success)
  {
    element: <MinimalLayout />,
    children: [...minimalLayoutRoutes, ...storefrontRoutes],
  },

  // Dashboard routes with layout
  // dashboardRoutes,

];

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <motion.div
      className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  </div>
);

const AppRoutes = () => {
  const element = useRoutes(routes);
  return <Suspense fallback={<Loader />}>{element}</Suspense>;
};

export default AppRoutes;
