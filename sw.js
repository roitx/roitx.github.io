const CACHE_NAME = 'roitx-study-v2'; // Version update kar diya
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
  self.skipWaiting(); // Naye worker ko turant active karne ke liye
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// ACTIVATE — clean up old caches instantly
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
  self.clients.claim(); // Turant clients ko control me le lega
});

// FETCH — Stale-While-Revalidate Strategy (Best for auto-updates + offline)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // Background me network se latest fetch karne ki request lagayein
      const fetchPromise = fetch(e.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Agar offline hain toh kuch nahi, cache chalne do
      });

      // Agar cache me hai toh turant wo dikhao, background me update hota rahega
      return cachedResponse || fetchPromise;
    })
  );
});
