// service-worker.js

const CACHE_NAME = 'tasknest-v1';
const ASSETS_TO_CACHE = [
  // essential app shell files
  './',              // root / index
  'index.html',
  'tasks.html',
  'calendar.html',
  'notes.html',
  'settings.html',
  'style.css',        // assume style.css in root or adjust path
  'app.js',            // main script
  'images/icon-192.png',
  'images/icon-512.png'
];

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Install – precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Activate this SW immediately, skip waiting
  self.skipWaiting();
});

// Fetch – respond with cache first, fallback to network, dynamically cache new assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // only handle GET requests
  if (req.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(req).then(cachedResponse => {
      // Serve from cache if found
      if (cachedResponse) {
        // Optionally update cache in background (stale-while-revalidate)
        fetch(req).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, networkResponse.clone());
            });
          }
        }).catch(err => {
          // silent failure
        });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(req)
        .then(networkResponse => {
          // Optionally cache the new resource
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, networkResponse.clone());
            });
          }
          return networkResponse.clone();
        })
        .catch(err => {
          // Network request failed (offline). You can return fallback resource here if needed.
          // e.g. return caches.match('offline.html');
          throw err;
        });
    })
  );
});

