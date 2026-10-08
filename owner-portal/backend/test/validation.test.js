import test from 'node:test';
import assert from 'node:assert/strict';
import {corsReject,parsePayload} from '../src/index.js';

const request=(url,headers={})=>new Request(url,{headers});
const payload=(body,section='stars')=>parsePayload(new Request('https://owner-dev.hada-weather.com/api/entries/stars:hassan:spring:0',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),section);

test('accept same-origin browser requests',()=>{
 assert.equal(corsReject(request('https://owner-dev.hada-weather.com/api/me',{origin:'https://owner-dev.hada-weather.com'})),null);
});
test('reject foreign origins',()=>{
 assert.equal(corsReject(request('https://owner-dev.hada-weather.com/api/me',{origin:'https://attacker.example'})).status,403);
});
test('accept valid star payload',async()=>{
 const saved=JSON.parse(await payload({name:'الجبهة',date:'2026-01-16',detail:''}));
 assert.equal(saved.date,'2026-01-16');
});
test('reject invalid date format',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'16/01/2026',detail:''}));
});
test('reject missing details',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'2026-01-16'}));
});
test('reject oversized details',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'2026-01-16',detail:'x'.repeat(5001)}));
});
test('reject malformed JSON',async()=>{
 await assert.rejects(parsePayload(new Request('https://owner-dev.hada-weather.com/api/me',{method:'PUT',body:'{broken'}),'stars'));
});

test('reject nonexistent calendar dates',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'2026-02-30',detail:''}));
});
test('reject blank star names',async()=>{
 await assert.rejects(payload({name:'   ',date:'2026-01-16',detail:''}));
});

for(const section of ['site','prayers','alerts','modules']){
 test('accept '+section+' draft',async()=>{
  const saved=JSON.parse(await payload({title:'عنوان تجريبي',body:'ملاحظات'},section));
  assert.equal(saved.title,'عنوان تجريبي');
 });
 test('reject blank '+section+' draft title',async()=>{
  await assert.rejects(payload({title:'  ',body:'ملاحظات'},section));
 });
 test('reject unexpected '+section+' draft fields',async()=>{
  await assert.rejects(payload({title:'عنوان',body:'ملاحظات',published:true},section));
 });
}

test('staging HTML references every deployed owner asset',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 for(const name of ['owner-api-client.js','owner-settings.js','owner-audit.js','owner-overview.js'])
  assert.ok(html.includes('src="./'+name+'"'),'missing '+name+' script');
 for(const id of ['settingsSection','settingsTitle','settingsBody','auditRefresh','auditList','overviewRefresh','overviewList'])
  assert.ok(html.includes('id="'+id+'"'),'missing '+id+' control');
});

test('deployment remains isolated from the public worker and production database',async()=>{
 const {readFile}=await import('node:fs/promises');
 const config=await readFile(new URL('../wrangler.dev.toml',import.meta.url),'utf8');
 assert.match(config,/name = "hada-owner-portal-staging"/);
 assert.match(config,/workers_dev = false/);
 assert.match(config,/database_name = "hada_owner_portal_dev"/);
 assert.match(config,/STAGING_HOST = "owner-dev\.hada-weather\.com"/);
 assert.doesNotMatch(config,/name = "rasid-hada"/);
});

test('drafts reject oversized body',async()=>{
 await assert.rejects(payload({title:'معلومات الموقع',body:'x'.repeat(5001)},'site'));
});

test('reject star payload with unexpected publishing flag',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'2026-01-16',detail:'',published:true}));
});
test('reject star payload with unexpected owner metadata',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'2026-01-16',detail:'',role:'owner'}));
});
test('reject non-object star payload',async()=>{
 await assert.rejects(payload(['الجبهة']));
});
