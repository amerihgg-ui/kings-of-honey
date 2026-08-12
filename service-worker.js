/* NUVEXA HUB V14.2 — cache refresh for order sync + reviews */
const CACHE_NAME='nuvexa-hub-v15-6-seller-buttons';
const CORE=[
  './index.html',
  './assets/css/app.css?v=12.9',
  './assets/css/store-visual-v14.css?v=14.0',
  './assets/css/customer-account-v14-4.css?v=14.4',
  './assets/css/about-scene-story-v14-7.css?v=14.7.2',
  './assets/css/project-builder-v14-8.css?v=14.8.1',
  './assets/css/seller-approval-v15-6.css?v=15.6',
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
  './assets/js/modules/customer-account-v14-4.js?v=14.4',
  './assets/js/modules/seller-approval-workflow-v15-6.js?v=15.6',
  './assets/js/modules/about-scene-story-v14-7.js?v=14.7.2',
  './assets/js/modules/project-builder-v15-5.js?v=15.5',
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
  if(url.origin!==location.origin)return;

  const isNavigation=event.request.mode==='navigate';
  const isCode=/\.(?:html?|js|css)$/i.test(url.pathname);

  if(isNavigation||isCode){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request).then(response=>
        response||
        (isNavigation?caches.match('./index.html'):null)||
        Response.error()
      ))
    );
    return;
  }

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

