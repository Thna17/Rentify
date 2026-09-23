/** Shared chunking policy. Keep vendor code cacheable and prevent one route from
 * pulling the whole dashboard/storefront into the initial bundle. */
export const rentifyManualChunks = (id: string) => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor-react';
  if (id.includes('@reduxjs') || id.includes('react-redux') || id.includes('redux-persist')) return 'vendor-state';
  if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) return 'vendor-ui';
  if (id.includes('recharts') || id.includes('react-pdf') || id.includes('three')) return 'vendor-heavy';
  return 'vendor';
};
