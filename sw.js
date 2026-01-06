const CACHE_NAME = 'fizzy-pop-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => caches.match('/'));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(k => k !== CACHE_NAME && caches.delete(k))
    ))
  );
});