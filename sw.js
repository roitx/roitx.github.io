const CACHE_NAME = 'roitx-study-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './profile.jpg',
  './classes.html',
  './view.html',
  './tests.html'
];

// INSTALL — caching static assets
self.addEventListener('install', e => {
  console.log('Service Worker Installed 🛠️');
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching static assets...');
      return cache.addAll(ASSETS);
    })
  );
});

// ACTIVATE — clean up old caches
self.addEventListener('activate', e => {
  console.log('Service Worker Activated 🟢');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            console.log(`Deleting old cache: ${k}`);
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — cache-first strategy
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        console.log(`Serving cached: ${e.request.url}`);
        return cached;
      }
      return fetch(e.request)
        .then(res => {
          // Optional: dynamic caching
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, res.clone());
            return res;
          });
        })
        .catch(() => {
          // fallback to index.html for SPA navigation
          if (e.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
    })
  );
});
