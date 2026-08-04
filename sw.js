const CACHE = 'lineup-maker-pwa-v1.0.4';
const ASSETS = [
  './',
  'index.html',
  'styles.css?v=104',
  'app.js?v=104',
  'manifest.webmanifest?v=104',
  'baseball-field.png',
  'icon-192.png?v=104',
  'icon-512.png'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req, {cache:'no-store'}).then(res => {
      const copy=res.clone(); caches.open(CACHE).then(c=>c.put('./',copy)); return res;
    }).catch(()=>caches.match('./')));
    return;
  }
  event.respondWith(fetch(req).then(res=>{
    const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return res;
  }).catch(()=>caches.match(req)));
});
