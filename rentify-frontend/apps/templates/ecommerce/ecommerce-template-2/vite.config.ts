/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteWorkspaceAliases } from '../../../../tools/viteWorkspaceAliases';
import { vitePublicDefines } from '../../../../tools/viteEnvironment';
import { rentifyManualChunks } from '../../../../tools/viteChunks';

export default defineConfig(({ mode }) => ({
  root: __dirname,
  cacheDir:
    '../../../../node_modules/.vite/apps/templates/ecommerce/ecommerce-template-2',
  server: {
    port: 4600,
    host: 'localhost',
  },
  preview: {
    port: 4600,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: { alias: viteWorkspaceAliases },
  // This template intentionally avoids a workspace-wide scan, but every
  // CommonJS dependency used by the shared storefront must still be optimized.
  // In particular, react-redux imports use-sync-external-store/with-selector
  // as a default CommonJS export.
  optimizeDeps: {
    noDiscovery: true,
    include: [
      '@n8tb1t/use-scroll-position',
      '@react-pdf/renderer',
      '@reduxjs/toolkit',
      '@reduxjs/toolkit/query/react',
      'base64-js',
      'buffer',
      'class-variance-authority',
      'clsx',
      'framer-motion',
      'lucide-react',
      'react',
      'react-dom',
      'react-dom/client',
      'react-redux',
      'react-router-dom',
      'redux-persist',
      'redux-persist/integration/react',
      'redux-persist/lib/storage',
      'tailwind-merge',
      'unicode-trie',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/index.js',
      'use-sync-external-store/with-selector',
    ],
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../../../dist/apps/templates/ecommerce/ecommerce-template-2',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: { output: { manualChunks: rentifyManualChunks } },
  },
  define: vitePublicDefines(mode),
}));
