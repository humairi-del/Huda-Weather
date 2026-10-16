import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

// Run the actual browser controller with a small DOM adapter; no network or timer work.
async function desk(){
 class Element{
  constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.children=[];this.attrs={};this.style={};this.hidden=false;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){} scrollIntoView(){}
 }
 const sea=new Element('div'),modal=new Element('div');modal.style.display='block';modal.append(sea);
 const walk=(root,predicate)=>predicate(root)?root:root.children.map(e=>walk(e,predicate)).find(Boolean);
 const document={readyState:'complete',hidden:false,body:new Element('body'),createElement:tag=>new Element(tag),querySelector:selector=>selector==='#seaModal .sea-content'?sea:null,getElementById:id=>id==='seaModal'?modal:walk(sea,e=>e.id===id),addEventListener(){}};
 const context={document,location:{hostname:'redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev'},window:{},URL,Intl,Date,AbortSignal,MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},setInterval(){}};
 vm.runInNewContext(await readFile(new URL('./cyclone-season.js',import.meta.url),'utf8'),context);
 return {find:p=>walk(sea,p),byId:id=>document.getElementById(id)};
}

test('model navigation preserves source identity and removes stale imagery for every unsupported model',async()=>{
 const ui=await desk(),button=ui.byId('seaModelsButton'),panel=ui.byId('seaModelMaps'),select=ui.byId('seaModelChoice');
 assert.equal(panel.hidden,true);button.onclick();assert.equal(panel.hidden,false);assert.equal(button.attrs['aria-expanded'],'true');
 const frame=ui.byId('seaForecastFrame');assert.ok(frame);assert.equal(new URL(frame.src).searchParams.get('product'),'ecmwf');assert.match(frame.title,/ECMWF/);
 for(const [id,slug,name] of [['gfs','standard','GFS'],['cmc','can','CMC'],['icon','german','ICON'],['aifs','euro-ai','AIFS']]){
  select.value=id;select.onchange();assert.equal(ui.byId('seaForecastFrame'),undefined);
  assert.ok(ui.find(e=>e.textContent==='خريطة هذا الموديل غير متاحة للعرض داخل الموقع حاليًا.'));
  const link=ui.find(e=>e.tagName==='a'&&e.href==='https://meteologix.com/ye/model-charts/'+slug);assert.ok(link);assert.ok(link.textContent.includes(name));
 }
 select.value='ecmwf';select.onchange();assert.ok(ui.byId('seaForecastFrame'));
 ui.find(e=>e.tagName==='button'&&e.textContent==='الرياح والضغط').onclick();assert.equal(new URL(ui.byId('seaForecastFrame').src).searchParams.get('overlay'),'wind');
 ui.find(e=>e.tagName==='button'&&e.textContent==='إغلاق خرائط الموديلات').onclick();assert.equal(panel.hidden,true);assert.equal(ui.byId('seaForecastFrame'),undefined);assert.equal(button.attrs['aria-expanded'],'false');
});
