const CACHE_NAME = 'b2ks-home-pwa-v2';
const ASSETS_TO_CACHE = [
  './', './index.html', './manifest.json', './css/styles.css', './data/animals.json',
  './js/01-config-audio-sync.js', './js/02-ui-tasks-shop.js', './js/03-room-tv-custom.js',
  './js/04-canvas-world.js', './js/05-english-lab.js', './js/06-arcade-online.js',
  './js/07-phone-dining.js', './js/08-zoo-market-exchange.js', './js/09-main-loop.js',
  './icons/icon-192.svg', './icons/icon-512.svg'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  if (url.includes('firebasedatabase.app') || url.includes('wikipedia.org') || url.includes('mymemory.translated.net') || e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
