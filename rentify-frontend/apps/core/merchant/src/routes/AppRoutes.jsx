import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import { motion } from 'framer-motion';

import { dashboardRoutes } from './dashboardRoutes';

// Convert dashboardRoutes object to array format for useRoutes
const routes = [
  dashboardRoutes,
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
