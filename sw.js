const CACHE_NAME = 'roitx-study-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './profile.jpg',
  './1profile.jpg',
  './notif.png',
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

// 1. Install Event: Assets ko cache mein save karna
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Purane caches ko saaf karna
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Safe Iterative Cache Limiter (No Call Stack Error)
async function cleanUpCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > 40) {
    for (let i = 0; i < keys.length - 40; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// 3. Fetch Event: Robust Offline Network Fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  if (
    url.endsWith('.pdf') || 
    url.includes('.supabase.co') || 
    url.includes('googleusercontent.com') ||
    url.includes('/avatars/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
            cleanUpCache();
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./offline.html');
          }
        });
      })
  );
});

// --- PUSH NOTIFICATION & BADGE HANDLER ---

self.addEventListener('push', function(event) {
  let data = {
    title: 'PM Roitx Notification',
    body: 'Naya update ya study material uplabdh hai!',
    url: '/index.html',
    badgeCount: 1
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const finalBody = data.body || data.message || 'Naya update uplabdh hai!';
  const finalUrl = data.url || data.link || '/index.html';
  const badgeVal = data.badgeCount || 1;

  const options = {
    body: finalBody,
    icon: '/profile.png', // Aapke assets ke mutabiq profile.jpg rakha hai
    badge: '/notif.png',
    data: { url: finalUrl },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'PM Roitx Study Hub', options),
      (async () => {
        // Service worker level par safe badge setting
        if ('setAppBadge' in self.registration) {
          try {
            await self.registration.setAppBadge(badgeVal);
          } catch (err) {
            console.error('Badge error:', err);
          }
        }
      })()
    ])
  );
});

// 4. Notification Click Event: Click hone par app kholna aur badge clear karna
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/index.html';

  event.waitUntil(
    Promise.all([
      (async () => {
        // Service worker level par safe badge clearing
        if ('clearAppBadge' in self.registration) {
          try {
            await self.registration.clearAppBadge();
          } catch (err) {
            console.error('Clear badge error:', err);
          }
        }
      })(),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    ])
  );
});
