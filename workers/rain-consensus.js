// Read-only, shared three-model product. Missing values never become zero.
const DAY=86400000,FRESH=30*60000,MAX_AGE=90*60000;
export const rainPoints=[];for(let lat=11;lat<=21;lat++)for(let lon=40.5;lon<=55.5;lon++)rainPoints.push({lat,lon});
rainPoints.push({lat:14.230586,lon:47.199415,name:'هدى'},{lat:14.3545083,lon:47.0802023,name:'حبان'});
const MODELS={gfs:'gfs_global',ecmwf:'ecmwf_ifs025',icon:'icon_global'};
let saved=null,pending=null;
const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export function rainPeriod(now=Date.now()){const start=iso(new Date(now)),base=Date.parse(start+'T00:00:00+03:00');return {start,end:iso(new Date(base+7*DAY)),dates:Array.from({length:7},(_,i)=>iso(new Date(base+i*DAY)))};}
export function rainSourceUrl(key,p){if(!MODELS[key])throw Error('invalid_model');const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:rainPoints.map(p=>p.lat).join(','),longitude:rainPoints.map(p=>p.lon).join(','),daily:'precipitation_sum',models:MODELS[key],timezone:'Asia/Aden',precipitation_unit:'mm',start_date:p.start,end_date:p.dates[6],cell_selection:'nearest'});return u.href;}
export function normalizeRain(payload,p){
 if(!Array.isArray(payload)||payload.length!==rainPoints.length)throw Error('incomplete_locations');
 return payload.map((row,i)=>{const d=row.daily;if(row.error||row.daily_units?.precipitation_sum!=='mm'||row.timezone!=='Asia/Aden'||!Array.isArray(d?.time)||d.time.length!==7||d.time.some((v,n)=>v!==p.dates[n])||!Array.isArray(d.precipitation_sum)||d.precipitation_sum.length!==7||d.precipitation_sum.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0))throw Error('incomplete_forecast');return {...rainPoints[i],daily:d.precipitation_sum};});
}
// Some ECMWF daily aggregates contain negative totals although the hourly
// series is valid. Recompute only those days from the SAME model and location;
// missing/negative hourly values still invalidate the product, never zero-fill.
export function repairDailyRain(row,hourlyRow,p){
 const h=hourlyRow?.hourly;
 if(hourlyRow?.timezone!=='Asia/Aden'||hourlyRow.hourly_units?.precipitation!=='mm'||!Array.isArray(h?.time)||!Array.isArray(h.precipitation)||h.time.length!==h.precipitation.length||![row.latitude,row.longitude,hourlyRow.latitude,hourlyRow.longitude].every(Number.isFinite)||Math.abs(hourlyRow.latitude-row.latitude)>.01||Math.abs(hourlyRow.longitude-row.longitude)>.01)throw Error('invalid_hourly_repair');
 const values=row.daily.precipitation_sum.map((value,day)=>{
  if(typeof value!=='number'||!Number.isFinite(value))throw Error('missing_daily_rain');
  if(value>=0)return value;
  const samples=p.dates[day]&&h.time.map((time,i)=>({time,value:h.precipitation[i]})).filter(x=>x.time.startsWith(p.dates[day]+'T'));
  if(!samples||samples.length!==24||samples.some((x,i)=>x.time!==p.dates[day]+'T'+String(i).padStart(2,'0')+':00'||typeof x.value!=='number'||!Number.isFinite(x.value)||x.value<0))throw Error('incomplete_hourly_repair');
  return Math.round(samples.reduce((sum,x)=>sum+x.value,0)*1000)/1000;
 });
 return {...row,daily:{...row.daily,precipitation_sum:values}};
}
async function readModel(key,p,fetcher){
 const payload=await jsonRead(rainSourceUrl(key,p),fetcher);
 if(!Array.isArray(payload)||payload.length!==rainPoints.length)throw Error('incomplete_locations');
 const bad=payload.flatMap((row,i)=>row.daily?.precipitation_sum?.some(v=>typeof v==='number'&&v<0)?[i]:[]);
 if(bad.length){
  const u=new URL(rainSourceUrl(key,p));u.searchParams.delete('daily');u.searchParams.set('hourly','precipitation');
  u.searchParams.set('latitude',bad.map(i=>rainPoints[i].lat).join(','));u.searchParams.set('longitude',bad.map(i=>rainPoints[i].lon).join(','));
  const raw=await jsonRead(u.href,fetcher),rows=Array.isArray(raw)?raw:[raw];
  if(rows.length!==bad.length)throw Error('incomplete_hourly_locations');
  bad.forEach((index,i)=>{payload[index]=repairDailyRain(payload[index],rows[i],p);});
 }
 return normalizeRain(payload,p);
}
export function combineRain(rows,p,now){const keys=Object.keys(MODELS);if(keys.some(k=>!rows[k]||rows[k].length!==rainPoints.length))throw Error('missing_model');return {schema:'hada-local-consensus-v3',units:'mm',models:keys,start:p.start,fetchedAt:now,data:rainPoints.map((point,i)=>({...point,daily:Array.from({length:7},(_,day)=>keys.reduce((n,k)=>n+rows[k][i].daily[day],0)/3)}))};}
export function validRainSnapshot(d,p,now){return d?.schema==='hada-local-consensus-v3'&&d.units==='mm'&&d.start===p.start&&[...(d.models||[])].sort().join(',')==='ecmwf,gfs,icon'&&Number.isFinite(d.fetchedAt)&&now-d.fetchedAt<=MAX_AGE&&d.fetchedAt<=now+300000&&Array.isArray(d.data)&&d.data.length===rainPoints.length&&d.data.every((r,i)=>r.lat===rainPoints[i].lat&&r.lon===rainPoints[i].lon&&Array.isArray(r.daily)&&r.daily.length===7&&r.daily.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0));}
async function jsonRead(url,fetcher){const r=await fetcher(url,{signal:AbortSignal.timeout(35000),redirect:'manual'});if(!r.ok||!r.body)throw Error('upstream_response');const reader=r.body.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000)throw Error('upstream_too_large');parts.push(value)}}finally{await reader.cancel()}const b=new Uint8Array(size);let at=0;for(const part of parts){b.set(part,at);at+=part.length}return JSON.parse(new TextDecoder().decode(b));}
export async function rainConsensusResponse(request,ctx,fetcher=fetch,now=Date.now()){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const p=rainPeriod(now),key=new Request('https://hada-weather.com/__cache/rain-consensus-v1/'+p.start);let cache=null;
 try{if(globalThis.caches)cache=await caches.open('hada-rain-consensus-v1');if(!validRainSnapshot(saved,p,now)&&cache){const r=await cache.match(key);if(r){const d=await r.json();if(validRainSnapshot(d,p,now))saved=d;}}}catch{cache=null}
 const reply=(d,failed=false)=>Response.json({...d,refreshFailed:failed},{headers:{'cache-control':failed?'no-store':'public, max-age=300','x-content-type-options':'nosniff'}});
 if(validRainSnapshot(saved,p,now)&&now-saved.fetchedAt<FRESH)return reply(saved);
 if(!pending){pending=(async()=>{const entries=await Promise.all(Object.keys(MODELS).map(async k=>[k,await readModel(k,p,fetcher)]));const d=combineRain(Object.fromEntries(entries),p,Date.now());if(rainPeriod().start!==p.start)throw Error('period_changed');saved=d;if(cache)ctx.waitUntil(cache.put(key,Response.json(d,{headers:{'cache-control':'public, max-age=5400'}})).catch(()=>{}));return d;})().finally(()=>{pending=null});}
 try{return reply(await pending)}catch{if(validRainSnapshot(saved,p,Date.now()))return reply(saved,true);return Response.json({schema:'hada-local-consensus-v3',error:'forecast_unavailable'},{status:503,headers:{'cache-control':'no-store'}})}
}
