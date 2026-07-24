import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import handlebars from 'vite-plugin-handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pageData = {
  '/index.html': { bodyClass: 'index-page', navNotes: true },
  '/archive.html': { bodyClass: 'archive-page', navArchive: true },
  '/trash.html': { bodyClass: 'trash-page', navTrash: true },
};

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      'fs-extra': path.resolve(__dirname, 'js/mocks/fs-extra.js'),
    },
  },
  plugins: [
    handlebars({
      partialDirectory: path.resolve(__dirname, 'templates'),
      context(pagePath) {
        const normalized = pagePath.startsWith('/') ? pagePath : '/' + pagePath;
        return pageData[normalized] || pageData[pagePath] || {};
      }
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    {
      name: 'sync-and-copy-sw',
      buildStart() {
        try {
          const pkgPath = path.resolve(__dirname, 'package.json');
          const swPath = path.resolve(__dirname, 'sw.js');
          if (fs.existsSync(pkgPath) && fs.existsSync(swPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            let swContent = fs.readFileSync(swPath, 'utf-8');
            const targetCacheName = `const CACHE_NAME = 'noten-v${pkg.version}';`;
            if (!swContent.startsWith(targetCacheName)) {
              swContent = swContent.replace(/^const CACHE_NAME = .*;$/m, targetCacheName);
              fs.writeFileSync(swPath, swContent, 'utf-8');
              console.log(`Successfully synced sw.js CACHE_NAME to noten-v${pkg.version}`);
            }
          }
        } catch (err) {
          console.error('Failed to sync sw.js version with package.json:', err);
        }
      },
      closeBundle() {
        try {
          const pkgPath = path.resolve(__dirname, 'package.json');
          const swPath = path.resolve(__dirname, 'sw.js');
          const distSwPath = path.resolve(__dirname, 'dist/sw.js');
          const distJsDir = path.resolve(__dirname, 'dist/js');

          let swContent = fs.readFileSync(swPath, 'utf-8');
          if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            swContent = swContent.replace(/^const CACHE_NAME = .*;$/m, `const CACHE_NAME = 'noten-v${pkg.version}';`);
          }

          // Include core JS chunks and default English ('en.js') in pre-cache.
          // Other languages will be fetched and cached dynamically on-demand when the user selects or uses them.
          if (fs.existsSync(distJsDir)) {
            const jsFiles = fs.readdirSync(distJsDir).filter(f => {
              if (!f.endsWith('.js')) return false;
              const nameWithoutExt = f.replace(/\.js$/, '');
              // Filter out non-English language chunk files from initial pre-cache
              const isLangFile = /^[a-z]{2,3}(-[a-z]+)?$/i.test(nameWithoutExt);
              if (isLangFile && nameWithoutExt !== 'en') {
                return false;
              }
              return true;
            }).map(f => `./js/${f}`);

            const assetsMatch = swContent.match(/const ASSETS_TO_CACHE = \[([\s\S]*?)\];/);
            if (assetsMatch) {
              const currentAssets = assetsMatch[1]
                .split('\n')
                .map(line => line.trim().replace(/^['"]|['"],?$/g, ''))
                .filter(Boolean);

              const combinedAssets = Array.from(new Set([...currentAssets, ...jsFiles]));
              const formattedAssets = `const ASSETS_TO_CACHE = [\n  '${combinedAssets.join("',\n  '")}'\n];`;
              swContent = swContent.replace(/const ASSETS_TO_CACHE = \[[\s\S]*?\];/, formattedAssets);
            }
          }

          fs.writeFileSync(distSwPath, swContent, 'utf-8');
          console.log('Successfully updated dist/sw.js with all JS chunk assets');
        } catch (err) {
          console.error('Failed to copy sw.js:', err);
        }
        try {
          const srcDir = path.resolve(__dirname, 'img/icons');
          const destDir = path.resolve(__dirname, 'dist/img/icons');
          if (fs.existsSync(srcDir)) {
            fs.mkdirSync(destDir, { recursive: true });
            const files = fs.readdirSync(srcDir);
            for (const file of files) {
              fs.copyFileSync(
                path.resolve(srcDir, file),
                path.resolve(destDir, file)
              );
            }
            console.log('Successfully copied icons to dist/img/icons/');
          }
        } catch (err) {
          console.error('Failed to copy icons:', err);
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
      input: {
        main: path.resolve(__dirname, 'index.html'),
        archive: path.resolve(__dirname, 'archive.html'),
        trash: path.resolve(__dirname, 'trash.html'),
        privacy: path.resolve(__dirname, 'privacy.html'),
        terms: path.resolve(__dirname, 'terms.html')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'app' || chunkInfo.name === 'index' || chunkInfo.name === 'main' || chunkInfo.name === 'archive' || chunkInfo.name === 'trash' || chunkInfo.name === 'privacy' || chunkInfo.name === 'terms') {
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
