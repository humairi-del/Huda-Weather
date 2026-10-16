import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

// Run the actual browser controller with a small DOM adapter; no network or timer work.
async function desk(now='2026-10-16T10:00:00Z'){
 class Element{
  constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.children=[];this.attrs={};this.style={};this.hidden=false;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){} scrollIntoView(){} click(){this.onclick?.();} showModal(){this.open=true;} close(){this.open=false;}
 }
 const sea=new Element('div'),modal=new Element('div');modal.style.display='block';modal.append(sea);
 const walk=(root,predicate)=>predicate(root)?root:root.children.map(e=>walk(e,predicate)).find(Boolean);
 const document={readyState:'complete',hidden:false,body:new Element('body'),createTextNode:text=>new Element('#text',text),createElement:tag=>new Element(tag),querySelector:selector=>selector==='#seaModal .sea-content'?sea:null,getElementById:id=>id==='seaModal'?modal:walk(sea,e=>e.id===id),addEventListener(){}};
 const context={document,location:{hostname:'redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev'},window:{},URL,Intl,Date:class extends Date{static now(){return new Date(now).getTime();}},AbortSignal,MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},setInterval(){}};
 vm.runInNewContext(await readFile(new URL('./cyclone-season.js',import.meta.url),'utf8'),context);
 return {find:p=>walk(sea,p),byId:id=>document.getElementById(id)};
}

test('all five model choices show their own local original image without external navigation',async()=>{
 const ui=await desk(),button=ui.byId('seaModelsButton'),panel=ui.byId('seaModelMaps'),select=ui.byId('seaModelChoice');
 assert.equal(panel.hidden,true);button.onclick();assert.equal(panel.hidden,false);assert.equal(button.attrs['aria-expanded'],'true');
 for(const [id,name] of [['ecmwf','ECMWF'],['gfs','GFS'],['cmc','CMC'],['icon','ICON'],['aifs','AIFS']]){
  select.value=id;select.onchange();const img=ui.byId('seaForecastImage');
  assert.equal(img.src,'/sea-charts/2026-10-16/'+id+'.png');assert.ok(img.alt.includes(name));assert.equal(ui.find(e=>e.tagName==='iframe'),undefined);
  const zoom=ui.find(e=>e.tagName==='button'&&e.textContent==='تكبير الصورة داخل الموقع');assert.equal(zoom.disabled,true);img.onload();assert.equal(zoom.disabled,false);
  zoom.onclick();assert.equal(ui.find(e=>e.tagName==='dialog').open,true);
 }
 ui.byId('seaForecastImage').onerror();assert.ok(ui.find(e=>e.textContent.startsWith('تعذر تحميل صورة هذا الموديل')));
 ui.find(e=>e.tagName==='button'&&e.textContent==='إغلاق صور الموديلات').onclick();assert.equal(panel.hidden,true);assert.equal(ui.byId('seaForecastImage'),undefined);assert.equal(button.attrs['aria-expanded'],'false');
});

test('older bulletin is explicit and an expired forecast is archive-only',async()=>{
 for(const [now,text] of [['2026-10-18T00:00:00Z','هذه نشرة سابقة'],['2026-10-21T00:00:00Z','انتهت فترة هذه النشرة']]){
  const ui=await desk(now);ui.byId('seaModelsButton').onclick();const warning=ui.find(e=>e.textContent.startsWith(text));assert.ok(warning);assert.equal(warning.hidden,false);
 }
});
