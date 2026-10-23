// Self-updating, cache-busting Service Worker for Koperasi PK Batam
const CACHE_VERSION = 'koperasi-sw-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Always fetch fresh from network for assets, scripts, and API
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
