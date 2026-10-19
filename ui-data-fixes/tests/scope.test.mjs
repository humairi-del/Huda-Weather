import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync(new URL('../baseline-manifest.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
test('unrequested scripts stay identical, including stars, notifications and map controls',()=>{
 for(const [file,expected]of Object.entries(baseline.files)){
  let data=fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
  if(['live-weather.js','official-cyclone.js','sea-bulletin.js'].includes(file))continue;
  if(file==='index.html')data=data.replace('<script src="./rain-period.js"></script>','').replace('<link rel="stylesheet" href="./rain-period.css">','').replace('<link rel="stylesheet" href="./sea-summary.css">','');
  if(file==='hazard-alerts.js')data=data.replace('لا توجد تنبيهات جوية نشطة حاليًا','لا توجد تنبيهات مطر أو حالات مدارية حاليًا');
  assert.equal(hash(data),expected,file+' has an unrequested change');
 }
});
test('sea presentation preserves source validation, freshness, fetching, calculation and event logic byte for byte',()=>{
 const expected=JSON.parse(fs.readFileSync(new URL('../sea-presentation-baseline.json',import.meta.url),'utf8'));
 for(const [file,checks]of Object.entries(expected)){
  const source=fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
  const render=file==='official-cyclone.js'?'function renderCard(){':'function render(){';
  const suffix=file==='official-cyclone.js'?'window.HadaOfficialCyclone=':'function isOpen(){';
  assert.equal(hash(source.slice(0,source.indexOf(render))),checks.prefixSha256,file+' source/calculation changed');
  assert.equal(hash(source.slice(source.indexOf(suffix))),checks.suffixSha256,file+' events/API changed');
 }
});
