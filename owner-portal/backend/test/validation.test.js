import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{corsReject,parsePayload} from '../src/index.js';

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

test('reject oversized raw JSON body before parsing',async()=>{
 const raw=' '.repeat(12001);
 await assert.rejects(parsePayload(new Request('https://owner-dev.hada-weather.com/api/entries/site:draft',{method:'PUT',body:raw}),'site'));
});
test('reject empty object in draft section',async()=>{
 await assert.rejects(payload({},'alerts'));
});
test('reject array in draft section',async()=>{
 await assert.rejects(payload(['عنوان','محتوى'],'modules'));
});
test('reject draft with non-string body',async()=>{
 await assert.rejects(payload({title:'معلومات الموقع',body:42},'site'));
});
test('reject draft title longer than 120 characters',async()=>{
 await assert.rejects(payload({title:'x'.repeat(121),body:''},'site'));
});
test('reject invalid leap day',async()=>{
 await assert.rejects(payload({name:'الجبهة',date:'2025-02-29',detail:''}));
});
test('accept valid leap day',async()=>{
 const data=JSON.parse(await payload({name:'الجبهة',date:'2028-02-29',detail:''}));
 assert.equal(data.date,'2028-02-29');
});
test('reject malformed cross-origin header',()=>{
 assert.equal(corsReject(request('https://owner-dev.hada-weather.com/api/me',{origin:'not a valid origin'})).status,403);
});

const fakeEnv={DB:{},STAGING_HOST:'owner-dev.hada-weather.com'};
const apiRequest=(path,options={})=>new Request('https://owner-dev.hada-weather.com'+path,options);
test('unauthenticated owner identity is denied',async()=>{
 const response=await worker.fetch(apiRequest('/api/me'),fakeEnv);
 assert.equal(response.status,401);
});
test('unauthenticated database overview is denied',async()=>{
 const response=await worker.fetch(apiRequest('/api/overview'),fakeEnv);
 assert.equal(response.status,401);
});
test('unauthenticated audit history is denied',async()=>{
 const response=await worker.fetch(apiRequest('/api/audit'),fakeEnv);
 assert.equal(response.status,401);
});
test('unauthenticated draft write is denied',async()=>{
 const response=await worker.fetch(apiRequest('/api/entries/site:draft',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({title:'اختبار',body:''})}),fakeEnv);
 assert.equal(response.status,401);
});
test('reject requests on unexpected host',async()=>{
 const response=await worker.fetch(new Request('https://hada-weather.com/api/me'),fakeEnv);
 assert.equal(response.status,403);
});
test('reject requests over HTTP',async()=>{
 const response=await worker.fetch(new Request('http://owner-dev.hada-weather.com/api/me'),fakeEnv);
 assert.equal(response.status,403);
});
test('reject foreign origin before authentication',async()=>{
 const response=await worker.fetch(apiRequest('/api/me',{headers:{origin:'https://example.com'}}),fakeEnv);
 assert.equal(response.status,403);
});
test('reject requests when isolated database binding is absent',async()=>{
 const response=await worker.fetch(apiRequest('/api/me'),{STAGING_HOST:'owner-dev.hada-weather.com'});
 assert.equal(response.status,503);
});
test('never serve non-API paths through the API worker',async()=>{
 const response=await worker.fetch(apiRequest('/src/index.js'),fakeEnv);
 assert.equal(response.status,404);
});

test('API error responses prevent caching',async()=>{
 const response=await worker.fetch(apiRequest('/api/me'),fakeEnv);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('API error responses disable MIME sniffing',async()=>{
 const response=await worker.fetch(apiRequest('/api/me'),fakeEnv);
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
});
test('API error responses are JSON',async()=>{
 const response=await worker.fetch(apiRequest('/api/me'),fakeEnv);
 assert.match(response.headers.get('content-type'),/^application\/json/);
});
test('star name maximum length is enforced',async()=>{
 await assert.rejects(payload({name:'x'.repeat(101),date:'2026-01-16',detail:''}));
});
test('draft body must be text',async()=>{
 await assert.rejects(payload({title:'عنوان',body:null},'site'));
});
test('empty draft body is supported',async()=>{
 const saved=JSON.parse(await payload({title:'عنوان',body:''},'site'));
 assert.equal(saved.body,'');
});

test('star read requires authentication',async()=>{
 const response=await worker.fetch(apiRequest('/api/entries/stars:hassan:spring:0'),fakeEnv);
 assert.equal(response.status,401);
});
test('prayer draft read requires authentication',async()=>{
 const response=await worker.fetch(apiRequest('/api/entries/prayers:draft'),fakeEnv);
 assert.equal(response.status,401);
});
test('alerts draft read requires authentication',async()=>{
 const response=await worker.fetch(apiRequest('/api/entries/alerts:draft'),fakeEnv);
 assert.equal(response.status,401);
});
test('modules draft read requires authentication',async()=>{
 const response=await worker.fetch(apiRequest('/api/entries/modules:draft'),fakeEnv);
 assert.equal(response.status,401);
});

test('owner navigation links reach each existing section',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 for(const section of ['overview','stars','settings','audit']){
  assert.ok(html.includes('href="#'+section+'"'));
  assert.ok(html.includes('id="'+section+'"'));
 }
});
test('owner portal declares Arabic and right-to-left layout',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 assert.match(html,/<html lang="ar" dir="rtl">/);
 assert.match(html,/name="viewport"/);
});

test('draft preview is present in the owner editor',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../owner-settings.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="settingsPreview"'));
 assert.ok(js.includes("preview.textContent="));
 assert.ok(js.includes("renderPreview()"));
});

test('owner draft editor supports local copying and character counts',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../owner-settings.js',import.meta.url),'utf8');
 for(const id of ['settingsCopy','settingsCount'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes("navigator.clipboard.writeText(content)"));
 assert.ok(js.includes("body.value.length"));
});

test('owner editor marks unsaved draft changes without publishing',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../owner-settings.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="settingsDirty"'));
 assert.ok(js.includes("function renderDirty()"));
 assert.ok(js.includes("savedTitle=sentTitle;savedBody=sentBody"));
});

test('public integration review is read-only and never claims direct publishing',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('id="publishReview"'));
 assert.ok(html.includes('href="https://hada-weather.com/"'));
 assert.ok(html.includes('لا توجد صلاحية نشر مباشر'));
 assert.ok(html.includes('rel="noopener noreferrer"'));
});

test('staging public comparison only reads owner drafts and escapes their text',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 for(const id of ['reviewSection','reviewLoad','reviewStatus','reviewDraft','reviewPublic'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('src="./owner-review.js"'));
 assert.ok(js.includes("draft.textContent="));
 assert.ok(js.includes("credentials:'same-origin'"));
 assert.ok(!js.includes("method:'PUT'"));
 assert.ok(!js.includes("innerHTML"));
});

test('public site reference mapping is informational and read-only',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 assert.ok(js.includes('const knownPublic='));
 assert.ok(js.includes("main/index.html"));
 assert.ok(js.includes("publicLabel.textContent="));
 assert.ok(js.includes('reviewReadiness(select.value)'));
 assert.ok(!js.includes('fetch(\'https://hada-weather.com'));
});

test('site title preview uses pinned public snapshot and does not publish',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 assert.ok(js.includes('const reviewedSnapshot='));
 assert.ok(js.includes('39206620492782c51313fdee7802b697dad536cc'));
 assert.ok(js.includes('showSiteTitleDiff(data.payload.title)'));
 assert.ok(js.includes('العنوان مختلف ويحتاج موافقة'));
 assert.ok(!js.includes('method:\'PUT\''));
});

test('each public integration section states why drafts are not publish-ready',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 for(const section of ['site','prayers','alerts','modules'])assert.ok(js.includes(section+':{file:')||js.includes(section+':{title:'));
 assert.ok(js.includes('reviewReadiness(select.value)'));
 assert.ok(js.includes('لا يجوز استبدالها بمسودة نصية'));
 assert.ok(js.includes('المسودة النصية لا تمثل مفاتيح تشغيل جاهزة'));
});

test('review generates explicit change and rollback report without deployment actions',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 for(const id of ['reviewDiff','reviewCopyPlan','reviewPlanStatus'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes('function makePlan(section,data)'));
 assert.ok(js.includes('خطة الرجوع:'));
 assert.ok(js.includes('حالة النشر: ممنوع'));
 assert.ok(js.includes('navigator.clipboard.writeText(lastPlan)'));
 assert.ok(!js.includes("method:'PUT'"));
 assert.ok(!js.includes('innerHTML'));
});

test('review checklist resets on new draft and cannot publish',async()=>{
 const {readFile}=await import('node:fs/promises');
 const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 for(const id of ['reviewCheckSource','reviewCheckDiff','reviewCheckBackup','reviewCheckStatus'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes('function resetChecks()'));
 assert.ok(js.includes('function clearPlan(){resetChecks();'));
 assert.ok(js.includes('lastPlan=lines.join('));
 assert.ok(js.includes('if(request===serial)load.disabled=false'));
 assert.ok(!js.includes("method:'PUT'"));
});

test('owner review keeps non-site sections blocked pending typed adapters',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 assert.ok(js.includes("const approvedSections=new Set(['site'])"));
 assert.ok(js.includes('function integrationGate(section,record)'));
 assert.ok(js.includes('gate.eligible&&gate.isValid'));
 assert.ok(js.includes('تنفيذ النشر لا يزال غير مفعّل'));
});

test('review report binds the exact draft revision and requires current main verification',async()=>{
 const {readFile}=await import('node:fs/promises');
 const js=await readFile(new URL('../../owner-review.js',import.meta.url),'utf8');
 assert.ok(js.includes('function reviewIdentity(section,data)'));
 assert.ok(js.includes("return entry+'@'+revision"));
 assert.ok(js.includes('معرف المراجعة: '));
 assert.ok(js.includes('إعادة التحقق من رقم المسودة وSHA'));
 assert.ok(js.includes('function clearPlan(){loadedRevision=null;'));
});
