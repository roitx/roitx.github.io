const CACHE_NAME = 'roitx-study-cache-v2';
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

// Cache Cleanup Helper (Max 40 items tak maintain rakhne ke liye)
async function cleanUpCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > 40) {
    await cache.delete(keys[0]);
    cleanUpCache();
  }
}

// INSTALL — Caching all critical static assets offline
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

// ACTIVATE — Clean old caches and take control instantly
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

// FETCH — Smart Network-First Strategy with Exclusion Rules & Offline Fallback
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // HEAVY / DYNAMIC FILES KO CACHE SE EXCLUDE KAREIN (Supabase, PDFs, Avatars)
  if (
    url.endsWith('.pdf') || 
    url.includes('.supabase.co') || 
    url.includes('googleusercontent.com') ||
    url.includes('/avatars/')
  ) {
    return; // Direct network fetch, skip caching to avoid clutter
  }

  e.respondWith(
    fetch(e.request)
      .then(networkResponse => {
        // Safe 200 OK responses ko hi cache karein aur size limit maintain karein
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
        // Agar offline hain, toh cache se file do
        return caches.match(e.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Agar page cache mein bhi nahi hai, toh offline.html dikhao
          if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
            return caches.match('./offline.html');
          }
        });
      })
  );
});
