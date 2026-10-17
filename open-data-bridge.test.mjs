import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {prepareOpenDataBundle,openDataGateway,openDataFreshness} from './open-data-bridge.mjs';
import {buildPreview} from './build-preview.mjs';

const read=async name=>JSON.parse(await readFile(new URL('./sea-map-data/'+name,import.meta.url),'utf8'));
const [local,aifs,region]=await Promise.all(['open-data-local-20261017.json','open-data-aifs-ens-20261017.json','open-data-region-20261017.json'].map(read));
const bundle=prepareOpenDataBundle({local,aifs,region});
const clock=Math.max(...Object.values(bundle.generatedAt).map(Date.parse))+60000;
const request=(query='',method='GET')=>new Request('https://preview.invalid/api/open-data'+query,{method});

test('experimental comparison preserves all five models and missing ICON day',()=>{
 assert.equal(bundle.models.length,5);assert.equal(bundle.dates.length,7);
 assert.equal(bundle.models.find(m=>m.key==='ICON').points[0].daily[6].rainMm,null);
 assert.equal(bundle.models.find(m=>m.key==='ICON').points[0].daily[6].coveredHours,15);
 assert.equal(bundle.models.find(m=>m.key==='GFS').points[0].daily[0].probabilityPercent,null);
});
test('daily probability cannot be confused with an hourly value',()=>{
 const d=bundle.models.find(m=>m.key==='AIFS').points[0].daily[0];
 assert.equal(d.probabilityPeriod,'allocated-yemen-day');assert.equal(d.members,51);
 assert.match(bundle.probabilityDefinition,/لا تساوي أعلى احتمال ساعي/);
 assert.equal(d.probabilityPercent,0); // real zero remains a zero, missing stays null
});
test('different date windows cannot be joined',()=>{
 const wrong=structuredClone(aifs);wrong.period.startAt='2026-10-17T00:00:00+03:00';
 assert.throws(()=>prepareOpenDataBundle({local,aifs:wrong,region}),/period_mismatch/);
});
test('an earlier incomplete collection cannot silently remove model cards',()=>{
 const wrong=structuredClone(local);delete wrong.models.ICON;
 assert.throws(()=>prepareOpenDataBundle({local:wrong,aifs,region}),/models_missing/);
});
test('experiment does not manufacture current weather or alerts',async()=>{
 const r=openDataGateway(request('?kind=current'),bundle,clock);
 assert.equal(r.status,409);const d=await r.json();assert.equal(d.error,'not_a_current_weather_adapter');assert.equal(d.readyForSite,false);
 assert.ok(d.missing.some(f=>f.field.includes('CAPE')));
});
test('read time never refreshes the original snapshot time',()=>{
 const good=openDataFreshness(bundle,clock);assert.equal(good.fresh,true);
 const old=openDataFreshness(bundle,clock+6*3600000);assert.equal(old.fresh,false);
 assert.deepEqual(old.generatedAt,bundle.generatedAt);assert.notEqual(old.readAt,good.readAt);
});
test('future snapshot timestamps cannot pass freshness',()=>{
 assert.equal(openDataFreshness(bundle,Math.min(...Object.values(bundle.generatedAt).map(Date.parse))-1).fresh,false);
});
test('unsupported methods and arbitrary source parameters are rejected',()=>{
 assert.equal(openDataGateway(request('', 'POST'),bundle,clock).status,405);
 assert.equal(openDataGateway(request('?kind=models&url=https://example.invalid'),bundle,clock).status,400);
 assert.equal(openDataGateway(request('?kind=not-supported'),bundle,clock).status,400);
});
test('missing bundle is an explicit service failure',()=>{
 assert.equal(openDataGateway(request(),null,clock).status,503);
});
test('all-view exposes projected values and no raw ensemble arrays',async()=>{
 const r=openDataGateway(request('?kind=all'),bundle,clock),text=await r.text(),d=JSON.parse(text);
 assert.equal(d.map.cellCount,425);assert.equal(d.map.minimumModelCount,4);
 assert.equal(d.staticSnapshot,true);assert.equal(d.readyForSite,false);assert.equal(d.usableForPublicForecast,false);
 assert.ok(!text.includes('rawLocalMemberValues'));assert.ok(!Object.hasOwn(d,'current'));
 assert.equal(r.headers.get('cache-control'),'no-store');
});
test('deployment serves the isolated lab without outbound requests and correct map sources',async()=>{
 const code=await buildPreview();assert.ok(gzipSync(code).byteLength<3*1024*1024);
 const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('unexpected_outbound_request');};
 try{
  assert.match(await(await worker.fetch(new Request('https://preview.invalid/'))).text(),/2\.9\.2-preview/);
  const html=await worker.fetch(new Request('https://preview.invalid/open-data-lab.html'));assert.equal(html.status,200);assert.match(await html.text(),/إعادة قراءتها لا تجلب تشغيلًا جديدًا/);
  const data=await(await worker.fetch(request('?kind=all'))).json();assert.equal(data.models.length,5);
  const svg=await(await worker.fetch(new Request('https://preview.invalid/open-data-map.svg'))).text();
  assert.ok(svg.includes('AIFS ENS'));assert.ok(svg.includes('dynamical.org'));
  assert.ok(!svg.includes('ECMWF IFS • GFS • ICON • GEM'));
 }finally{globalThis.fetch=old;}
});
