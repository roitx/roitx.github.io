const CACHE_NAME = 'roitx-study-cache';
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
  './offline.html'
];

// Cache Cleanup Helper (Max 40 items rakhne ke liye)
async function cleanUpCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > 40) {
    await cache.delete(keys[0]);
    cleanUpCache();
  }
}

// INSTALL
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// ACTIVATE
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — Smart Network-First Strategy with Exclusion Rules
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // HEAVY / DYNAMIC FILES KO CACHE SE EXCLUDE KAREIN
  // PDFs, Supabase Storage, Supabase APIs aur Google Avatars
  if (
    url.endsWith('.pdf') || 
    url.includes('.supabase.co') || 
    url.includes('googleusercontent.com') ||
    url.includes('/avatars/')
  ) {
    return; // Direct network fetch, skip caching
  }

  e.respondWith(
    fetch(e.request)
      .then(networkResponse => {
        // Safe 200 OK responses ko hi cache karein
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone);
            cleanUpCache();
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
            return caches.match('./offline.html');
          }
        });
      })
  );
});
