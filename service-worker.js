const CACHE_NAME = 'b2ks-rpg-v19-cache';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './data/animals.json',
  './js/01-audio-firebase-state.js',
  './js/02-world-draw-street.js',
  './js/03-house-and-rooms.js',
  './js/04-world-interactables.js',
  './js/05-core-tasks-quizzes.js',
  './js/06-market-salon-arcade.js',
  './js/07-phone-dining.js',
  './js/08-main-loop.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Bỏ qua các API động (Firebase, Wikipedia, MyMemory) để luôn lấy dữ liệu mới
  if (
    url.includes('firebasedatabase.app') ||
    url.includes('wikipedia.org') ||
    url.includes('mymemory.translated.net')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200 && event.request.method === 'GET') {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});