const CACHE_NAME = 'emberfall-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/ui.js',
  './js/map.js',
  './js/battle.js',
  './js/data.js',
  './js/state.js',
  './js/save.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/sprites/hero.png',
  './icons/sprites/slime.png',
  './icons/sprites/goblin.png',
  './icons/sprites/wolf.png',
  './icons/sprites/darkknight.png',
  './icons/sprites/bat.png',
  './icons/sprites/specter.png',
  './icons/sprites/lich.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
