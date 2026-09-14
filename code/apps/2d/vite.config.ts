import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/2d/',
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
  },
  resolve: {
    alias: {
      '@quickplot/types':    path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@quickplot/renderer': path.resolve(__dirname, '../../packages/renderer/src/index.ts'),
      '@quickplot/core':     path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
});
