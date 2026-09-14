import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/2d': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        ws: true,
      },
      '/3d': {
        target: 'http://localhost:5175',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
