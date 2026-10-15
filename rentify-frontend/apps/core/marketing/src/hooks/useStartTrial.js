import { useMemo } from 'react';
import { useGetPackagesQuery } from '@rentify/apis';

export const DEFAULT_PACKAGES = [
  {
    id: '44444444-4444-4444-8444-444444444441',
    name: 'Free',
    price: 0,
    duration: 'Unlimited',
    description: 'For Facebook sellers and new sellers starting on Rentify Marketplace.',
    features: ['basic-dashboard', 'product-management', 'order-management', 'marketplace-selling'],
    limits: { products: 500, staff: 1, storage: 1024, commissionText: 'Only on marketplace orders' },
  },
  {
    id: '44444444-4444-4444-8444-444444444442',
    name: 'Starter',
    price: 5,
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
    limits: { products: 5000, staff: 2, storage: 5120, trialDays: 14, commissionText: 'Only on marketplace orders' },
  },
  {
    id: '44444444-4444-4444-8444-444444444443',
    name: 'Pro',
    price: 10,
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
    limits: { products: -1, staff: 15, storage: 51200, trialDays: 14, commissionText: 'Only on marketplace orders' },
  },
];

// Unified onboarding path: never make merchants choose at signup.
const useStartTrial = () => {
  const { data: rawPackages = [], isLoading } = useGetPackagesQuery();

  return useMemo(() => {
    const list = Array.isArray(rawPackages) && rawPackages.length > 0
      ? rawPackages
      : isLoading
      ? []
      : DEFAULT_PACKAGES;

    const sorted = [...list].sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
    const trial = sorted.find((plan) => Number(plan.price) === 5) || sorted[0] || null;

    return {
      packages: sorted,
      trial,
      trialPath: '/start',
      isLoading,
    };
  }, [rawPackages, isLoading]);
};

export default useStartTrial;

