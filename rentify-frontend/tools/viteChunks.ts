/** Shared chunking policy.
 *
 * Splitting React, Radix UI, Lucide, and other vendor libraries into separate
 * vendor chunks causes circular chunk imports in Rollup/Vite because commonjs
 * helpers and transitive dependencies cross-import across chunks. This caused
 * out-of-order module evaluation and "Cannot read properties of undefined
 * (reading 'forwardRef')" at runtime.
 *
 * Keeping core vendor code unified ensures zero circular imports and reliable
 * execution order. Only heavyweight, conditionally-used packages (3D, charting,
 * PDF generation) are separated into a 'vendor-heavy' chunk. */
const HEAVY_SCOPES = ['@react-pdf/', '@react-three/'];
const HEAVY = new Set(['recharts', 'three']);

const packageName = (id: string) => {
  const match = id.split('\\').join('/').match(/.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  return match ? match[1] : null;
};

export const rentifyManualChunks = (id: string) => {
  const name = packageName(id);
  if (!name) return undefined;
  if (HEAVY.has(name) || HEAVY_SCOPES.some((scope) => name.startsWith(scope))) return 'vendor-heavy';
  return 'vendor';
};
