const CACHE_NAME='rockets-lineup-manager-v1.2.3';
const APP_SHELL=[
  './',
  './index.html',
  './styles-v123.css',
  './app-v123.js',
  './baseball-field.png',
  './rockets-watermark.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

async function notifyClients(type){
  const clientsList=await self.clients.matchAll({includeUncontrolled:true,type:'window'});
  for(const client of clientsList){
    client.postMessage({type});
  }
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await notifyClients('OFFLINE_CACHE_READY');
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
    await notifyClients('OFFLINE_CACHE_READY');
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        if(fresh&&fresh.ok){
          const cache=await caches.open(CACHE_NAME);
          event.waitUntil(cache.put('./index.html',fresh.clone()));
        }
        return fresh;
      }catch{
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    try{
      const fresh=await fetch(req);
      if(fresh&&fresh.ok&&new URL(req.url).origin===self.location.origin){
        const cache=await caches.open(CACHE_NAME);
        event.waitUntil(cache.put(req,fresh.clone()));
      }
      return fresh;
    }catch{
      return new Response('',{status:504,statusText:'Offline'});
    }
  })());
});
