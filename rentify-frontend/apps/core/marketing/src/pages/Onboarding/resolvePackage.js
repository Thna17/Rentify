const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The package onboarding should use, from the packages Core actually has.
 * The link may carry a package id or a plan name (e.g. "growth"); ids go stale
 * when the database is re-created, so an unknown id falls back to a name
 * match and then to the free package instead of failing at the last step.
 */
export const resolvePackage = (packages, requested) => {
  const list = Array.isArray(packages) ? packages.filter((item) => item?.id) : [];
  if (!list.length) return null;

  const byId = list.find((item) => item.id === requested);
  if (byId) return byId;

  const key = normalize(requested);
  if (key) {
    const byName = list.find((item) => {
      const name = normalize(item.name);
      return name && (name === key || name.includes(key) || key.includes(name));
    });
    if (byName) return byName;
  }

  const free = list.find((item) => Number(item.price) === 0);
  return free || [...list].sort((a, b) => Number(a.price) - Number(b.price))[0];
};
