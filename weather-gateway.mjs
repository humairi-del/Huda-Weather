// Development evaluation gateway. Fixed locations/sources; never an open proxy.
const COORDS={latitude:'14.230586',longitude:'47.199415',timezone:'Asia/Aden'};
const WEATHER_CURRENT='temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day';
const WEATHER_HOURLY='temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape,visibility,is_day';
const WEATHER_DAILY='weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max';
export function weatherURL(kind){
 const defs={
  current:['api', 'forecast',{current:WEATHER_CURRENT,hourly:WEATHER_HOURLY,daily:WEATHER_DAILY,forecast_days:7}],
  clouds:['api','forecast',{hourly:'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high',forecast_days:1}],
  dust:['air-quality-api','air-quality',{current:'dust',hourly:'dust',forecast_days:3}],
  dustForecast:['air-quality-api','air-quality',{hourly:'dust',forecast_days:2,domains:'cams_global'}],
  dustWind:['api','forecast',{hourly:'wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility',forecast_days:2,wind_speed_unit:'kmh'}],
  models:['api','forecast',{daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',models:'ecmwf_ifs025,gfs_seamless,icon_seamless,gem_seamless',forecast_days:7}],
  ensemble:['ensemble-api','ensemble',{hourly:'precipitation',daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',models:'ecmwf_aifs025',forecast_days:7}]
 };
 const d=defs[kind];if(!d)throw Error('invalid_source');
 return `https://${d[0]}.open-meteo.com/v1/${d[1]}?`+new URLSearchParams({...COORDS,...d[2]});
}
export async function boundedBytes(response,limit){
 if(!response.body)throw Error('empty_source');const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('source_size');chunks.push(value);}}finally{await reader.cancel();}
 const result=new Uint8Array(size);let at=0;for(const c of chunks){result.set(c,at);at+=c.length;}return result;
}
export function validWeather(data,kind){
 if(!data||data.error||data.utc_offset_seconds!==10800)throw Error('invalid_weather');
 if(kind==='current'){
  if(!Number.isFinite(data.current?.temperature_2m)||!Array.isArray(data.hourly?.time)||data.hourly.time.length<24||!Array.isArray(data.daily?.time)||data.daily.time.length!==7)throw Error('invalid_weather');
 }else if(!Array.isArray((kind==='models'||kind==='ensemble'?data.daily:data.hourly)?.time))throw Error('invalid_weather');
 return data;
}
export async function weatherGateway(request,{io=fetch,cache=globalThis.caches?.default,now=Date.now}={}){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const u=new URL(request.url),kind=u.searchParams.get('kind')||'current';let upstream;
 try{upstream=weatherURL(kind);}catch{return Response.json({error:'invalid_source'},{status:400});}
 if([...u.searchParams.keys()].some(k=>k!=='kind'))return Response.json({error:'invalid_query'},{status:400});
 const key=new Request(u.origin+'/__weather-cache-v1/'+kind);let saved=null;
 try{const r=await cache?.match(key);if(r)saved=await r.json();}catch{}
 const reply=(entry,stale)=>Response.json({...entry.data,_hada:{source:'Open-Meteo',fetchedAt:entry.at,stale,evaluationOnly:true}},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(saved&&now()-Date.parse(saved.at)<15*60000)return reply(saved,false);
 for(let attempt=0;attempt<2;attempt++)try{
  const r=await io(upstream,{signal:AbortSignal.timeout(12000),redirect:'manual',headers:{Accept:'application/json'}});
  if(!r.ok){await r.body?.cancel();throw Error('weather_http_'+r.status);}
  const data=validWeather(JSON.parse(new TextDecoder().decode(await boundedBytes(r,1200000))),kind),entry={at:new Date(now()).toISOString(),data};
  try{await cache?.put(key,Response.json(entry,{headers:{'Cache-Control':'public,max-age=10800'}}));}catch{}
  return reply(entry,false);
 }catch{}
 if(saved&&now()-Date.parse(saved.at)<=3*3600000)return reply(saved,true);
 return Response.json({error:'weather_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
}
