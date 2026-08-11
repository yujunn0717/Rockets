const CACHE='rockets-lineup-manager-v1.1.4';
const ASSETS = [
  './',
  'index.html',
  'styles-v114.css',
  'app-v114.js',
  'manifest.webmanifest',
  'baseball-field.png',
  'rockets-watermark.png',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon-32.png'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./',copy));return response}).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
