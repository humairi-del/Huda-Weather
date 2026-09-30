importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
const CACHE="hada-weather-v2-2-0";
const CORE=["./","./index.html","./manifest.webmanifest","./icon.svg","./sponsor-albaqira.jpg"];
self.addEventListener("install",e=>e.waitUntil(Promise.all([caches.open(CACHE).then(c=>c.addAll(CORE)),self.skipWaiting()])));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))),self.clients.claim()])));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});