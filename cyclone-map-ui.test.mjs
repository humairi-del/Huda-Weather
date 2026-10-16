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
 const context={document,location:{hostname:'redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev'},window:{},URL,Intl,Date:class extends Date{static now(){return new Date(now).getTime();}},Response,AbortSignal,fetch:async()=>new Response('unavailable',{status:503}),MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){},setInterval(){}};
 vm.runInNewContext(await readFile(new URL('./cyclone-season.js',import.meta.url),'utf8'),context);
 return {find:p=>walk(sea,p),byId:id=>document.getElementById(id)};
}

test('three choices reveal only one panel, without raw maps or external navigation',async()=>{
 const ui=await desk();
 for(let i=0;i<3;i++){
  const button=ui.byId('seaChoice'+i);assert.ok(button);button.onclick();
  for(let j=0;j<3;j++){assert.equal(ui.byId('seaPane'+j).hidden,j!==i);assert.equal(ui.byId('seaChoice'+j).attrs['aria-expanded'],String(j===i));}
 }
 assert.equal(ui.find(e=>e.tagName==='iframe'),undefined);assert.equal(ui.find(e=>e.tagName==='select'),undefined);const link=ui.find(e=>e.tagName==='a');assert.equal(link.textContent,'متابعة العواصف المدارية');assert.equal(link.href,'https://zoom.earth/storms/93s-2027/#map=precipitation/model=gfs/overlays=wind,fires,crosshair');assert.equal(link.rel,'noopener noreferrer');
});
