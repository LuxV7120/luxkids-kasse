/* Luxkids Kasse v3.44 – offline navigation for the GitHub Pages app. */
'use strict';
const CACHE_NAME='luxkids-kasse-offline-v344';
const CACHE_PREFIX='luxkids-kasse-offline-';
const SHELL_URL=new URL('./index.html',self.registration.scope).href;
const ROOT_URL=new URL('./',self.registration.scope).href;
const ASSET_URLS=['./apple-touch-icon.png','./luxkids-icon.png','./manifest.webmanifest'].map(path=>new URL(path,self.registration.scope).href);

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // An installation only succeeds when the complete HTML is cached.
  await cache.add(new Request(SHELL_URL,{cache:'reload'}));
  await cache.addAll(ASSET_URLS.map(url=>new Request(url,{cache:'reload'})));
  await self.skipWaiting();
 })());
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const target=new URL(event.request.url);
 if(target.origin!==self.location.origin)return;
 if(ASSET_URLS.includes(target.href)){
  event.respondWith(caches.match(event.request).then(saved=>saved||fetch(event.request)));
  return;
 }
 if(event.request.mode!=='navigate')return;
 // Only serve our own app page, never other GitHub Pages paths.
 if(target.pathname!==new URL(SHELL_URL).pathname&&target.pathname!==new URL(ROOT_URL).pathname)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  // Fetch online updates when available. Fall back quickly on unreliable networks.
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try{
   const response=await fetch(event.request,{signal:controller.signal,cache:target.searchParams.has('app_update')?'reload':'default'});
   if(response.ok){
    // Cache the app HTML under one canonical URL, regardless of root/index access.
    // Cache write errors must never block a working online checkout page.
    try{await cache.put(SHELL_URL,response.clone())}catch(err){console.warn('Offline cache update failed',err)}
    return response;
   }
   const saved=await cache.match(SHELL_URL);
   return saved||response;
  }catch(err){
   const saved=await cache.match(SHELL_URL);
   return saved||Response.error();
  }finally{
   clearTimeout(timer);
  }
 })());
});
