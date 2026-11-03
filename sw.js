const CACHE_NAME = 'roitx-study-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './profile.jpg',
  './1profile.jpg',
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

async function cleanUpCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > 40) {
    await cache.delete(keys[0]);
    await cleanUpCache(); // Add 'await' to ensure sequential deletion
  }
}


// FIXED: Safe caching taaki ek file miss hone se baki offline load hona na ruke
// FIXED: Robust Offline Network Fallback
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

// --- PUSH NOTIFICATION & BADGE HANDLER IN SW ---

// 1. Push Event: Server se push message aane par notification show karna
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

  const options = {
    body: data.body,
    icon: './1profile.jpg',
    badge: './1profile.jpg',
    data: { url: data.url || '/index.html' },
    vibrate: [200, 100, 200]
  };

  // Push notification dikhana aur App Icon par Badge set karna
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      // Set Badge API agar browser support karta hai
      (async () => {
        if ('setAppBadge' in navigator && data.badgeCount) {
          try {
            await navigator.setAppBadge(data.badgeCount);
          } catch (err) {
            console.error('Badge error:', err);
          }
        }
      })()
    ])
  );
});

// 2. Notification Click Event: Notification par click karne par redirect karna aur badge clear karna
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/index.html';

  event.waitUntil(
    Promise.all([
      // Click hone par badge clear ya decrease karna
      (async () => {
        if ('clearAppBadge' in navigator) {
          try {
            await navigator.clearAppBadge();
          } catch (err) {
            console.error('Clear badge error:', err);
          }
        }
      })(),
      // Specific page par redirect ya open karna
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
