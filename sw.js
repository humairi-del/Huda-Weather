importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
const CACHE="hada-weather-v2-2-0b";
const CORE=["./","./index.html","./manifest.webmanifest","./icon.svg","./sponsor-albaqira.jpg","./patch-2.2.js"];
self.addEventListener("install",e=>e.waitUntil(Promise.all([caches.open(CACHE).then(c=>c.addAll(CORE)),self.skipWaiting()])));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))),self.clients.claim()])));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  const isPage=e.request.mode==="navigate"||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/");
  if(isPage){
    e.respondWith((async()=>{
      try{
        const r=await fetch(e.request);
        let text=await r.text();
        if(!text.includes("patch-2.2.js")){
          const bridge=`<script src="./patch-2.2.js?v=2.2.0"></script><script>(()=>{try{if(typeof starsData!==\"undefined\")window.starsData=starsData;if(typeof parseStarEntryDate===\"function\")window.parseStarEntryDate=parseStarEntryDate;const originalObserver=window.showObserverWeather;if(typeof originalObserver===\"function\")window.showObserverWeather=function(d){window.weatherData=d;return originalObserver(d)};if(typeof weatherData!==\"undefined\")window.weatherData=weatherData;if(typeof showHeaderStar===\"function\")showHeaderStar();if(typeof weatherData!==\"undefined\"&&weatherData){showObserverWeather(weatherData);showWeeklyWeather(weatherData);showWeatherAlerts(weatherData)}}catch(e){console.error(e)}})();</script>`;
          text=text.replace("</body>",bridge+"</body>");
        }
        const h=new Headers(r.headers);h.delete("content-length");h.delete("content-encoding");
        const out=new Response(text,{status:r.status,statusText:r.statusText,headers:h});
        caches.open(CACHE).then(c=>c.put(e.request,out.clone()));
        return out;
      }catch(err){
        const cached=await caches.match(e.request);if(cached)return cached;throw err;
      }
    })());
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
});