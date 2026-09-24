export const getCurrentTabData = (pathname, tabs) => {
  let currentPath = pathname.replace(/^\/+/, '');
  if (!currentPath) {
    currentPath = 'overview';
  }
  let matchedTab = null;
  const params = {};

  for (const tab of tabs) {
    const escapedPath = tab.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPath.replace(/:\w+/g, '([^/]+)')}$`);
    const match = currentPath.match(pattern);

    if (match) {
      matchedTab = tab;
      const paramNames = [...tab.path.matchAll(/:(\w+)/g)].map((m) => m[1]);
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });
      break;
    }
  }

  // Fallback: match base tab if currentPath starts with tab.path (e.g. settings/account -> settings)
  if (!matchedTab) {
    for (const tab of tabs) {
      if (
        tab.path &&
        tab.path !== 'overview' &&
        (currentPath.startsWith(`${tab.path}/`) || currentPath === tab.path)
      ) {
        matchedTab = tab;
        break;
      }
    }
  }

  return { matchedTab, params };
};
