const CACHE_NAME = 'noten-v2.0.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './archive.html',
  './trash.html',
  './privacy.html',
  './terms.html',
  './manifest.json',
  './img/icons/noten.png',
  './img/icons/icon.svg',
  './img/icons/noten_x48.png',
  './img/icons/noten_x72.png',
  './img/icons/noten_x96.png',
  './img/icons/noten_x128.png',
  './img/icons/noten_x192.png',
  './img/icons/noten_x384.png',
  './img/icons/noten_x512.png',
  './css/style.css',
  './fonts/material-symbols-outlined-subset.woff2',
  './js/app.js'
];

// Install Event (Pre-cache static assets safely)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[Service Worker] Failed to pre-cache ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Cache First, Network Fallback)
self.addEventListener('fetch', (event) => {
  // Avoid intercepting Vite HMR/dev-server requests, Filen API, or PouchDB local adapter changes
  if (event.request.url.includes('/@vite/') ||
    event.request.url.includes('/@id/') ||
    event.request.url.includes('/@fs/') ||
    event.request.url.includes('.vite/deps') ||
    event.request.url.includes('filen.io') ||
    event.request.url.includes('_session') ||
    event.request.url.includes('_local') ||
    event.request.url.includes('/_changes') ||
    event.request.url.includes('/_bulk_docs') ||
    event.request.url.includes('/_all_docs') ||
    event.request.method !== 'GET') {
    return; // Let browser make the request directly to network
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, and update cache in background when online
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* Ignore network errors during background update */ });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
          return networkResponse;
        }

        // Cache dynamically fetched resources (e.g. Google Font woff2 files, CDN assets)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(async () => {
        // If offline and request is HTML, attempt exact or fallback HTML page match
        const acceptHeader = event.request.headers.get('accept') || '';
        if (acceptHeader.includes('text/html') || event.request.mode === 'navigate') {
          const match = await caches.match(event.request, { ignoreSearch: true });
          if (match) return match;

          const url = new URL(event.request.url);
          const pathname = url.pathname;
          const cache = await caches.open(CACHE_NAME);
          const allKeys = await cache.keys();

          let targetFile = 'index.html';
          if (pathname.includes('/archive')) targetFile = 'archive.html';
          else if (pathname.includes('/trash')) targetFile = 'trash.html';
          else if (pathname.includes('/privacy')) targetFile = 'privacy.html';
          else if (pathname.includes('/terms')) targetFile = 'terms.html';

          const pageMatch = allKeys.find(req => req.url.endsWith('/' + targetFile) || req.url.endsWith(targetFile));
          if (pageMatch) {
            const res = await cache.match(pageMatch);
            if (res) return res;
          }

          const indexMatch = allKeys.find(req => req.url.endsWith('/index.html') || req.url.endsWith('index.html'));
          if (indexMatch) {
            const res = await cache.match(indexMatch);
            if (res) return res;
          }

          return (await caches.match('./' + targetFile)) || (await caches.match('./index.html'));
        }
      });
    })
  );
});

