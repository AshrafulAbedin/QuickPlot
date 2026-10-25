import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const tessRoot = path.dirname(require.resolve('tesseract.js/package.json'));
const coreRoot = path.dirname(createRequire(path.join(tessRoot, 'package.json')).resolve('tesseract.js-core/package.json'));

export default defineConfig({
  plugins: [react(), {
    name: 'bundle-local-ocr',
    generateBundle() {
      for (const [fileName, sourcePath] of [
        ['ocr/worker.min.js', path.join(tessRoot, 'dist/worker.min.js')],
        ['ocr/tesseract-core-lstm.wasm.js', path.join(coreRoot, 'tesseract-core-lstm.wasm.js')],
        ['ocr/tesseract-core-lstm.wasm', path.join(coreRoot, 'tesseract-core-lstm.wasm')],
        ['ocr/TESSERACT-LICENSE', path.join(tessRoot, 'LICENSE.md')],
        ['ocr/CORE-LICENSE', path.join(coreRoot, 'LICENSE')],
      ]) this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(sourcePath) });
    },
  }],
  server: {
    port: 5176,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@quickplot/types':    path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@quickplot/renderer': path.resolve(__dirname, '../../packages/renderer/src/index.ts'),
      '@quickplot/core':     path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        content: path.resolve(__dirname, 'src/content/content.ts'),
        background: path.resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') return 'content.js';
          if (chunkInfo.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
