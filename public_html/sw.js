// Self-decommissioning migration Service Worker
// Decommissions previous React PWA Service Worker and purges legacy Workbox caches

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Remove only legacy Workbox caches
      if ('caches' in self) {
        try {
          const cacheKeys = await caches.keys();
          const legacyCaches = cacheKeys.filter((key) => {
            return key === 'catalog-cache' || key.startsWith('workbox-precache-v2-');
          });

          await Promise.all(legacyCaches.map((key) => caches.delete(key)));
        } catch (err) {
          // Ignore cache deletion errors to allow unregister to proceed
        }
      }

      // 2. Unregister self
      try {
        await self.registration.unregister();
      } catch (err) {
        // Continue to reload clients
      }

      // 3. Reload controlled windows to fetch Historical V1 from network
      try {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        }
      } catch (err) {
        // Window navigation error fallback
      }
    })()
  );
});
