// onesignal:managed v1 — preserve the production registration path and push scope.
if(self.location.hostname==='hada-weather.com')importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
const CACHE='hada-weather-v3-0-1';
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('hada-weather-v')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.endsWith('sw.js')||url.pathname.includes('OneSignal'))return;
 event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));}return response;}catch{const hit=await caches.match(request);if(hit)return hit;if(request.mode==='navigate'){const home=await caches.match(new URL('/',url));if(home)return home;}return new Response('تعذر الاتصال؛ اتصل بالإنترنت لتحديث طقس هدى.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});}})());
});

