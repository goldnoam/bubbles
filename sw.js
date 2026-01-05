
const CACHE_NAME = 'fizzy-pop-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://ia800305.us.archive.org/32/items/Hot_Butter_-_Popcorn_1972/Hot_Butter_-_Popcorn_1972.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
