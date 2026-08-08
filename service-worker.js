const CACHE_NAME='nuvexa-hub-v12-9-final-workflow';
const CORE=[
  './index.html',
  './assets/css/app.css?v=12.9',
  './assets/js/core.js?v=12.9',
  './assets/js/app.js?v=12.9',
  './assets/js/modules/auth.js?v=12.9',
  './assets/js/modules/admin.js?v=12.9',
  './assets/js/modules/customers.js?v=12.9',
  './assets/js/modules/licenses.js?v=12.9',
  './assets/js/modules/reports.js?v=12.9',
  './assets/js/modules/settings.js?v=12.9',
  './assets/js/modules/orders.js?v=12.9',
  './assets/js/modules/products.js?v=12.9',
  './assets/js/modules/seller.js?v=12.9',
  './manifest.webmanifest?v=12.9',
  './favicon.ico?v=12.9',
  './assets/branding/favicon-nuvexa-v10-2-32.png?v=12.9',
  './assets/branding/favicon-nuvexa-v10-2-48.png?v=12.9',
  './assets/branding/apple-touch-icon-nuvexa-v10-2.png?v=12.9',
  './assets/branding/logo-main.png',
  './assets/branding/app-icon-192.png?v=12.9',
  './assets/branding/app-icon-512.png?v=12.9'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./index.html').then(response=>response||Response.error())));
    return;
  }
  if(url.origin!==location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy))}
    return response;
  })));
});
