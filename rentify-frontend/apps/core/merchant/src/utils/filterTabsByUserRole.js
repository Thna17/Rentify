export const filterTabsByUserRole = (tabs, userRole, userPermissions, packageFeatures) => {
  return tabs.filter((tab) => {
    if (tab.roles.length === 0) return true;

    if (!tab.roles.includes(userRole)) return false;

    if (tab.features) {
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