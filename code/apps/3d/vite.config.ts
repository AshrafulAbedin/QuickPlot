import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/3d/',
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
  resolve: {
    alias: {
      '@quickplot/types-3d':    path.resolve(__dirname, '../../packages/types-3d/src/index.ts'),
      '@quickplot/renderer-3d': path.resolve(__dirname, '../../packages/renderer-3d/src/index.ts'),
      '@quickplot/core-3d':     path.resolve(__dirname, '../../packages/core-3d/src/index.ts'),
    },
  },
});
