/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { viteWorkspaceAliases } from '../../../tools/viteWorkspaceAliases';
import { vitePublicDefines } from '../../../tools/viteEnvironment';
import { rentifyManualChunks } from '../../../tools/viteChunks';

export default defineConfig(({ mode }) => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/apps/core/merchant',
  server: {
    port: 4400,
    host: 'localhost',
    watch: {
      usePolling: true,
    },
  },
  preview: {
    port: 4400,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@rentify\/utils\/(.+)$/,
        replacement: resolve(__dirname, '../../../libs/utils/src/$1'),
      },
      ...viteWorkspaceAliases,
    ],
  },
  optimizeDeps: {
    include: [
      '@n8tb1t/use-scroll-position',
      '@reduxjs/toolkit',
      '@reduxjs/toolkit/query/react',
      'class-variance-authority',
      'clsx',
      'framer-motion',
      'lucide-react',
      'lodash',
      'lodash/get',
      'lodash/isNaN',
      'react',
      'react-dom',
      'react-dom/client',
      'react-redux',
      'react-router-dom',
      'redux-persist',
      'redux-persist/integration/react',
      'redux-persist/lib/storage',
      'tailwind-merge',
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
    outDir: '../../../dist/apps/core/merchant',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: { output: { manualChunks: rentifyManualChunks } },
  },
  define: vitePublicDefines(mode),
}));
