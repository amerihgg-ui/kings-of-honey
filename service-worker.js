const CACHE_NAME='nuvexa-hub-v11-6-smart-product-copy';
const CORE=['./manifest.webmanifest?v=11.6','./favicon.ico?v=11.6','./assets/branding/favicon-nuvexa-v10-2-32.png?v=11.6','./assets/branding/favicon-nuvexa-v10-2-48.png?v=11.6','./assets/branding/apple-touch-icon-nuvexa-v10-2.png?v=11.6','./assets/branding/logo-main.png','./assets/branding/app-icon-192.png?v=11.6','./assets/branding/app-icon-512.png?v=11.6'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)).catch(()=>null));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./index.html').then(r=>r||Response.error())));return;
  }
  if(url.origin!==location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));}return response;})));
});
