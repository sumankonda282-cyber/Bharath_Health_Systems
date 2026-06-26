// Self-destroying service worker.
// The portals no longer use a PWA/service worker. This file exists only to
// remove any worker a browser still has registered from an older deployment:
// it unregisters itself, purges all caches, and reloads open tabs so they
// load fresh, un-cached code. Browsers always re-fetch /sw.js from the network
// on navigation, so this reliably evicts the stale worker for every visitor.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      await self.registration.unregister();
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    } catch (err) {
      // best-effort cleanup — nothing to recover if eviction fails
    }
  })());
});
