export const filterTabsByUserRole = (
  tabs = [],
  userRole = 'user',
  userPermissions = [],
  packageFeatures,
  channels = { hasStorefront: true, hasMarketplace: true, hasPos: true }
) => {
  const role = userRole || 'user';
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];

  return (tabs || []).filter((tab) => {
    if (tab.roles && tab.roles.length > 0 && !tab.roles.includes(role)) {
      return false;
    }

    // Filter by sales channel capabilities
    if (tab.channel === 'storefront' && !channels?.hasStorefront) return false;
    if (tab.channel === 'pos' && !channels?.hasPos) return false;
    if (tab.channel === 'marketplace' && !channels?.hasMarketplace) return false;

    // Feature gating for storefront packages (only applies if storefront channel is active)
    if (tab.features && channels?.hasStorefront && packageFeatures) {
      const hasFeature = tab.features.some((feature) =>
        packageFeatures?.includes(feature)
      );
      if (!hasFeature) return false;
    }

    if (role === 'staff' && tab.permission) {
      const hasPermission =
        permissions.includes(tab.permission) ||
        (tab.permission === 'settings' && permissions.includes('manage_settings')) ||
        (tab.permission === 'manage_settings' && permissions.includes('settings'));
      if (!hasPermission) return false;
    }

    return true;
  });
};