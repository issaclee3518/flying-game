const CACHE_NAME = 'desert-runner-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/game.js',
  '/auth.js',
  '/firebase-config.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에서 찾으면 반환, 없으면 네트워크에서 가져오기
        return response || fetch(event.request);
      }
    )
  );
});
