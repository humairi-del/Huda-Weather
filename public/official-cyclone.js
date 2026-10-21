(()=>{'use strict';
const ZONE='Asia/Aden',HOME='https://rsmcnewdelhi.imd.gov.in/';
const STAGES=['اضطراب','منخفض جوي','منخفض عميق','عاصفة مدارية','إعصار رسمي'];
let latest=null,pending=null,lastAttempt=0,transport='idle';
const states=['active','upper-air','no-classified-system','ended','unverified'];
function valid(data,now=Date.now()){
 if(data?.schema!=='hada-imd-cyclone-v1'||data.authority!=='IMD / RSMC New Delhi'||data.basin!=='Arabian Sea'||!states.includes(data.state)||!Number.isFinite(data.issuedAt)||!Number.isFinite(data.checkedAt)||data.issuedAt>now+900000||data.checkedAt>now+300000||now-data.issuedAt>(data.state==='active'?12:30)*3600000)return false;
 let source;try{source=new URL(data.sourceUrl)}catch{return false}
 if(source.origin!==new URL(HOME).origin||!source.pathname.startsWith('/uploads/')||!source.pathname.endsWith('.pdf'))return false;
 if(typeof data.summary!=='string'||data.summary.length>500||typeof data.track?.text!=='string'||data.track.text.length>500)return false;
 if(data.state==='active'&&(!Number.isInteger(data.stage)||data.stage<0||data.stage>4||typeof data.category!=='string'))return false;
 if(data.state!=='active'&&data.stage!==null)return false;
 if(data.name!==null&&(typeof data.name!=='string'||data.name.length>50))return false;
 if(data.wind!==null&&(['knotsMin','knotsMax','kmhMin','kmhMax'].some(k=>!Number.isFinite(data.wind[k])||data.wind[k]<=0||data.wind[k]>500)||data.wind.knotsMin>data.wind.knotsMax||data.wind.kmhMin>data.wind.kmhMax))return false;
 return true;
}
// Historical display reuses every content/source check in valid(). Only the age
// check receives a temporary timestamp; the original bulletin is never changed.
function validDated(data,now=Date.now()){
 if(!Number.isFinite(data?.issuedAt)||data.issuedAt<=0||data.issuedAt>now+900000||!Number.isFinite(data.checkedAt)||data.checkedAt<=0||data.checkedAt>now+300000)return false;
 return valid({...data,issuedAt:now},now);
}
function notify(){window.dispatchEvent(new CustomEvent('hada:official-cyclone'));}
async function read(url,signal){const r=await fetch(url,{signal,credentials:'same-origin',cache:'no-cache'});if(!r.ok)throw new Error('official_unavailable');const data=await r.json();if(!validDated(data))throw new Error('official_stale_or_invalid');return data;}
function accept(data){if(!latest||data.issuedAt>latest.issuedAt||(data.issuedAt===latest.issuedAt&&data.checkedAt>=latest.checkedAt)){latest=data;try{localStorage.setItem('hada-official-last-verified-v1',JSON.stringify(data));}catch{}notify();}}
try{const saved=JSON.parse(localStorage.getItem('hada-official-last-verified-v1'));if(validDated(saved))latest=saved;}catch{}
async function refresh(force=false){
 if(pending)return pending;
 if(!force&&Date.now()-lastAttempt<15*60000){notify();return;}
 lastAttempt=Date.now();transport='loading';notify();
 pending=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  // A verified dated snapshot supplies the first view on weak connections;
  // the same-origin reader then discovers and checks the latest official PDF.
  const snapshot=!latest?read('./official-cyclone-snapshot.json',controller.signal).then(accept).catch(()=>{}):Promise.resolve();
  try{const data=await read('./api/official-cyclone',controller.signal);accept(data);transport=valid(data)?'live':'error';}
  catch{transport='error';}
  finally{await snapshot;clearTimeout(timer);pending=null;notify();}
 })();return pending;
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function fact(dl,label,value){const dt=el('dt',label),dd=el('dd',value);dl.append(dt,dd);}
const num=n=>new Intl.NumberFormat('ar-YE',{maximumFractionDigits:0}).format(n);
function range(lo,hi){return Math.abs(hi-lo)<.01?num(lo):`${num(lo)}–${num(hi)}`;}
function renderCard(){
 const data=valid(latest)?latest:null;
 const card=el('section',undefined,'sea-simple-status');card.dataset.state=data?.state||'unavailable';
 card.setAttribute('aria-label','حالة بحر العرب');card.setAttribute('aria-busy',String(transport==='loading'));
 let message;
 if(!data||data.state==='unverified')message=transport==='loading'?'جارٍ التحقق من أحدث نشرة لبحر العرب…':'لا تتوفر نشرة حديثة مؤكدة الآن. أعد التحديث لاحقاً.';
 else if(data.state==='active'&&data.stage>=2){
  message='الحالة: '+data.category+(data.name?' «'+data.name+'»':'')+'.';
 }else{
  message=data.state==='active'||data.state==='upper-air'?'الحالة: نشاط منخفض جوي اعتيادي.':'الحالة: استقرار عام في تصنيف الحالات المدارية؛ لا توجد عاصفة نشطة في النشرة.';
  // Never infer local safety from the absence of a cyclone classification.
  const targets=data.track?.targets;
  if(data.state==='active'&&Array.isArray(targets)&&targets.length&&targets.every(t=>/^(الصومال|الهند|باكستان|عمان)$/.test(t)))message+=' لا تشير الوجهة المذكورة في النشرة إلى تأثير مباشر على هدى وحبان.';
 }
 card.appendChild(el('p',message,'sea-current-summary'));
 if(data?.state==='active'){
  if(data.track.text)card.appendChild(el('p',data.track.text));
  if(data.stage>=2&&data.wind)card.appendChild(el('p','الرياح: '+range(data.wind.kmhMin,data.wind.kmhMax)+' كم/س.'));
 }
 if(data)card.appendChild(el('p','وقت النشرة: '+new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(data.issuedAt)),'cyclone-official-time'));
 const retry=el('button','تحديث الحالة');retry.type='button';retry.disabled=transport==='loading';retry.onclick=()=>refresh(true);card.appendChild(retry);
 const credit=el('p'),link=el('a','المصدر: المركز الإقليمي للأعاصير – نيودلهي');link.href=data?.sourceUrl||HOME;link.target='_blank';link.rel='noopener noreferrer';credit.appendChild(link);card.appendChild(credit);
 return card;
}
window.HadaOfficialCyclone={refresh,renderCard,valid,stages:STAGES,getData:()=>valid(latest)?latest:null};
window.addEventListener('online',()=>{if(window.HadaSeaBulletin?.isOpen()){lastAttempt=0;refresh();}});
setInterval(()=>{if(window.HadaSeaBulletin?.isOpen()){notify();refresh();}},60000);
})();
