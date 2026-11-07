import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import handlebars from 'vite-plugin-handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadM3Icons } from './scripts/download-m3-icons.js';

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
      async buildStart() {
        try {
          await downloadM3Icons();
        } catch (err) {
          console.error('Failed to download M3 icons:', err);
        }
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
        // 1. Copy fonts and images to dist first
        try {
          const fontsSrcDir = path.resolve(__dirname, 'fonts');
          const fontsDestDir = path.resolve(__dirname, 'dist/fonts');
          if (fs.existsSync(fontsSrcDir)) {
            fs.mkdirSync(fontsDestDir, { recursive: true });
            const files = fs.readdirSync(fontsSrcDir);
            for (const file of files) {
              fs.copyFileSync(
                path.resolve(fontsSrcDir, file),
                path.resolve(fontsDestDir, file)
              );
            }
            console.log('Successfully copied fonts to dist/fonts/');
          }
        } catch (err) {
          console.error('Failed to copy fonts:', err);
        }

        try {
          const srcImgDir = path.resolve(__dirname, 'img');
          const destImgDir = path.resolve(__dirname, 'dist/img');
          if (fs.existsSync(srcImgDir)) {
            fs.mkdirSync(destImgDir, { recursive: true });
            const entries = fs.readdirSync(srcImgDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isFile()) {
                fs.copyFileSync(
                  path.resolve(srcImgDir, entry.name),
                  path.resolve(destImgDir, entry.name)
                );
              }
            }
          }
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
            console.log('Successfully copied icons to dist/img/ and dist/img/icons/');
          }
          const m3SrcDir = path.resolve(__dirname, 'img/M3icons');
          const m3DestDir = path.resolve(__dirname, 'dist/img/M3icons');
          if (fs.existsSync(m3SrcDir)) {
            fs.mkdirSync(m3DestDir, { recursive: true });
            const files = fs.readdirSync(m3SrcDir);
            for (const file of files) {
              fs.copyFileSync(
                path.resolve(m3SrcDir, file),
                path.resolve(m3DestDir, file)
              );
            }
            console.log('Successfully copied M3 SVG icons to dist/img/M3icons/');
          }
        } catch (err) {
          console.error('Failed to copy icons:', err);
        }

        // 2. Generate and update dist/sw.js with all pre-cached assets (JS chunks, fonts, and M3 icons)
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

          const distDir = path.resolve(__dirname, 'dist');
          const distAssets = [];

          if (fs.existsSync(distJsDir)) {
            const jsFiles = fs.readdirSync(distJsDir).filter(f => {
              if (!f.endsWith('.js')) return false;
              const nameWithoutExt = f.replace(/\.js$/, '');
              const isLangFile = /^[a-z]{2,3}(-[a-z]+)?$/i.test(nameWithoutExt);
              if (isLangFile && nameWithoutExt !== 'en') {
                return false;
              }
              return true;
            }).map(f => `./js/${f}`);
            distAssets.push(...jsFiles);
          }

          if (fs.existsSync(distDir)) {
            const findFontFiles = (dir, prefix = './') => {
              let list = [];
              const entries = fs.readdirSync(dir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory() && entry.name !== 'node_modules') {
                  list = list.concat(findFontFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`));
                } else if (entry.isFile() && (entry.name.endsWith('.woff') || entry.name.endsWith('.woff2'))) {
                  list.push(`${prefix}${entry.name}`);
                }
              }
              return list;
            };
            const fontFiles = findFontFiles(distDir);
            distAssets.push(...fontFiles);
          }

          // Pre-cache all local M3 SVG icons for offline PWA functionality
          const m3Dir = path.resolve(__dirname, 'img/M3icons');
          if (fs.existsSync(m3Dir)) {
            const m3Files = fs.readdirSync(m3Dir)
              .filter(f => f.endsWith('.svg'))
              .map(f => `./img/M3icons/${f}`);
            distAssets.push(...m3Files);
          }

          const assetsMatch = swContent.match(/const ASSETS_TO_CACHE = \[([\s\S]*?)\];/);
          if (assetsMatch) {
            const currentAssets = assetsMatch[1]
              .split('\n')
              .map(line => line.trim().replace(/^['"]|['"],?$/g, ''))
              .filter(Boolean);

            const combinedAssets = Array.from(new Set([...currentAssets, ...distAssets]));
            const formattedAssets = `const ASSETS_TO_CACHE = [\n  '${combinedAssets.join("',\n  '")}'\n];`;
            swContent = swContent.replace(/const ASSETS_TO_CACHE = \[[\s\S]*?\];/, formattedAssets);
          }

          fs.writeFileSync(distSwPath, swContent, 'utf-8');
          console.log(`Successfully updated dist/sw.js with ${distAssets.length} assets (including M3 SVG icons)`);
        } catch (err) {
          console.error('Failed to copy and update sw.js:', err);
        }
        try {
          const nojekyllPath = path.resolve(__dirname, 'dist/.nojekyll');
          fs.writeFileSync(nojekyllPath, '', 'utf-8');
          console.log('Successfully generated dist/.nojekyll for GitHub Pages');
        } catch (err) {
          console.error('Failed to create .nojekyll:', err);
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
          if (chunkInfo.name === 'privacy' || chunkInfo.name === 'terms' || chunkInfo.name === 'static') {
            return 'js/static.js';
          }
          if (chunkInfo.name === 'app' || chunkInfo.name === 'index' || chunkInfo.name === 'main' || chunkInfo.name === 'archive' || chunkInfo.name === 'trash') {
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
