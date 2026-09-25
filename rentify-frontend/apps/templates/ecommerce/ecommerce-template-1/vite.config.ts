/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteWorkspaceAliases } from '../../../../tools/viteWorkspaceAliases';
import { vitePublicDefines } from '../../../../tools/viteEnvironment';
import { rentifyManualChunks } from '../../../../tools/viteChunks';

export default defineConfig(({ mode }) => ({
  root: __dirname,
  cacheDir:
    '../../../../node_modules/.vite/apps/templates/ecommerce/ecommerce-template-1',
  server: {
    port: 4700,
    host: 'localhost',
  },
  // Avoid an expensive workspace-wide dependency scan that can stall Vite on
  // this project. Dependencies are transformed only when the browser requests
  // them instead.
  optimizeDeps: {
    noDiscovery: true,
    include: [
      '@radix-ui/react-dialog',
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
  preview: {
    port: 4700,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: { alias: viteWorkspaceAliases },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../../../dist/apps/templates/ecommerce/ecommerce-template-1',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: { output: { manualChunks: rentifyManualChunks } },
  },
  define: vitePublicDefines(mode),
}));
