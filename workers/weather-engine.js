import core from '../public/weather-core.js';
export const MODELS=['ecmwf_ifs','gfs_seamless','icon_seamless','gem_global','ecmwf_aifs025_single'];
const CURRENT='temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation';
const HOURLY='temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index';
const DAILY='weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum';
export function weatherUrl(model=null){const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:'14.230586',longitude:'47.199415',timezone:core.ZONE,forecast_days:'7',wind_speed_unit:'kmh',precipitation_unit:'mm',temperature_unit:'celsius'});if(model){u.searchParams.set('models',model);u.searchParams.set('daily','temperature_2m_max,temperature_2m_min,precipitation_sum');}else{u.searchParams.set('current',CURRENT);u.searchParams.set('hourly',HOURLY);u.searchParams.set('daily',DAILY);}return u.href;}
export const DUST_URL='https://air-quality-api.open-meteo.com/v1/air-quality?latitude=14.230586&longitude=47.199415&hourly=dust&timezone=Asia%2FAden&forecast_days=3';
export async function boundedJson(response,limit=512000){if(!response.ok||!response.body)throw Error('source_http_'+response.status);const reader=response.body.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('source_too_large');parts.push(value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function read(url,fetcher){return boundedJson(await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{Accept:'application/json'}}));}
export function validate(d,now=Date.now()){
 if(d?.timezone!==core.ZONE||!core.finite(d.latitude)||!core.finite(d.longitude)||Math.abs(d.latitude-14.230586)>.3||Math.abs(d.longitude-47.199415)>.3||!core.finite(d.current?.temperature_2m)||d.current_units?.temperature_2m!=='°C'||d.current_units?.wind_speed_10m!=='km/h'||d.hourly_units?.precipitation!=='mm'||d.hourly_units?.precipitation_probability!=='%'||d.daily?.time?.length!==7||d.daily.time[0]!==core.dayKey(now)||d.daily_units?.precipitation_sum!=='mm')throw Error('invalid_weather');
 const h=d.hourly;if(!Array.isArray(h?.time)||h.time.length<72)throw Error('incomplete_hours');for(const key of HOURLY.split(','))if(!Array.isArray(h[key])||h[key].length!==h.time.length)throw Error('incomplete_'+key);for(const key of DAILY.split(','))if(d.daily[key]?.length!==7)throw Error('invalid_daily');
 if(!Number.isFinite(core.stamp(d.current.time))||now-core.stamp(d.current.time)>90*60000||core.stamp(d.current.time)>now+300000)throw Error('stale_current');return d;
}
export async function readEngine(now=Date.now(),fetcher=fetch){
 const results=await Promise.allSettled([read(weatherUrl(),fetcher),...MODELS.map(m=>read(weatherUrl(m),fetcher)),read(DUST_URL,fetcher)]);
 if(results[0].status!=='fulfilled')throw Error('weather_unavailable');const data=validate(results[0].value,now);
 const models=MODELS.map((model,i)=>{const r=results[i+1];if(r.status!=='fulfilled')return {model,available:false};const d=r.value;const valid=d.timezone===core.ZONE&&JSON.stringify(d.daily?.time)===JSON.stringify(data.daily.time)&&d.daily_units?.precipitation_sum==='mm'&&['temperature_2m_min','temperature_2m_max','precipitation_sum'].every(k=>d.daily[k]?.length===7&&d.daily[k].every(core.finite));return valid?{model,available:true,daily:d.daily}:{model,available:false};});
 // Keep native probability from Open-Meteo's probability forecast. A deterministic
 // precipitation total is never converted into a made-up percentage.
 const dustResult=results.at(-1),dust=dustResult.status==='fulfilled'&&dustResult.value.timezone===core.ZONE&&/g\/m/.test(dustResult.value.hourly_units?.dust||'')?dustResult.value:null;
 const available=models.filter(m=>m.available);const comparison=data.daily.time.map((day,i)=>({day,models:available.length,temperatureMinRange:available.length?[Math.min(...available.map(m=>m.daily.temperature_2m_min[i])),Math.max(...available.map(m=>m.daily.temperature_2m_min[i]))]:null,temperatureMaxRange:available.length?[Math.min(...available.map(m=>m.daily.temperature_2m_max[i])),Math.max(...available.map(m=>m.daily.temperature_2m_max[i]))]:null,rainRange:available.length?[Math.min(...available.map(m=>m.daily.precipitation_sum[i])),Math.max(...available.map(m=>m.daily.precipitation_sum[i]))]:null}));
 data.engine={comparison,schema:'hada-weather-engine-v1',fetchedAt:now,models,availableModels:models.filter(m=>m.available).length,probabilitySource:'Open-Meteo probabilistic forecast',dust};return data;
}
export async function engineResponse(request,ctx,fetcher=fetch,now=Date.now()){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});if(request.method==='HEAD')return new Response(null,{headers:{'cache-control':'no-store'}});
 const key=new Request(new URL('/__cache/weather-engine-v1/'+core.dayKey(now),request.url));let cache;
 try{if(globalThis.caches){cache=await caches.open('hada-weather-engine-v1');const hit=await cache.match(key);if(hit){const d=await hit.clone().json();if(core.isFresh(d,now)&&now-d.engine.fetchedAt<900000)return hit;}}}catch{cache=null;}
 try{const d=await readEngine(now,fetcher);const response=Response.json(d,{headers:{'cache-control':'public,max-age=300','x-content-type-options':'nosniff'}});if(cache)ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));return response;}catch{return Response.json({error:'weather_unavailable'},{status:503,headers:{'cache-control':'no-store'}});}
}
