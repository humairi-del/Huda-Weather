import {assets} from './assets.generated.js';
import {rainConsensusResponse} from './rain-consensus.js';
import {readOfficialBulletins} from './worker.js';
import {assessRain,officialAlert} from '../public/region-model.js';
const JSON_HEADERS={'cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(data,status=200)=>Response.json(data,{status,headers:JSON_HEADERS});
export async function cached(request,ctx,kind,seconds,load){
 const url=new URL(request.url);url.pathname='/__preview_v4/'+kind;url.search='';
 const cache=globalThis.caches?await caches.open('hada-preview-v4'):null,key=new Request(url);
 if(cache){const hit=await cache.match(key);if(hit)return hit.json();}
 const data=await load();
 if(cache)ctx.waitUntil(cache.put(key,Response.json(data,{headers:{'cache-control':'public, max-age='+seconds}})).catch(()=>{}));
 return data;
}
async function boundedJson(url){const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok||!response.body)throw Error('source_unavailable');const reader=response.body.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000)throw Error('source_too_large');parts.push(value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function localWeather(request,ctx,currentOnly){
 const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:'14.230586',longitude:'47.199415',timezone:'Asia/Aden',current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation',wind_speed_unit:'kmh',temperature_unit:'celsius',precipitation_unit:'mm'});
 if(!currentOnly){u.searchParams.set('forecast_days','7');u.searchParams.set('hourly','temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index');u.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum');}
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return cached(request,ctx,(currentOnly?'current':'forecast')+'/'+day,currentOnly?900:3600,async()=>({...await boundedJson(u.href),fetchedAt:Date.now()}));
}
async function official(request,ctx){return cached(request,ctx,'official',21600,async()=>{const d=await readOfficialBulletins();return {...d,checkedAt:Date.now()};});}
export default {async fetch(request,env,ctx){
 const url=new URL(request.url),p=url.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Preview is read-only',{status:405,headers:{Allow:'GET, HEAD'}});
 if(p==='/api/notifications/status')return json({ready:false,preview:true,channels:{morning:false,emergency:false}});
 try{
  if(p==='/api/current'||p==='/api/local-forecast')return json(await localWeather(request,ctx,p==='/api/current'));
  if(p==='/api/official-cyclone')return json(await official(request,ctx));
  if(['/api/region','/api/hazards','/api/rain-consensus'].includes(p)){
   const response=await rainConsensusResponse(request,ctx),rain=await response.json();
   if(!response.ok)return json({state:'unavailable',rain:null,assessment:{state:'unavailable',areas:[],alert:null}},503);
   if(p==='/api/rain-consensus')return json(rain);
   const assessment=assessRain(rain);
   return json({schema:'hada-region-v4',rain,assessment});
  }
  if(p.startsWith('/api/'))return json({error:'not_available_in_preview'},404);
  const item=assets[p==='/'?'/index.html':p];if(!item)return new Response('Not found',{status:404});
  const bytes=Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0));
  const body=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(request.method==='HEAD'?null:body,{headers:{'content-type':item.type,'cache-control':'no-cache','x-content-type-options':'nosniff','x-hada-environment':'preview-v4'}});
 }catch(error){console.warn(JSON.stringify({event:'preview_source_unavailable',path:p,reason:error.message}));return json({state:'unavailable',message:'لا توجد بيانات حديثة قابلة للتحقق الآن.'},503);}
}};
