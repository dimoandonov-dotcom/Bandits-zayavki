// Името на кеша се сменя при всяка промяна на страницата. Браузърът инсталира
// нов service worker само когато ТОЗИ файл се промени - докато името стоеше
// „bandits-v1", новата страница не стигаше до телефона на Мони изобщо.
const CACHE = 'bandits-v3-2026-10-16';
const FILES = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

// Самата страница се тегли ПЪРВО от мрежата и се пази копие за без интернет.
// Така поправка се вижда още при следващото отваряне, вместо да чака изтриване
// на кеша. Останалото (библиотеката от CDN) си остава кеш първо - то не се мени.
self.addEventListener('fetch', e => {
  const req = e.request;
  const стрaница = req.mode === 'navigate'
    || (req.destination === 'document')
    || /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname) && new URL(req.url).origin === self.location.origin;
  if (стрaница) {
    e.respondWith(
      fetch(req).then(r => {
        const копие = r.clone();
        caches.open(CACHE).then(c => c.put(req, копие)).catch(()=>{});
        return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).catch(()=>{})));
});
