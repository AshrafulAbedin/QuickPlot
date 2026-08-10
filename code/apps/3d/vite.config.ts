import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@quickplot/types-3d':    path.resolve(__dirname, '../../packages/types-3d/src/index.ts'),
      '@quickplot/renderer-3d': path.resolve(__dirname, '../../packages/renderer-3d/src/index.ts'),
      '@quickplot/core-3d':     path.resolve(__dirname, '../../packages/core-3d/src/index.ts'),
    },
  },
});
