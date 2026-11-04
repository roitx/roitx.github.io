const CACHE_NAME = 'roitx-study-cache-v17';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './profile.jpg',
  './1profile.jpg',
  './notif.png'
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
    await cleanUpCache();
  }
}

// Robust Offline Network Fallback
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

// --- PUSH NOTIFICATION & AUTO-INCREMENT BADGE HANDLER IN SW ---

self.addEventListener('push', function(event) {
  let data = {
    title: 'PM Roitx Notification',
    body: 'Naya update ya study material uplabdh hai!',
    url: '/index.html'
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

  const options = {
    body: finalBody,
    icon: '/profile.png',
    badge: '/notif.png',
    data: { url: finalUrl },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'PM Roitx Study Hub', options),
      (async () => {
        try {
          // Check if browser supports getting and setting app badge
          if ('navigator' in self && 'getAppBadge' in navigator && 'setAppBadge' in navigator) {
            let currentBadge = 0;
            try {
              currentBadge = await navigator.getAppBadge();
            } catch (e) {
              currentBadge = 0;
            }
            const newBadgeCount = (currentBadge || 0) + 1;
            await navigator.setAppBadge(newBadgeCount);
          } else if ('setAppBadge' in self.registration) {
            // Fallback for service worker registration level
            await self.registration.setAppBadge(1);
          }
        } catch (err) {
          console.error('Auto-increment badge error:', err);
        }
      })()
    ])
  );
});

// Notification Click Event: App open hone par badge clear karna
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/index.html';

  event.waitUntil(
    Promise.all([
      (async () => {
        try {
          if ('navigator' in self && 'clearAppBadge' in navigator) {
            await navigator.clearAppBadge();
          } else if (self.registration.clearAppBadge) {
            await self.registration.clearAppBadge();
          }
        } catch (err) {
          console.error('Clear badge error:', err);
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
