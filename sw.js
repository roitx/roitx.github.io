const VERSION = "roitx-v5";
const STATIC_CACHE = `${VERSION}-static`;
const DYNAMIC_CACHE = `${VERSION}-dynamic`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/profile.jpg",
  "/study-timer.html",
  "/view.html",
  "/reference-book.html"
];

// INSTALL
self.addEventListener("install", e => {
  console.log("Service Worker Installed 🛠️");
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log("Caching static assets...");
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ACTIVATE
self.addEventListener("activate", e => {
  console.log("Service Worker Activated 🟢");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (!k.startsWith(VERSION)) {
            console.log(`Deleting old cache: ${k}`);
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH — cache-first with dynamic fallback
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        console.log(`Serving cached: ${e.request.url}`);
        return cached;
      }

      return fetch(e.request)
        .then(res => {
          return caches.open(DYNAMIC_CACHE).then(cache => {
            console.log(`Caching dynamic resource: ${e.request.url}`);
            cache.put(e.request, res.clone());
            return res;
          });
        })
        .catch(() => {
          // Fallback to index.html for SPA
          if (e.request.headers.get("accept").includes("text/html")) {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// BACKGROUND SYNC (future-ready)
self.addEventListener("sync", e => {
  if (e.tag === "roitx-sync") {
    console.log("ROITX background sync completed ✅");
    // You can later add actual sync logic here
  }
});

// PUSH NOTIFICATIONS (future-ready)
self.addEventListener("push", e => {
  const data = e.data?.json() || {
    title: "ROITX",
    body: "New update available 🚀",
  };

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/profile.jpg",
      badge: "/profile.jpg",
      vibrate: [100, 50, 100],
      tag: "roitx-notify",
      actions: [
        { action: "open_app", title: "Open App" },
        { action: "dismiss", title: "Dismiss" }
      ]
    })
  );
});

// NOTIFICATION CLICK HANDLER
self.addEventListener("notificationclick", e => {
  console.log("Notification clicked", e.notification);
  e.notification.close();

  e.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if (client.url.endsWith("/index.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/index.html");
      }
    })
  );
});
