const CACHE_NAME = 'financeapp-v2-' + Date.now();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Always fetch fresh network response first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
