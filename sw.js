const CACHE_NAME = 'control-gastos-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/estilos.css',
  '/js/app.js',
  '/js/chart.umd.js',
  '/js/firebase.js',
  '/js/firestore.js',
  '/js/firebase-config.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
