const CACHE_NAME = 'nuvexa-hub-v9-2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/branding/logo-main.png',
  './assets/branding/app-icon-192.png',
  './assets/branding/app-icon-512.png',
  './assets/videos/nuvexa_hub_intro_desktop.mp4',
  './assets/videos/nuvexa_hub_intro_mobile.mp4'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
    return response;
  }).catch(() => caches.match(event.request)));
});
