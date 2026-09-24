export const filterTabsByUserRole = (
  tabs,
  userRole,
  userPermissions,
  packageFeatures,
  channels = { hasStorefront: true, hasMarketplace: true, hasPos: true }
) => {
  return tabs.filter((tab) => {
    if (tab.roles && tab.roles.length > 0 && !tab.roles.includes(userRole)) {
      return false;
    }

    // Filter by sales channel capabilities
    if (tab.channel === 'storefront' && !channels.hasStorefront) return false;
    if (tab.channel === 'pos' && !channels.hasPos) return false;
    if (tab.channel === 'marketplace' && !channels.hasMarketplace) return false;

    // Feature gating for storefront packages (only applies if storefront channel is active)
    if (tab.features && channels.hasStorefront && packageFeatures) {
      const hasFeature = tab.features.some((feature) =>
        packageFeatures?.includes(feature)
      );
      if (!hasFeature) return false;
    }

    if (userRole === 'staff' && tab.permission) {
      const hasPermission = userPermissions?.includes(tab.permission);
      if (!hasPermission) return false;
    }

    return true;
  });
};