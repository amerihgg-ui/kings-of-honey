/* NUVEXA HUB V14.2 — cache refresh for order sync + reviews */
const CACHE_NAME='nuvexa-hub-v14-3-customer-account-experience';
const CORE=[
  './index.html',
  './assets/css/app.css?v=12.9',
  './assets/css/store-visual-v14.css?v=14.0',
  './assets/css/about-story-v14-1.css?v=14.1',
  './assets/css/customer-auth-v14-2.css?v=14.2',
  './assets/css/customer-account-v14-3.css?v=14.3',
  './assets/js/core.js?v=12.9',
  './assets/js/modules/auth.js?v=12.9',
  './assets/js/modules/admin.js?v=12.9',
  './assets/js/modules/customers.js?v=12.9',
  './assets/js/modules/licenses.js?v=12.9',
  './assets/js/modules/reports.js?v=12.9',
  './assets/js/modules/settings.js?v=12.9',
  './assets/js/modules/orders.js?v=12.9',
  './assets/js/modules/products.js?v=12.9',
  './assets/js/modules/seller.js?v=12.9',
  './assets/js/modules/reviews.js?v=13.0',
  './assets/js/modules/order-flow.js?v=13.3',
  './assets/js/modules/order-status-menu.js?v=13.4',
  './assets/js/app.js?v=12.9',
  './assets/js/modules/store-visual.js?v=14.0',
  './assets/js/modules/about-story.js?v=14.1',
  './assets/js/modules/customer-auth-visual.js?v=14.2',
  './assets/js/modules/customer-account-visual.js?v=14.3',
  './manifest.webmanifest?v=12.9',
  './favicon.ico?v=12.9',
  './assets/branding/favicon-nuvexa-v10-2-32.png?v=12.9',
  './assets/branding/favicon-nuvexa-v10-2-48.png?v=12.9',
  './assets/branding/apple-touch-icon-nuvexa-v10-2.png?v=12.9',
  './assets/branding/logo-main.png',
  './assets/branding/app-icon-192.png?v=12.9',
  './assets/branding/app-icon-512.png?v=12.9'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).catch(()=>null));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .catch(()=>caches.match('./index.html').then(response=>response||Response.error()))
    );
    return;
  }

  if(url.origin!==location.origin)return;

  event.respondWith(
    caches.match(event.request).then(cached=>
      cached||fetch(event.request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
    )
  );
});
