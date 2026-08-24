const CACHE_NAME = 'roitx-study-cache'; // Ab isko kabhi change karne ki zarurat nahi hai!
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

// INSTALL — caching all critical static assets offline
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

// ACTIVATE — take control instantly
self.addEventListener('activate', e => {
  console.log('Service Worker Activated 🟢');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          // Purane kisi bhi v2, v3, v4 cache ko delete kar dega
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

// FETCH — Smart Network-First Strategy
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    // 1. Sabse pehle internet se latest file fetch karne ki koshish karo (GitHub se)
    fetch(e.request)
      .then(networkResponse => {
        // Agar nayi file mil gayi, toh usko cache me save/update kar do
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // 2. Agar internet nahi chal raha (Offline), toh saved Cache se file dikhao
        return caches.match(e.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 3. Agar offline hai aur page bhi cache me nahi hai, toh offline.html dikhao
          if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
            return caches.match('./offline.html');
          }
        });
      })
  );
});
