// ECMWF can return negative de-accumulated precipitation in daily AND hourly
// totals. Recover only affected days from the same model, grid cell and hours.
// A negative hourly total requires valid liquid rain + snowfall water equivalent;
// absent or invalid components still reject the forecast, never zero-fill.
export function hourlyPrecipitation(row,index){
 const h=row.hourly,value=h?.precipitation?.[index];
 if(typeof value!=='number'||!Number.isFinite(value))return null;
 if(value>=0)return value;
 const rain=h.rain?.[index],snow=h.snowfall_water_equivalent?.[index];
 if(row.hourly_units?.rain!=='mm'||row.hourly_units?.snowfall_water_equivalent!=='mm'||!Array.isArray(h.rain)||!Array.isArray(h.snowfall_water_equivalent)||h.rain.length!==h.time.length||h.snowfall_water_equivalent.length!==h.time.length||![rain,snow].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))return null;
 return rain+snow;
}
export function repairDailyRain(row,hourlyRow,p){
 const h=hourlyRow?.hourly;
 if(hourlyRow?.timezone!=='Asia/Aden'||hourlyRow.hourly_units?.precipitation!=='mm'||!Array.isArray(h?.time)||!Array.isArray(h.precipitation)||h.time.length!==h.precipitation.length||![row.latitude,row.longitude,hourlyRow.latitude,hourlyRow.longitude].every(Number.isFinite)||Math.abs(hourlyRow.latitude-row.latitude)>.01||Math.abs(hourlyRow.longitude-row.longitude)>.01)throw Error('invalid_hourly_repair');
 const values=row.daily.precipitation_sum.map((value,day)=>{
  if(typeof value!=='number'||!Number.isFinite(value))throw Error('missing_daily_rain');
  if(value>=0)return value;
  const samples=p.dates[day]&&h.time.map((time,i)=>({time,value:hourlyPrecipitation(hourlyRow,i)})).filter(x=>x.time.startsWith(p.dates[day]+'T'));
  if(!samples||samples.length!==24||samples.some((x,i)=>x.time!==p.dates[day]+'T'+String(i).padStart(2,'0')+':00'||typeof x.value!=='number'||!Number.isFinite(x.value)||x.value<0))throw Error('incomplete_hourly_repair');
  return Math.round(samples.reduce((sum,x)=>sum+x.value,0)*1000)/1000;
 });
 return {...row,daily:{...row.daily,precipitation_sum:values}};
}
// Preserve validated precipitation recovery for the existing notification reader.
export async function readDailyRain(sourceUrl,p,fetcher=fetch,timeout=20000){
 const payload=await jsonRead(sourceUrl,fetcher,timeout),rows=Array.isArray(payload)?payload:[payload];
 const bad=rows.flatMap((row,i)=>row?.daily?.precipitation_sum?.some(v=>typeof v==='number'&&v<0)?[i]:[]);
 if(bad.length){
  const u=new URL(sourceUrl),lat=u.searchParams.get('latitude')?.split(','),lon=u.searchParams.get('longitude')?.split(',');
  if(!lat||!lon||lat.length!==rows.length||lon.length!==rows.length)throw Error('incomplete_locations');
  u.searchParams.delete('daily');u.searchParams.set('hourly','precipitation,rain,snowfall_water_equivalent');
  u.searchParams.set('latitude',bad.map(i=>lat[i]).join(','));u.searchParams.set('longitude',bad.map(i=>lon[i]).join(','));
  const raw=await jsonRead(u.href,fetcher,timeout),hourlyRows=Array.isArray(raw)?raw:[raw];
  if(hourlyRows.length!==bad.length)throw Error('incomplete_hourly_locations');
  bad.forEach((index,i)=>{rows[index]=repairDailyRain(rows[index],hourlyRows[i],p);});
 }
 return Array.isArray(payload)?rows:rows[0];
}
async function jsonRead(url,fetcher,timeout=35000){const r=await fetcher(url,{signal:AbortSignal.timeout(timeout),redirect:'manual'});if(!r.ok||!r.body)throw Error('upstream_response');const reader=r.body.getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000)throw Error('upstream_too_large');parts.push(value)}}finally{await reader.cancel()}const b=new Uint8Array(size);let at=0;for(const part of parts){b.set(part,at);at+=part.length}return JSON.parse(new TextDecoder().decode(b));}
