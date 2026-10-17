/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { viteWorkspaceAliases } from '../../../tools/viteWorkspaceAliases';
import { vitePublicDefines } from '../../../tools/viteEnvironment';
import { rentifyManualChunks } from '../../../tools/viteChunks';

export default defineConfig(({ mode }) => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/apps/core/pos',
  server: {
    port: 4450,
    host: 'localhost',
    watch: {
      usePolling: true,
    },
  },
  preview: {
    port: 4450,
    host: 'localhost',
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, './src'),
      },
      {
        find: /^@rentify\/utils\/(.+)$/,
        replacement: resolve(__dirname, '../../../libs/utils/src/$1'),
      },
      ...viteWorkspaceAliases,
    ],
  },
  build: {
    outDir: '../../../dist/apps/core/pos',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: rentifyManualChunks,
      },
    },
  },
  define: vitePublicDefines(mode),
}));
