importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE="hada-weather-v2-2-2-r1";
const CORE=[
  "./",
  "./index.html",
  "./base-2.1.1.html",
  "./patch-2.2.js",
  "./stars-fix.js",
  "./dust-view-fix.js",
  "./sections-fix.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./sponsor-albaqira.jpg"
];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET" || new URL(request.url).origin!==self.location.origin)return;

  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response && response.ok){
        const cache=await caches.open(CACHE);
        cache.put(request,response.clone()).catch(()=>{});
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==="navigate"){
        const fallback=await caches.match("./index.html");
        if(fallback)return fallback;
      }
      throw error;
    }
  })());
});
