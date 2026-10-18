import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync(new URL('../baseline-manifest.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
test('unrequested scripts stay identical, including stars, cyclone tracking, notifications and map controls',()=>{
 for(const [file,expected]of Object.entries(baseline.files)){
  let data=fs.readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
  if(file==='live-weather.js')continue;
  if(file==='index.html')data=data.replace('<script src="./rain-period.js"></script>','').replace('<link rel="stylesheet" href="./rain-period.css">','');
  if(file==='hazard-alerts.js')data=data.replace('لا توجد تنبيهات جوية نشطة حاليًا','لا توجد تنبيهات مطر أو حالات مدارية حاليًا');
  assert.equal(hash(data),expected,file+' has an unrequested change');
 }
});
