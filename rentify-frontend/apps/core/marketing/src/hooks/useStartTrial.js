import { useMemo } from 'react';
import { useGetPackagesQuery } from '@rentify/apis';

// Every "Start free trial" button opens onboarding with the free package.
// Until packages load (or if none is free) it falls back to the pricing page.
const useStartTrial = () => {
  const { data: packages = [], isLoading } = useGetPackagesQuery();

  return useMemo(() => {
    const sorted = [...packages].sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
    const trial = sorted.find((plan) => Number(plan.price) === 0) || null;

    return {
      packages: sorted,
      trial,
      trialPath: trial ? `/onboarding/${trial.id}` : '/pricing',
      isLoading,
    };
  }, [packages, isLoading]);
};

export default useStartTrial;
