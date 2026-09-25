/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteWorkspaceAliases } from '../../tools/viteWorkspaceAliases';
import { vitePublicDefines } from '../../tools/viteEnvironment';
import { rentifyManualChunks } from '../../tools/viteChunks';

/**
 * The single storefront app: deployed once, serves every Rentify-hosted store.
 * Each template (and its stylesheet) is a separate chunk loaded on demand.
 * Local stores answer on http://<subdomain>.localhost:4900.
 */
export default defineConfig(({ mode }) => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/storefront',
  server: {
    port: 4900,
    host: 'localhost',
  },
  preview: {
    port: 4900,
    host: 'localhost',
  },
  // Same reasoning as the templates: skip the workspace-wide dependency scan.
  optimizeDeps: {
    noDiscovery: true,
    include: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@reduxjs/toolkit',
      '@reduxjs/toolkit/query/react',
      'lucide-react',
      'qrcode.react',
      'react',
      'react-dom',
      'react-dom/client',
      'react-redux',
      'react-router-dom',
      'redux-persist',
      'redux-persist/lib/storage',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/index.js',
      'use-sync-external-store/with-selector',
    ],
  },
  plugins: [react()],
  resolve: { alias: viteWorkspaceAliases },
  build: {
    outDir: '../../dist/apps/storefront',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: { output: { manualChunks: rentifyManualChunks } },
  },
  define: vitePublicDefines(mode),
}));
