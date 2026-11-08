/**
 * Baby Showers Gallery - Offline Service Worker
 * Caches application shell & runtime thumbnails for instant loading
 */

const CACHE_NAME = 'baby-showers-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './gallery.js',
  './photos-data.js',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('Service Worker cache.addAll non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore cross-origin non-GET or GitHub API requests
  if (event.request.method !== 'GET') return;

  // Stale-while-revalidate for application shell & thumbnails
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (url.origin === location.origin || url.hostname.includes('github.io'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              // Cache thumbnails and app files, avoid caching huge original 20MB files in SW cache
              if (!url.pathname.includes('Baby%20Showers') && !url.pathname.includes('Baby Showers')) {
                cache.put(event.request, responseToCache);
              }
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
