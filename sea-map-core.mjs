// A reproducible regional comparison, not a calibrated or official cyclone forecast.
export const MODELS=['ecmwf_ifs025','gfs_global','icon_global','gem_global'];
export const GRID={west:42,east:60,south:9,north:21,step:0.75,nx:25,ny:17};
export const PLACES=[{name:'عتق — مؤشر لشبوة',lat:14.537,lon:46.832},{name:'حبان',lat:14.3541,lon:47.0765},{name:'هدى',lat:14.230586,lon:47.199415}];
export function points(){const a=[];for(let y=0;y<GRID.ny;y++)for(let x=0;x<GRID.nx;x++)a.push({lat:GRID.north-y*GRID.step,lon:GRID.west+x*GRID.step});return [...a,...PLACES];}
export function period(now=new Date()){
 // Three complete future calendar days, always on Yemen's UTC+3 day boundary.
 const d=new Date(now.getTime()+3*3600000);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+1);
 const start=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+2);const end=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+1);
 return {start,end,until:d.toISOString().slice(0,10),startAt:start+'T00:00:00+03:00',endAt:d.toISOString().slice(0,10)+'T00:00:00+03:00'};
}
export function requestURL(batch,p){return 'https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:batch.map(v=>v.lat).join(','),longitude:batch.map(v=>v.lon).join(','),models:MODELS.join(','),daily:'precipitation_sum',timezone:'Asia/Aden',cell_selection:'nearest',elevation:batch.map(()=>'nan').join(','),start_date:p.start,end_date:p.end});}
export function median(a){const s=[...a].sort((a,b)=>a-b),n=s.length;if(!n)return null;return n%2?s[n>>1]:(s[n/2-1]+s[n/2])/2;}
export function aggregate(row,p){
 const dates=[p.start,new Date(Date.parse(p.start+'T00:00:00Z')+86400000).toISOString().slice(0,10),p.end];
 if(JSON.stringify(row?.daily?.time)!==JSON.stringify(dates)||row.utc_offset_seconds!==10800)throw Error('period_mismatch');
 const totals={},daily={};for(const model of MODELS){const key='precipitation_sum_'+model,a=row.daily[key];if(row.daily_units?.[key]!=='mm')throw Error('unit_mismatch');if(Array.isArray(a)&&a.length===3&&a.every(x=>Number.isFinite(x)&&x>=0&&x<3000)){daily[model]=a;totals[model]=Math.round(a.reduce((s,x)=>s+x,0)*100)/100;}}
 const v=Object.values(totals);if(v.length<3)throw Error('insufficient_models');
 const m=median(v),spread=Math.max(...v)-Math.min(...v);
 return {value:Math.round(m*100)/100,min:Math.min(...v),max:Math.max(...v),count:v.length,disagreement:spread>=20&&spread>m,totals,daily};
}
export function validateSnapshot(s){
 if(s?.schema!==1||s.cells?.length!==GRID.nx*GRID.ny||s.local?.length!==3||!Number.isFinite(Date.parse(s.fetchedAt))||!Number.isFinite(Date.parse(s.period?.endAt)))throw Error('invalid_snapshot');
 for(const c of [...s.cells,...s.local]){if(!Number.isFinite(c.value)||c.value<0||c.count<3||!c.totals||Object.values(c.totals).some(v=>!Number.isFinite(v)||v<0))throw Error('invalid_cell');}
 return s;
}
export async function collect(fetcher=fetch,now=new Date(),pause=ms=>new Promise(r=>setTimeout(r,ms))){
 const p=period(now),all=points(),cells=[],deadline=Date.now()+12*60000;
 // 24 locations x 4 models = 96 equivalent requests per batch; <= 384/min.
 for(let i=0;i<all.length;i+=24){
  if(i)await pause(16000);
  if(Date.now()>deadline)throw Error('collection_deadline');
  const batch=all.slice(i,i+24);let rows;
  for(let attempt=0;attempt<2;attempt++){
   const r=await fetcher(requestURL(batch,p),{signal:AbortSignal.timeout(25000)});
   if(!r.ok){await r.body?.cancel();if(attempt===0){await pause(30000);continue;}throw Error('forecast_http_'+r.status);}
   const text=await r.text();if(text.length>400000)throw Error('forecast_size');rows=JSON.parse(text);break;
  }
  if(!Array.isArray(rows)||rows.length!==batch.length)throw Error('batch_length');
  cells.push(...rows.map(row=>aggregate(row,p)));
 }
 return validateSnapshot({schema:1,fetchedAt:new Date().toISOString(),startedAt:now.toISOString(),period:p,grid:GRID,models:MODELS,cells:cells.slice(0,GRID.nx*GRID.ny),local:cells.slice(GRID.nx*GRID.ny).map((v,i)=>({...v,...PLACES[i]})),method:'median-model-total',track:null});
}
