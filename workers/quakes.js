import scope from '../public/geo-scope.js';
import area from '../public/yemen-monitoring-area.json' with {type:'json'};
import {boundedJson} from './weather-engine.js';
export function filterQuakes(data,now=Date.now()){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('invalid_quakes');
 const features=data.features.filter(f=>{const p=f.properties,c=f.geometry?.coordinates;return f.geometry?.type==='Point'&&Array.isArray(c)&&scope.contains(area,c[0],c[1])&&Number.isFinite(p?.mag)&&p.mag>=0&&p.mag<=10&&Number.isFinite(p.time)&&p.time<=now+300000&&p.time>=now-30*86400000;}).sort((a,b)=>b.properties.time-a.properties.time).slice(0,100).map(f=>({type:'Feature',id:String(f.id).slice(0,100),geometry:{type:'Point',coordinates:f.geometry.coordinates.slice(0,3)},properties:{mag:f.properties.mag,time:f.properties.time,place:String(f.properties.place||'موقع ضمن نطاق اليمن').slice(0,200)}}));
 return {type:'FeatureCollection',features,checkedAt:now,scope:'Yemen land and Marine Regions maritime polygons'};
}
export async function quakesResponse(request,ctx,fetcher=fetch,now=Date.now()){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});if(request.method==='HEAD')return new Response(null);
 const key=new Request(new URL('/__cache/yemen-quakes-v1',request.url));let cache;try{if(globalThis.caches){cache=await caches.open('hada-quakes-v1');const r=await cache.match(key);if(r&&now-(await r.clone().json()).checkedAt<10*60000)return r;}}catch{cache=null;}
 try{const [west,south,east,north]=area.bbox,u=new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');u.search=new URLSearchParams({format:'geojson',starttime:new Date(now-30*86400000).toISOString(),minlatitude:String(south),maxlatitude:String(north),minlongitude:String(west),maxlongitude:String(east),orderby:'time',limit:'1000',eventtype:'earthquake'});const data=await boundedJson(await fetcher(u.href,{redirect:'manual',signal:AbortSignal.timeout(18000)}),2000000);const r=Response.json(filterQuakes(data,now),{headers:{'cache-control':'public,max-age=300'}});if(cache)ctx.waitUntil(cache.put(key,r.clone()).catch(()=>{}));return r;}catch{return Response.json({error:'quakes_unavailable'},{status:503,headers:{'cache-control':'no-store'}});}
}
