import { DEFAULT_PACKAGES } from '../../hooks/useStartTrial';

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Resolves the package for storefront onboarding.
 * Creating a storefront website unlocks Starter (≈$8/mo, 14-day free trial) or Pro (≈$15/mo, 14-day free trial).
 */
export const resolvePackage = (packages, requested) => {
  const source = Array.isArray(packages) && packages.length > 0 ? packages : DEFAULT_PACKAGES;
  const list = source.filter((item) => item?.id);
  if (!list.length) return null;

  const byId = list.find((item) => item.id === requested);
  if (byId && Number(byId.price) > 0) return byId;

  const key = normalize(requested);
  if (key && key !== 'free') {
    const byName = list.find((item) => {
      const name = normalize(item.name);
      return name && (name === key || name.includes(key) || key.includes(name));
    });
    if (byName) return byName;
  }

  const starter =
    list.find((item) => normalize(item.name) === 'starter') ||
    list.find((item) => Number(item.price) === 8);
  return starter || [...list].sort((a, b) => Number(a.price) - Number(b.price))[0];
};

