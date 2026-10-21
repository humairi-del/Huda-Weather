// Hourly model estimates, not satellite observations or cyclone classification.
export const HOUR=3600000;
export const SEA_POINTS=[
 {lat:12.7,lon:46.5,target:0},{lat:13.1,lon:47.5,target:1},
 {lat:13.4,lon:48.5,target:2},{lat:13.7,lon:49.5,target:3},
 {lat:12.2,lon:47.5,target:1},{lat:12.7,lon:48.5,target:2},
 {lat:13,lon:49.5,target:3},{lat:13.3,lon:50.5,target:3}
];
export const COAST_POINTS=[{lat:13.4,lon:46.6},{lat:13.9,lon:47.5},{lat:14.3,lon:48.5},{lat:14.6,lon:49.2}];
export const REGIONAL_POINTS=[
 {lat:14.230586,lon:47.199415},{lat:14.3545083,lon:47.0802023},
 {lat:14.1,lon:48},{lat:14.2,lon:48.5},
 ...[14.6,15.2,15.8].flatMap(lat=>[46.4,47.2,48].map(lon=>({lat,lon})))
];
export const POINTS=[...SEA_POINTS,...COAST_POINTS,...REGIONAL_POINTS];
export const ACTIVE='الحالة: نشاط ركامي - تدفق كتل سحابية وفرص أمطار متفرقة من جهة بحر العرب نحو السواحل والمناطق الداخلية';
export const REGIONAL_ACTIVE='الحالة: نشاط سحابي - غطاء سحابي مرتفع أو فرص أمطار متفرقة في نطاق بحر العرب وسواحل شبوة والمناطق الداخلية';
export const QUIET='الحالة: لا تبرز حاليًا مؤشرات سحب كثيفة أو فرص أمطار مؤثرة في النطاق المتابع';
const FIELDS=['precipitation_probability','precipitation','cloud_cover','cloud_cover_low','cloud_cover_mid','wind_speed_850hPa','wind_direction_850hPa'];
export function sourceUrl(now=Date.now()){
 const start=new Date(Math.floor(now/HOUR)*HOUR).toISOString().slice(0,13)+':00';
 const end=new Date(Math.floor(now/HOUR)*HOUR+3*HOUR).toISOString().slice(0,13)+':00';
 const url=new URL('https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:POINTS.map(p=>p.lat).join(','),longitude:POINTS.map(p=>p.lon).join(','),hourly:FIELDS.join(','),timezone:'GMT',start_hour:start,end_hour:end,wind_speed_unit:'kmh',precipitation_unit:'mm',cell_selection:'nearest'});
 return url.href;
}
function bearing(a,b){const rad=Math.PI/180,p=a.lat*rad,q=b.lat*rad,d=(b.lon-a.lon)*rad;return (Math.atan2(Math.sin(d)*Math.cos(q),Math.cos(p)*Math.sin(q)-Math.sin(p)*Math.cos(q)*Math.cos(d))/rad+360)%360;}
export function towardCoast(point,direction,speed){if(speed<5)return false;const flow=(direction+180)%360,target=bearing(point,COAST_POINTS[point.target]);return Math.abs(((flow-target+540)%360)-180)<=60;}
export function analyzeSea(payload,now=Date.now()){
 if(!Array.isArray(payload)||payload.length!==POINTS.length)throw Error('incomplete_area');
 const start=Math.floor(now/HOUR)*HOUR;
 const rows=payload.map((row,p)=>{
  const h=row?.hourly,u=row?.hourly_units;
  if(row?.error||row.utc_offset_seconds!==0||!Number.isFinite(row.latitude)||!Number.isFinite(row.longitude)||Math.abs(row.latitude-POINTS[p].lat)>.4||Math.abs(row.longitude-POINTS[p].lon)>.4||!Array.isArray(h?.time)||u?.precipitation_probability!=='%'||u?.precipitation!=='mm'||u?.cloud_cover!=='%'||u?.cloud_cover_low!=='%'||u?.cloud_cover_mid!=='%'||u?.wind_speed_850hPa!=='km/h'||u?.wind_direction_850hPa!=='°')throw Error('invalid_area');
  return Array.from({length:4},(_,hour)=>{
   const timestamp=new Date(start+hour*HOUR).toISOString().slice(0,16),i=h.time.indexOf(timestamp);
   if(i<0)throw Error('outdated_hours');
   const values=Object.fromEntries(FIELDS.map(k=>[k,h[k]?.[i]]));
   if(FIELDS.some(k=>typeof values[k]!=='number'||!Number.isFinite(values[k])||values[k]<0)||['precipitation_probability','cloud_cover','cloud_cover_low','cloud_cover_mid'].some(k=>values[k]>100)||values.wind_direction_850hPa>360||values.wind_speed_850hPa>500||values.precipitation>500)throw Error('incomplete_hours');
   return values;
  });
 });
 // The wind direction is where air comes FROM. Convert it to a flow bearing
 // and compare with the bearing to the coast. High cirrus alone is insufficient.
 const flowing=rows.slice(0,SEA_POINTS.length).some((hours,p)=>hours.some(v=>
  v.cloud_cover>=60&&Math.max(v.cloud_cover_low,v.cloud_cover_mid)>=35&&
  towardCoast(SEA_POINTS[p],v.wind_direction_850hPa,v.wind_speed_850hPa)));
 const rainy=rows.slice(0,SEA_POINTS.length).some((hours,p)=>hours.some((v,i)=>
  v.precipitation>=.2&&v.cloud_cover>=40&&towardCoast(SEA_POINTS[p],v.wind_direction_850hPa,v.wind_speed_850hPa)&&
  rows[SEA_POINTS.length+SEA_POINTS[p].target].slice(i).some(c=>c.cloud_cover>=40)));
 // Regional conditions activate the card independently of local dryness or
 // wind alignment. Cloud cover alone is not proof of convection or movement.
 const regional=rows.some(hours=>hours.some(v=>v.cloud_cover>=60||v.precipitation_probability>=20||v.precipitation>=.1));
 const active=regional||flowing||rainy;
 return {schema:'hada-sea-activity-v2',state:active?'active':'quiet',summary:flowing||rainy?ACTIVE:active?REGIONAL_ACTIVE:QUIET,source:'Open-Meteo',basis:'hourly-model-estimate',checkedAt:now,validFrom:start,validUntil:start+HOUR,horizonHours:4};
}
export function validSea(data,now=Date.now()){
 return data?.schema==='hada-sea-activity-v2'&&['active','quiet'].includes(data.state)&&(data.state==='active'?[ACTIVE,REGIONAL_ACTIVE].includes(data.summary):data.summary===QUIET)&&data.source==='Open-Meteo'&&data.basis==='hourly-model-estimate'&&Number.isFinite(data.checkedAt)&&data.checkedAt<=now+300000&&now-data.checkedAt<HOUR&&data.validFrom===Math.floor(now/HOUR)*HOUR&&data.validUntil===data.validFrom+HOUR;
}
async function readJson(response){
 if(!response.ok||!response.body)throw Error('weather_http_'+response.status);
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>524288)throw Error('weather_too_large');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function readSeaActivity(now=Date.now(),fetcher=fetch){
 const payload=await readJson(await fetcher(sourceUrl(now),{signal:AbortSignal.timeout(20000),redirect:'manual',headers:{Accept:'application/json'}}));
 return analyzeSea(payload,now);
}
export async function seaActivityResponse(request,ctx,fetcher=fetch,now=Date.now()){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 if(request.method==='HEAD')return new Response(null,{headers:{'cache-control':'no-store'}});
 const key=new Request(new URL('/__cache/sea-activity-v2/'+Math.floor(now/HOUR),request.url));let cache;
 try{if(globalThis.caches){cache=await caches.open('hada-sea-activity-v2');const cached=await cache.match(key);if(cached&&validSea(await cached.clone().json(),now))return cached;}}catch{cache=null;}
 try{
  const data=await readSeaActivity(now,fetcher);
  if(!validSea(data,Date.now()))throw Error('hour_changed');
  const response=Response.json(data,{headers:{'cache-control':'public, max-age='+Math.max(1,Math.floor((data.validUntil-now)/1000)),'x-content-type-options':'nosniff'}});
  if(cache)ctx.waitUntil(cache.put(key,response.clone()).catch(()=>{}));return response;
 }catch(error){const reason=error instanceof Error?error.message:'unknown';console.warn(JSON.stringify({event:'sea_activity_unavailable',reason}));return Response.json({schema:'hada-sea-activity-v2',state:'unavailable',checkedAt:now},{status:503,headers:{'cache-control':'no-store','x-hada-source-status':/^[a-z0-9_]+$/.test(reason)?reason:'weather_unavailable'}});}
}
