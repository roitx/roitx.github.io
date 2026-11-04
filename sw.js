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

  // Aapka final selected icon & badge configuration
  const options = {
    body: data.body,
    icon: '/profile.png',
    badge: '/notif.png',
    data: { url: data.url || '/index.html' },
    vibrate: [200, 100, 200]
  };

  // Push notification dikhana aur Service Worker registration par badge set karna
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'PM Roitx Study Hub', options),
      (async () => {
        if ('setAppBadge' in self.registration && data.badgeCount) {
          try {
            await self.registration.setAppBadge(data.badgeCount);
          } catch (err) {
            console.error('Badge error:', err);
          }
        }
      })()
    ])
  );
});

// 2. Notification Click Event: Notification par click karne par redirect karna aur badge clear karna
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

  // Key mismatch se bachne ke liye fallback (body ya message dono check karega)
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
    self.registration.showNotification(data.title || 'PM Roitx Study Hub', options)
  );
});
