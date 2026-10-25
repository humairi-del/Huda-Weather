import core from '../public/weather-core.js';
import config from '../public/rasid-config.js';
export const MODELS=config.comparisonModels;
const CURRENT='temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation';
const HOURLY='temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index';
const DAILY='weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum';
const TTL=15*60000;
export function weatherUrl(model=null,full=false){const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:String(config.latitude),longitude:String(config.longitude),timezone:core.ZONE,forecast_days:'7',wind_speed_unit:'kmh',precipitation_unit:'mm',temperature_unit:'celsius'});if(model)u.searchParams.set('models',model);if(model&&!full)u.searchParams.set('daily','temperature_2m_max,temperature_2m_min,precipitation_sum');else{u.searchParams.set('current',CURRENT);u.searchParams.set('hourly',HOURLY);u.searchParams.set('daily',DAILY);}return u.href;}
export const DUST_URL=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${config.latitude}&longitude=${config.longitude}&hourly=dust&timezone=Asia%2FAden&forecast_days=3`;
export async function boundedJson(response,limit=512000){if(!response.ok||!response.body)throw Error('source_http_'+response.status);const reader=response.body.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('source_too_large');parts.push(value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function read(url,fetcher,timeout=10000){return boundedJson(await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(timeout),headers:{Accept:'application/json'}}));}
const nullable=(values,test)=>Array.isArray(values)&&values.every(v=>v===null||test(v));
export function validate(d,now=Date.now()){
 const f=core.finite,p=core.prob;
 if(d?.timezone!==core.ZONE||!f(d.latitude)||!f(d.longitude)||Math.abs(d.latitude-config.latitude)>.3||Math.abs(d.longitude-config.longitude)>.3||!d.current||(d.current.temperature_2m!==null&&!f(d.current.temperature_2m))||d.current_units?.temperature_2m!=='°C'||d.current_units?.wind_speed_10m!=='km/h'||d.current_units?.relative_humidity_2m!=='%'||d.hourly_units?.temperature_2m!=='°C'||d.hourly_units?.wind_speed_10m!=='km/h'||d.hourly_units?.relative_humidity_2m!=='%'||d.hourly_units?.wind_direction_10m!=='°'||d.hourly_units?.precipitation!=='mm'||d.hourly_units?.precipitation_probability!=='%'||d.daily_units?.temperature_2m_min!=='°C'||d.daily_units?.temperature_2m_max!=='°C'||d.daily_units?.precipitation_probability_max!=='%'||d.daily_units?.precipitation_sum!=='mm')throw Error('invalid_units_or_location');
 if(!Array.isArray(d.daily?.time)||d.daily.time.length!==7||d.daily.time.some((t,i)=>t!==core.dayKey(core.stamp(core.dayKey(now))+i*core.DAY)))throw Error('invalid_days');
 const h=d.hourly;if(!Array.isArray(h?.time)||h.time.length<168||h.time.some((t,i)=>t!==new Date(Date.parse(d.daily.time[0]+'T00:00:00Z')+i*core.HOUR).toISOString().slice(0,16)))throw Error('incomplete_hours');
 for(const key of HOURLY.split(','))if(!Array.isArray(h[key])||h[key].length!==h.time.length)throw Error('incomplete_'+key);
 for(const key of DAILY.split(','))if(d.daily[key]?.length!==7)throw Error('invalid_daily');
 for(const k of ['temperature_2m_min','temperature_2m_max'])if(!nullable(d.daily[k],f))throw Error('missing_daily_temperature');
 const code=v=>Number.isInteger(v)&&[0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(v);
 if(!nullable(h.temperature_2m,f)||!nullable(h.weather_code,code)||!nullable(d.daily.weather_code,code)||!nullable(h.uv_index,v=>f(v)&&v>=0)||!nullable(h.wind_gusts_10m,v=>f(v)&&v>=0)||!nullable(d.daily.precipitation_sum,v=>f(v)&&v>=0))throw Error('invalid_weather_values');
 if(!nullable(d.daily.precipitation_probability_max,p)||!nullable(h.precipitation_probability,p)||!nullable(h.relative_humidity_2m,p)||!nullable(h.wind_direction_10m,v=>f(v)&&v>=0&&v<=360)||!nullable(h.wind_speed_10m,v=>f(v)&&v>=0)||!nullable(h.precipitation,v=>f(v)&&v>=0))throw Error('invalid_values');
 if(!Number.isFinite(core.stamp(d.current.time))||now-core.stamp(d.current.time)>90*60000||core.stamp(d.current.time)>now+300000)throw Error('stale_current');return d;
}
export async function readEngine(now=Date.now(),fetcher=fetch){
 let data,source='Open-Meteo',model='best_match';
 try{data=validate(await read(weatherUrl(),fetcher,7000),now);}catch{data=validate(await read(weatherUrl('gfs_seamless',true),fetcher,7000),now);model='gfs_seamless';source='Open-Meteo · GFS';}
 // Open-Meteo returns model-based current valid time, not an observation or issuance timestamp.
 data.engine={schema:'hada-weather-engine-v1',fetchedAt:now,requestStartedAt:now,validTime:data.current.time,issuedAt:null,source,model,probabilitySource:'Open-Meteo native forecast probability',enrichment:'pending',models:MODELS.map(model=>({model,available:false,pending:true})),availableModels:0,dust:null,comparison:[]};return data;
}
export async function enrichEngine(base,fetcher=fetch){
 const results=await Promise.allSettled([...MODELS.map(m=>read(weatherUrl(m),fetcher)),read(DUST_URL,fetcher)]);
 const models=MODELS.map((model,i)=>{const r=results[i];if(r.status!=='fulfilled')return {model,available:false};const d=r.value;const valid=d.timezone===core.ZONE&&core.finite(d.latitude)&&core.finite(d.longitude)&&Math.abs(d.latitude-config.latitude)<=.3&&Math.abs(d.longitude-config.longitude)<=.3&&JSON.stringify(d.daily?.time)===JSON.stringify(base.daily.time)&&d.daily_units?.precipitation_sum==='mm'&&d.daily_units?.temperature_2m_min==='°C'&&d.daily_units?.temperature_2m_max==='°C'&&['temperature_2m_min','temperature_2m_max','precipitation_sum'].every(k=>d.daily[k]?.length===7&&d.daily[k].every(v=>core.finite(v)&&(k!=='precipitation_sum'||v>=0)));return valid?{model,available:true,daily:d.daily}:{model,available:false};});
 const r=results.at(-1),dust=r.status==='fulfilled'&&r.value.timezone===core.ZONE&&core.finite(r.value.latitude)&&core.finite(r.value.longitude)&&Math.abs(r.value.latitude-config.latitude)<.3&&Math.abs(r.value.longitude-config.longitude)<.3&&/^(?:μ|µ|u)g\/m³$/.test(r.value.hourly_units?.dust||'')?r.value:null;
 const available=models.filter(m=>m.available),comparison=base.daily.time.map((day,i)=>({day,models:available.length,temperatureMinRange:available.length?[Math.min(...available.map(m=>m.daily.temperature_2m_min[i])),Math.max(...available.map(m=>m.daily.temperature_2m_min[i]))]:null,temperatureMaxRange:available.length?[Math.min(...available.map(m=>m.daily.temperature_2m_max[i])),Math.max(...available.map(m=>m.daily.temperature_2m_max[i]))]:null,rainRange:available.length?[Math.min(...available.map(m=>m.daily.precipitation_sum[i])),Math.max(...available.map(m=>m.daily.precipitation_sum[i]))]:null}));
 return {...base,engine:{...base.engine,enrichment:'complete',models,availableModels:available.length,comparison,dust}};
}
export async function engineResponse(request,ctx,fetcher=fetch,now=Date.now()){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});if(request.method==='HEAD')return new Response(null,{headers:{'cache-control':'no-store'}});
 const outbound=d=>Response.json(d,{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 const key=new Request(new URL('/__cache/weather-repair-v2/'+core.dayKey(now)+'/'+Math.floor(now/TTL),request.url));let cache;
 try{if(globalThis.caches){cache=await caches.open('hada-weather-repair-v2');const hit=await cache.match(key);if(hit){const d=await hit.clone().json();if(core.isFresh(d,now)&&now-d.engine.fetchedAt<TTL)return outbound(d);}}}catch{cache=null;}
 const response=d=>Response.json(d,{headers:{'cache-control':'public,max-age=0,s-maxage=900','x-content-type-options':'nosniff'}});
 try{const d=await readEngine(now,fetcher);const initialWrite=cache?cache.put(key,response(d)).catch(()=>{}):Promise.resolve();
 if(ctx?.waitUntil)ctx.waitUntil(Promise.all([initialWrite,enrichEngine(d,fetcher)]).then(async ([,complete])=>{if(!cache)return;const previous=await cache.match(key),existing=previous?await previous.json():null;if(!existing||core.acceptNewer(existing,complete))await cache.put(key,response(complete));}).catch(()=>{}));
 return outbound(d);}catch{return Response.json({error:'weather_unavailable'},{status:503,headers:{'cache-control':'no-store'}});}
}
