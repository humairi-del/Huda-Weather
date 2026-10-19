import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
const NOW=Date.parse('2026-10-19T03:10:00Z');
function harness(saved){
 const nodes=new Map();
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.hidden=false;this.open=false;this.value='';this.style={};}
  set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}
  set textContent(v){this.value=String(v);this.children=[];}get textContent(){return this.value+this.children.map(x=>x.textContent).join(' ');}
  append(...x){this.children.push(...x);}appendChild(x){this.children.push(x);return x;}replaceChildren(...x){this.value='';this.children=x;}
  setAttribute(k,v){this.attributes[k]=v;}get isConnected(){return true;}
  querySelectorAll(selector){const all=this.children.flatMap(x=>[x,...x.querySelectorAll(selector)]);return all.filter(x=>x.tagName==='details'&&(selector!=='details[open]'||x.open));}
 }
 const document={createElement:tag=>new Element(tag),createTextNode:text=>{const n=new Element('#text');n.textContent=text;return n;},getElementById:id=>nodes.get(id)||null};
 class FixedDate extends Date{constructor(...a){super(...(a.length?a:[NOW]));}static now(){return NOW;}}
 const window={addEventListener(){},dispatchEvent(){}};
 const ctx={window,document,Date:FixedDate,Intl,URL,AbortController,CustomEvent:class{},setInterval(){},setTimeout(){return 1;},clearTimeout(){},localStorage:{getItem:()=>saved?JSON.stringify(saved):null,setItem(){}},fetch:async()=>{throw Error('offline');}};
 vm.createContext(ctx);vm.runInContext(read('official-cyclone.js'),ctx);
 return {window,document,nodes,ctx,Element};
}
function visible(node){if(node.hidden)return '';const children=node.tagName==='details'&&!node.open?node.children.filter(x=>x.tagName==='summary'):node.children;return node.value+' '+children.map(visible).join(' ');}
const bulletin=()=>({schema:'hada-imd-cyclone-v1',authority:'IMD / RSMC New Delhi',basin:'Arabian Sea',state:'active',issuedAt:NOW-3600000,checkedAt:NOW,sourceUrl:'https://rsmcnewdelhi.imd.gov.in/uploads/test.pdf',summary:'تصنيف رسمي',track:{text:'باتجاه الصومال وفق النشرة.',targets:[]},stage:0,category:'منطقة ضغط منخفض محددة جيدًا',name:null,wind:{knotsMin:15,knotsMax:15,kmhMin:27.78,kmhMax:27.78}});
test('official summary keeps category, direction and date, while stages and wind stay in collapsed details',()=>{
 const h=harness(bulletin()),card=h.window.HadaOfficialCyclone.renderCard(),text=visible(card);
 assert.match(text,/منطقة ضغط منخفض محددة جيدًا/);assert.match(text,/باتجاه الصومال/);assert.match(text,/وقت النشرة/);assert.match(text,/تفاصيل الحالة/);
 assert.doesNotMatch(text,/الاسم غير متاح|إعصار رسمي|الرياح قرب مركز/);
 const details=card.querySelectorAll('details')[0];details.open=true;assert.match(visible(card),/الرياح قرب مركز الحالة/);assert.match(visible(card),/إعصار رسمي/);
});
test('expired bulletin is dated history, excluded from current data and has no stage bar',async()=>{
 const old=bulletin();old.issuedAt=NOW-13*3600000;const h=harness(old);assert.equal(h.window.HadaOfficialCyclone.getData(),null);
 await h.window.HadaOfficialCyclone.refresh();const card=h.window.HadaOfficialCyclone.renderCard(),text=visible(card);
 assert.match(text,/آخر نشرة موثقة/);assert.match(text,/بانتظار تحديث رسمي/);assert.match(text,/لا تصف الحالة الحالية/);assert.doesNotMatch(text,/لا توجد|انتهت|مصنفة رسميًا|منطقة ضغط منخفض/);assert.equal(card.dataset.state,'historical');
 const details=card.querySelectorAll('details')[0];details.open=true;assert.match(visible(card),/ما ورد حين صدورها: منطقة ضغط منخفض/);assert.doesNotMatch(visible(card),/إعصار رسمي/);
});
test('upper-air observations stay upper-air and do not become surface tropical systems',()=>{
 const data={...bulletin(),state:'upper-air',stage:null,wind:null,category:'دوران علوي',summary:'دوران علوي مرصود دون تصنيف سطحي.'};
 const text=visible(harness(data).window.HadaOfficialCyclone.renderCard());assert.match(text,/دوران علوي/);assert.doesNotMatch(text,/مصنفة رسميًا|إعصار رسمي/);
});
function localHarness(total=2){
 const h=harness(null),root=new h.Element('div');root.id='seaLiveBulletin';const modal=new h.Element('div');modal.id='infoModal';modal.style.display='block';
 const dates=Array.from({length:7},(_,i)=>'2026-10-'+(19+i)),period={start:dates[0],end:'2026-10-26',dates};
 const points=[{name:'هدى',lat:14,lon:47},{name:'حبان',lat:14.5,lon:47.5}];
 let forecast={units:'mm',fetchedAt:NOW,p:period,models:['ecmwf','gfs','icon'],data:points.map(p=>({...p,daily:[total,0,0,0,0,0,0]}))};
 h.window.HadaMapHub={period:()=>period,points,shabwahGeometry:{type:'Polygon',coordinates:[[[46,13],[49,13],[49,16],[46,16],[46,13]]]},getForecast:()=>forecast};
 vm.runInContext(read('sea-bulletin.js'),h.ctx);return {...h,root,setForecast:v=>{forecast=v;}};
}
test('local totals remain separate, methodology is collapsed, and open details survive a refresh',()=>{
 const h=localHarness(2);h.window.HadaSeaBulletin.render();const text=visible(h.root);
 assert.match(text,/هدى/);assert.match(text,/حبان/);assert.match(text,/مجموع المطر المتوقع خلال ٧ أيام/);assert.doesNotMatch(text,/لم يتجاوز|أعلى كمية بين المواقع/);
 const local=h.root.querySelectorAll('details').find(x=>x.dataset.seaDetail==='local');local.open=true;h.window.HadaSeaBulletin.render();
 assert.equal(h.root.querySelectorAll('details').find(x=>x.dataset.seaDetail==='local').open,true);
});
test('the existing 50mm watch stays visible, and missing data never becomes zero rainfall',()=>{
 const h=localHarness(51);h.window.HadaSeaBulletin.render();assert.match(visible(h.root),/تتجاوز توقعات المطر/);
 h.setForecast(null);h.window.HadaSeaBulletin.render();assert.match(visible(h.root),/تحديث توقعات المطر/);assert.doesNotMatch(visible(h.root),/٠ ملم|لا توجد أمطار/);
});

test('first visit can read an expired dated snapshot but never returns it as current',async()=>{
 const h=harness(null),old={...bulletin(),issuedAt:NOW-48*3600000,checkedAt:NOW-47*3600000};
 h.ctx.fetch=async url=>{if(url.includes('/api/'))throw Error('offline');return {ok:true,json:async()=>old};};
 await h.window.HadaOfficialCyclone.refresh(true);assert.equal(h.window.HadaOfficialCyclone.getData(),null);assert.equal(h.window.HadaOfficialCyclone.renderCard().dataset.state,'historical');
});
test('invalid source, future timestamps and malformed stored bulletins are never historical',()=>{
 for(const data of [{...bulletin(),sourceUrl:'https://example.com/uploads/test.pdf'},{...bulletin(),issuedAt:NOW+3600000},{...bulletin(),checkedAt:NOW+3600000},{...bulletin(),stage:9},{...bulletin(),authority:'unknown'},{...bulletin(),issuedAt:0}]){
  const api=harness(data).window.HadaOfficialCyclone;assert.equal(api.getData(),null);assert.equal(api.renderCard().dataset.state,'unavailable');
 }
});
test('fresh API replaces history while delayed older snapshot cannot overwrite it',async()=>{
 const h=harness(null),fresh=bulletin(),old={...fresh,issuedAt:NOW-48*3600000,checkedAt:NOW-47*3600000};let resolveSnapshot;
 h.ctx.fetch=async url=>url.includes('/api/')?{ok:true,json:async()=>fresh}:new Promise(r=>{resolveSnapshot=()=>r({ok:true,json:async()=>old});});
 const task=h.window.HadaOfficialCyclone.refresh(true);await Promise.resolve();await Promise.resolve();resolveSnapshot();await task;
 assert.equal(h.window.HadaOfficialCyclone.getData().issuedAt,fresh.issuedAt);assert.equal(h.window.HadaOfficialCyclone.renderCard().dataset.state,'active');
});
test('failed update preserves current bulletin until expiry and never promotes stale API to current',async()=>{
 const h=harness(bulletin()),old={...bulletin(),issuedAt:NOW-15*3600000};
 h.ctx.fetch=async()=>({ok:true,json:async()=>old});await h.window.HadaOfficialCyclone.refresh(true);
 assert.equal(h.window.HadaOfficialCyclone.getData().issuedAt,bulletin().issuedAt);
 const expired=harness(old);expired.ctx.fetch=h.ctx.fetch;await expired.window.HadaOfficialCyclone.refresh(true);assert.equal(expired.window.HadaOfficialCyclone.getData(),null);
});
