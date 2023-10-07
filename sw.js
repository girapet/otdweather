/* eslint-env serviceworker */

const VERSION = '1.0.12';

const precacheFileNames = [
  './css/images/baseline-my_location-24px.svg',
  './css/images/baseline-zoom_out_map-24px.svg',
  './css/index.css',
  './css/leaflet.css',
  './icon/icon048.png',
  './icon/icon096.png',
  './icon/icon144.png',
  './icon/icon192.png',
  './icon/icon256.png',
  './icon/icon384.png',
  './icon/icon512.png',
  './js/forecast-service.js',
  './js/index.js',
  './js/leaflet-extensions.js',
  './js/leaflet.js',
  './js/precipitation-layer.js',
  './index.html',
  './'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(precacheFileNames))
      .then(self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => cacheNames.filter(cacheName => cacheName !== VERSION))
      .then(cachesToDelete => Promise.all(cachesToDelete.map(cacheToDelete => caches.delete(cacheToDelete))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(function(response) {
        return response;
      });
    })
  );
});
