const CACHE_NAME = 'roitx-study-v14'; // Jab bhi GitHub par update karein, ise v6, v7 kar dein[span_0](start_span)[span_0](end_span)
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './profile.jpg',
  './classes.html',
  './site.css',
  './site.js',
  './tests.html',
  './library.html',
  './library.js',
  './refbook.html',
  './refbook.css',
  './refbook.js',
  './notes-viewer.html',
  './viewer-style.css',
  './viewer-main.js',
  './offline.html' // Custom offline fallback page
];

// INSTALL — caching all critical static assets offline[span_1](start_span)[span_1](end_span)
self.addEventListener('install', e => {
  console.log('Service Worker Installed 🛠️');
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching all offline assets...');
      return cache.addAll(ASSETS);
    })
  );
});

// ACTIVATE — clean up old caches instantly[span_2](start_span)[span_2](end_span)
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

// FETCH — Serve from cache, fallback to network, or show offline.html[span_3](start_span)[span_3](end_span)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(e.request)
        .then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Agar page cache me nahi hai aur net bhi nahi hai, toh custom offline page dikhao[span_4](start_span)[span_4](end_span)
          if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
            return caches.match('./offline.html');
          }
        });
    })
  );
});
