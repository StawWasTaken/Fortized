// Fortized Service Worker
// Handles push notifications + ensures fresh HTML is always served

const SW_VERSION = '2026fixf';
const CACHE_NAME = 'ftz-shell-' + SW_VERSION;

// ── Install: skip waiting + wipe ALL caches so a stale versioned asset
// (e.g. an older ?v=... entry that snuck in mid-deploy) can't survive
// the upgrade. Belt-and-braces with the activate step below.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches, claim clients, signal them to reload ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell every open tab to reload so they get fresh HTML/CSS/JS
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'FTZ_SW_UPDATED', version: SW_VERSION });
          });
        });
      })
  );
});

// ── Fetch: network-first for HTML navigations, cache-first for versioned assets ──
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // HTML navigation requests: always go network-first, never cache.
  // Caching HTML in the SW caused stale pages on sub-page reloads.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match('/app'))
    );
    return;
  }

  // Versioned assets (?v=...): cache-first (they never change content for a given version)
  if (url.searchParams.has('v')) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return resp;
        });
      })
    );
    return;
  }
});

// ── Push Notifications ───────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Fortized';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/Fortized icon.png',
    badge: '/Fortized icon notif.png',
    tag: data.tag || 'fortized-notif',
    data: { url: data.url || '/app' },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
