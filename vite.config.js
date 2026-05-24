import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'fs-extra': path.resolve(__dirname, 'js/mocks/fs-extra.js'),
    },
  },
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    {
      name: 'copy-sw',
      closeBundle() {
        try {
          fs.copyFileSync(
            path.resolve(__dirname, 'sw.js'),
            path.resolve(__dirname, 'dist/sw.js')
          );
          console.log('Successfully copied sw.js to dist/sw.js');
        } catch (err) {
          console.error('Failed to copy sw.js:', err);
        }
        try {
          fs.copyFileSync(
            path.resolve(__dirname, 'icon-maskable.svg'),
            path.resolve(__dirname, 'dist/icon-maskable.svg')
          );
          console.log('Successfully copied icon-maskable.svg to dist/icon-maskable.svg');
        } catch (err) {
          console.error('Failed to copy icon-maskable.svg:', err);
        }
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'app' || chunkInfo.name === 'index') {
            return 'js/app.js';
          }
          return 'js/[name].js';
        },
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/style.css';
          }
          return '[name].[ext]';
        }
      }
    }
  }
});
