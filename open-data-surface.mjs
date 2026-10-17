// Frozen native-sample review, separate from current weather.
export function prepareSurfaceSnapshot(surface){
 if(!surface)return null;
 if(surface.schema!=='hada-open-data-surface-v1'||!Number.isFinite(Date.parse(surface.startedAt))||!Number.isFinite(Date.parse(surface.finishedAt))||Date.parse(surface.finishedAt)<Date.parse(surface.startedAt))throw Error('surface_shape');
 const models=Object.entries(surface.models||{}).sort(([a],[b])=>['ECMWF','GFS','GFS025','ICON','CMC'].indexOf(a)-['ECMWF','GFS','GFS025','ICON','CMC'].indexOf(b)).map(([key,m])=>{
  if(!Number.isFinite(Date.parse(m.run))||Date.parse(m.run)>Date.parse(surface.startedAt)||Date.parse(m.endAt)-Date.parse(m.startAt)!==48*3600000)throw Error('surface_run');
  if(m.local?.length!==2||!['هدى','حبان'].every(name=>m.local.some(p=>p.name===name)))throw Error('surface_points');
  const points=m.local.map(p=>{
   const series=Object.fromEntries(Object.entries(p.series).map(([field,row])=>{
    const ts=row.times?.map(Date.parse);
    if(!ts?.length||ts.length!==row.values?.length||ts.some((t,i)=>!Number.isFinite(t)||(i&&t<=ts[i-1]))||row.values.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v))))throw Error('surface_series');
    return [field,{times:row.times,values:row.values,unit:row.unit,grid:row.grid,complete48Hours:row.complete48Hours===true,derivedFrom:row.derivedFrom||null}];
   }));
   const samples=Object.fromEntries(Object.entries(series).map(([field,row])=>{
    const index=row.times.findLastIndex(t=>Date.parse(t)<=Date.parse(surface.startedAt));
    const age=index<0?Infinity:Date.parse(surface.startedAt)-Date.parse(row.times[index]);
    const sample=index<0||age>3*3600000||row.values[index]===null?null:{validAt:row.times[index],value:row.values[index],unit:row.unit};
    return [field,sample];
   }));
   return {name:p.name,lat:p.lat,lon:p.lon,series,samples};
  });
  return {key,domain:m.domain,run:m.run,startAt:m.startAt,endAt:m.endAt,missingFields:m.missingFields,fieldErrors:m.fieldErrors,points};
 });
 return {generatedAt:surface.finishedAt,sampledAt:surface.startedAt,models,errors:surface.errors,readyForSite:false,staticSnapshot:true,observation:false};
}
