const CACHE_NAME = 'noten-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './archive.html',
  './trash.html',
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
  './js/app.js',
  'https://cdn.jsdelivr.net/npm/pouchdb@8.0.1/dist/pouchdb.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
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
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, and optionally update cache in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {/* Ignore network errors during background update */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache the dynamically fetched resource (e.g. Google font woff files)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and request is HTML, return the cached page or index.html fallback
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match(event.request).then(response => response || caches.match('./index.html'));
        }
      });
    })
  );
});
