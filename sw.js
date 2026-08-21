// Fortized Service Worker
// Handles push notifications + ensures fresh HTML is always served

const SW_VERSION = '2026fix512';
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

  // Versioned assets (?v=...): CACHE-FIRST with background revalidation
  // (stale-while-revalidate). These URLs are content-addressed by the ?v=
  // cache-bust — a new deploy bumps ?v=, changing the URL, so a cached
  // entry can NEVER be cross-version stale: a new version is always a cache
  // miss and fetched fresh. This is the fix for the slow-load complaint —
  // the old network-first { cache:'no-store' } path re-downloaded every
  // asset (incl. the ~3.6 MB app.js) from origin on EVERY load, bypassing
  // even the browser HTTP cache, so a cold-ish connection could hang long
  // enough that the page never appeared.
  //
  // The old comment's worry — an upstream CDN briefly serving stale bytes
  // for a NEW ?v= URL, then that poisoning the SW cache until a hard
  // refresh — is handled here by the background revalidate: we serve the
  // cached copy instantly, but ALWAYS re-fetch in the background and
  // overwrite the cache, so any bad entry self-heals on the very next load
  // instead of sticking. (The install handler also wipes all caches on
  // every SW version bump, so nothing survives a deploy to begin with.)
  if (url.searchParams.has('v')) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req)
          .then(resp => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
            }
            return resp;
          })
          .catch(() => cached || Response.error());
        // Keep the background revalidation alive past the response so the
        // cache is refreshed even when we answered from cache.
        if (cached) event.waitUntil(network.catch(() => {}));
        return cached || network;
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
