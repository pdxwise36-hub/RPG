const CACHE_NAME = 'emberfall-v27';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/ui.js',
  './js/map.js',
  './js/mapgen.js',
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
  './icons/sprites/frostgolem.png',
  './icons/sprites/icesprite.png',
  './icons/sprites/glacialtitan.png',
  './icons/sprites/wyrmling.png',
  './icons/sprites/drake.png',
  './icons/sprites/ancientdragon.png',
  './icons/sprites/chest.png',
  './icons/sprites/wolfpup.png',
  './icons/sprites/hawk.png',
  './icons/sprites/salamander.png',
  './icons/sprites/babygolem.png',
  './icons/sprites/turtle.png',
  './icons/sprites/fox.png',
  './icons/sprites/boar.png',
  './icons/sprites/owl.png',
  './icons/sprites/panther.png',
  './icons/sprites/dragonling.png',
  './icons/sprites/merfolkraider.png',
  './icons/sprites/reefserpent.png',
  './icons/sprites/drownedqueen.png',
  './icons/sprites/thornling.png',
  './icons/sprites/wispmoth.png',
  './icons/sprites/elderent.png',
  './icons/sprites/dustjackal.png',
  './icons/sprites/sandviper.png',
  './icons/sprites/sandreaver.png',
  './icons/sprites/cinderimp.png',
  './icons/sprites/magmahound.png',
  './icons/sprites/moltenwyrm.png',
  './icons/sprites/stormharpy.png',
  './icons/sprites/rockwyvern.png',
  './icons/sprites/stormguardtitan.png',
  './icons/sprites/bogleech.png',
  './icons/sprites/plaguerat.png',
  './icons/sprites/rotlord.png',
  './icons/sprites/crystalstalker.png',
  './icons/sprites/gemooze.png',
  './icons/sprites/prismcolossus.png',
  './icons/sprites/shadestalker.png',
  './icons/sprites/nightmarehound.png',
  './icons/sprites/nightmaredrake.png',
  './icons/sprites/starwisp.png',
  './icons/sprites/cloudserpent.png',
  './icons/sprites/astralguardian.png',
  './icons/sprites/voidspawn.png',
  './icons/sprites/chaoshound.png',
  './icons/sprites/worldserpent.png',
  './icons/sprites/ashwraith.png',
  './icons/sprites/cindergolem.png',
  './icons/sprites/ashlord.png',
  './icons/sprites/thunderhawk.png',
  './icons/sprites/stormelemental.png',
  './icons/sprites/tempestking.png',
  './icons/sprites/bonereaper.png',
  './icons/sprites/wraithserpent.png',
  './icons/sprites/boneemperor.png',
  './icons/sprites/chaosspawn.png',
  './icons/sprites/voidhound.png',
  './icons/sprites/chaosharbinger.png',
  './icons/sprites/eternalguardian.png',
  './icons/sprites/timelesswraith.png',
  './icons/sprites/eternalsovereign.png',
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
