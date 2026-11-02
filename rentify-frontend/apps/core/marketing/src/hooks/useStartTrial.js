import { useMemo } from 'react';
import { useGetPackagesQuery } from '@rentify/apis';
import useMarketingAuth from './useMarketingAuth';

export const DEFAULT_PACKAGES = [
  {
    id: '44444444-4444-4444-8444-444444444441',
    name: 'Free',
    price: 0,
    duration: 'Unlimited',
    description: 'For micro-sellers and new sellers starting on Rentify with their own storefront.',
    features: ['basic-dashboard', 'product-management', 'order-management', 'marketplace-selling', 'store', 'pos', 'invoice'],
    limits: { products: 25, staff: 1, storage: 1024, commissionText: 'Only on marketplace orders' },
  },
  {
    id: '44444444-4444-4444-8444-444444444442',
    name: 'Starter',
    price: 8,
    duration: '14-day free trial',
    description: 'For shops with a counter or brand ready for their own storefront and POS.',
    features: [
      'basic-dashboard',
      'product-management',
      'order-management',
      'marketplace-selling',
      'store',
      'pos',
      'invoice',
    ],
    limits: { products: 100, staff: 2, storage: 5120, trialDays: 14, commissionText: 'Only on marketplace orders' },
  },
  {
    id: '44444444-4444-4444-8444-444444444443',
    name: 'Pro',
    price: 15,
    duration: '14-day free trial',
    description: 'For growing shops needing custom domains, staff accounts, analytics, and marketing tools.',
    features: [
      'basic-dashboard',
      'product-management',
      'order-management',
      'marketplace-selling',
      'store',
      'pos',
      'invoice',
      'custom-domain',
      'staff-accounts',
      'advanced-analytics',
      'marketing-tools',
    ],
    limits: { products: 500, staff: 5, storage: 20480, trialDays: 14, commissionText: 'Only on marketplace orders' },
  },
];

// Unified onboarding path: never make merchants choose at signup.
const useStartTrial = () => {
  const { data: rawPackages = [], isLoading } = useGetPackagesQuery();
  const { isAuthenticated, dashboardHref } = useMarketingAuth();

  return useMemo(() => {
    const list = Array.isArray(rawPackages) && rawPackages.length > 0
      ? rawPackages
      : isLoading
      ? []
      : DEFAULT_PACKAGES;

    const sorted = [...list].sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
    const trial =
      sorted.find(
        (plan) =>
          plan.id === '44444444-4444-4444-8444-444444444442' ||
          plan.name?.toLowerCase() === 'starter' ||
          Number(plan.price) === 8
      ) ||
      sorted[0] ||
      null;

    return {
      packages: sorted,
      trial,
      trialPath: isAuthenticated ? dashboardHref : '/start',
      isAuthenticated,
      dashboardHref,
      isLoading,
    };
  }, [rawPackages, isLoading, isAuthenticated, dashboardHref]);
};

export default useStartTrial;

