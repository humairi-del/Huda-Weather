import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSurfaceSnapshot} from './open-data-surface.mjs';
const snapshot=()=>({schema:'hada-open-data-surface-v1',startedAt:'2026-10-17T11:00:00Z',finishedAt:'2026-10-17T11:02:00Z',errors:{},models:{GFS025:{domain:'ncep_gfs025',run:'2026-10-17T00:00Z',startAt:'2026-10-17T11:00Z',endAt:'2026-10-19T11:00Z',missingFields:['weather_code'],fieldErrors:{},local:['هدى','حبان'].map(name=>({name,lat:14,lon:47,series:{visibility:{times:['2026-10-17T10:00Z','2026-10-17T11:00Z','2026-10-17T12:00Z'],values:[1000,0,2000],unit:'m',grid:{lat:14,lon:47},complete48Hours:false}},modelSamplesAtCollection:{visibility:{value:999999}}}))}}});
test('surface samples are rebuilt from native times, preserving zero and source identity',()=>{
 const d=prepareSurfaceSnapshot(snapshot());assert.equal(d.models[0].points[0].samples.visibility.value,0);assert.equal(d.models[0].domain,'ncep_gfs025');assert.equal(d.observation,false);assert.equal(d.readyForSite,false);assert.equal(d.models[0].points[0].series.visibility.complete48Hours,false);
});
test('future, stale and missing samples cannot become a current value',()=>{
 for(const [times,values] of [[['2026-10-17T12:00Z'],[2000]],[['2026-10-17T07:00Z'],[2000]],[['2026-10-17T10:00Z','2026-10-17T11:00Z'],[2000,null]]]){
  const s=snapshot();s.models.GFS025.local[0].series.visibility={times,values,unit:'m'};
  assert.equal(prepareSurfaceSnapshot(s).models[0].points[0].samples.visibility,null);
 }
});
test('foreign runs, malformed axes and nonfinite values are rejected',()=>{
 for(const edit of [s=>s.models.GFS025.run='2026-10-18T00:00Z',s=>s.models.GFS025.local[0].series.visibility.values=[0],s=>s.models.GFS025.local[0].series.visibility.values[0]=NaN,s=>s.models.GFS025.local[0].series.visibility.times.reverse()]){
  const s=snapshot();edit(s);assert.throws(()=>prepareSurfaceSnapshot(s),/surface_/);
 }
});
test('surface collection does not accept missing places or invalid generation time',()=>{
 const s=snapshot();s.models.GFS025.local.pop();assert.throws(()=>prepareSurfaceSnapshot(s),/points/);
 const t=snapshot();t.finishedAt='invalid';assert.throws(()=>prepareSurfaceSnapshot(t),/shape/);
 assert.equal(prepareSurfaceSnapshot(null),null);
});
