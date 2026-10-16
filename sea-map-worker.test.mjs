import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{refreshMap} from './sea-map-worker.mjs';
import {renderMap,localSummary} from './sea-map-browser.mjs';
import {GRID,MODELS,period} from './sea-map-core.mjs';
const cell=()=>({value:10,count:4,min:2,max:35,disagreement:true,totals:Object.fromEntries(MODELS.map(m=>[m,10])),daily:Object.fromEntries(MODELS.map(m=>[m,[2,3,5]]))});
const s={schema:1,period:period(),fetchedAt:new Date().toISOString(),cells:Array.from({length:GRID.nx*GRID.ny},cell),local:Array.from({length:3},cell)};
test('regional map keeps only Shabwa, Habban and Huda place labels with boundaries and credits',()=>{const svg=renderMap(s);for(const name of ['شبوة','حبان','هدى'])assert.ok(svg.includes(name));for(const name of ['أمانة العاصمة','صنعاء','لحج','الحديدة','تعز','حضرموت','أبين','الجوف','البيضاء','الضالع','المحويت','صعدة','حجة','ذمار','عمران','المهرة','مأرب','ريمة','سقطرى','عتق'])assert.ok(!svg.includes('>'+name+'</text>'));assert.ok(svg.includes('الذكاء الاصطناعي'));assert.ok(!svg.includes('التهشير')); assert.ok(!svg.includes('NaN'));assert.ok(!svg.includes('<script'));});
test('local summary does not describe dry-model disagreement as certain rain',()=>{const p=cell();p.value=0;p.min=0;p.max=25;assert.match(localSummary(p).text,/غالبية التوقعات تشير إلى أجواء جافة/);p.max=0;assert.match(localSummary(p).text,/فرص الأمطار ضعيفة/);});
test('public cache endpoints cannot fetch forecasts or trigger writes',async()=>{let reads=0;const env={SEA_MAP:{get:async key=>{reads++;return key==='latest'?JSON.stringify(s):null;}}};assert.equal((await worker.fetch(new Request('https://map.invalid/data',{method:'POST'}),env)).status,405);assert.equal((await worker.fetch(new Request('https://map.invalid/refresh'),env)).status,404);assert.equal(reads,0);const r=await worker.fetch(new Request('https://map.invalid/data'),env);assert.equal(r.status,200);assert.equal((await r.json()).cells.length,425);assert.equal((await worker.fetch(new Request('https://map.invalid/data'),{SEA_MAP:{get:async()=>null}})).status,503);});

test('refresh publishes one complete result and records the actual trigger',async()=>{const values=new Map([['latest','previous']]),env={SEA_MAP:{put:async(k,v)=>values.set(k,v)}};await refreshMap(env,async()=>s,'2026-10-16T13:00:00Z','manual-verification');assert.equal(JSON.parse(values.get('latest')).cells.length,425);const a=JSON.parse(values.get('attempt'));assert.equal(a.ok,true);assert.equal(a.trigger,'manual-verification');});
test('failed refresh retains the previous edition and exposes failure status',async()=>{const values=new Map([['latest','previous']]),env={SEA_MAP:{put:async(k,v)=>values.set(k,v)}};await assert.rejects(()=>refreshMap(env,async()=>{throw Error('forecast_http_503')},'2026-10-16T13:00:00Z'));assert.equal(values.get('latest'),'previous');assert.equal(JSON.parse(values.get('attempt')).ok,false);});

test('province overview uses regional grid cells rather than the Atq point',async()=>{
 const {provinceSummary}=await import('./sea-map-browser.mjs');
 const data=structuredClone(s);data.local[0].value=999;data.cells.forEach(c=>c.value=0);
 assert.match(provinceSummary(data).text,/ضعيفة/);
 data.cells.forEach(c=>c.value=12);
 assert.match(provinceSummary(data).text,/12 إلى 12/);
});
