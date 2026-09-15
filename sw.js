const CACHE_NAME = 'roitx-study-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './1profile.jpg', // Profile image name fix
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

// Cache Cleanup Helper
async function cleanUpCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > 40) {
    await cache.delete(keys[0]);
    cleanUpCache();
  }
}

// INSTALL — Safe asset caching (404 errors won't break registration)
self.addEventListener('install', e => {
  console.log('Service Worker Installed 🛠️');
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching offline assets...');
      return Promise.allSettled(
        ASSETS.map(url => 
          cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
        )
      );
    })
  );
});

// ACTIVATE — Clean old caches
self.addEventListener('activate', e => {
  console.log('Service Worker Activated 🟢');
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

// FETCH — Smart Network-First Strategy
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  if (
    url.endsWith('.pdf') || 
    url.includes('.supabase.co') || 
    url.includes('googleusercontent.com') ||
    url.includes('/avatars/')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(networkResponse => {
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
          if (cachedResponse) return cachedResponse;
          
          if (e.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./offline.html');
          }
        });
      })
  );
});
