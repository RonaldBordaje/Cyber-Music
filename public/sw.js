/**
 * Cyber Music – Service Worker
 * Caches app shell for offline-first experience.
 * Audio data is stored in IndexedDB (not the SW cache).
 *
 * Hint for TWA/WebView:
 *   "enableBackgroundAudio": true in twa-manifest.json
 *   ensures audio continues when the screen is off.
 */

const CACHE_NAME = 'cyber-music-v1';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install – cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS);
    })
  );
  self.skipWaiting();
});

// Activate – clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch – cache-first for shell, network-first for others
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Skip blob URLs
  if (event.request.url.startsWith('blob:')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
