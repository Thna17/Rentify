export const getCurrentTabData = (pathname, tabs) => {
  const currentPath = pathname.split('/dashboard/')[1] || 'overview';
  let matchedTab = null;
  let params = {};

  for (const tab of tabs) {
    const escapedPath = tab.path.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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

  return { matchedTab, params };
};