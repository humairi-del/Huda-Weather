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
function notify(){window.dispatchEvent(new CustomEvent('hada:official-cyclone'));}
async function read(url,signal){const r=await fetch(url,{signal,credentials:'same-origin',cache:'no-cache'});if(!r.ok)throw new Error('official_unavailable');const data=await r.json();if(!valid(data))throw new Error('official_stale_or_invalid');return data;}
function accept(data){if(!latest||data.issuedAt>latest.issuedAt||(data.issuedAt===latest.issuedAt&&data.checkedAt>=latest.checkedAt)){latest=data;try{localStorage.setItem('hada-official-last-verified-v1',JSON.stringify(data));}catch{}notify();}}
try{const saved=JSON.parse(localStorage.getItem('hada-official-last-verified-v1'));if(valid(saved))latest=saved;}catch{}
async function refresh(force=false){
 if(pending)return pending;
 if(!force&&Date.now()-lastAttempt<15*60000){notify();return;}
 lastAttempt=Date.now();transport='loading';notify();
 pending=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  // A verified dated snapshot supplies the first view on weak connections;
  // the same-origin reader then discovers and checks the latest official PDF.
  const snapshot=!latest?read('./official-cyclone-snapshot.json',controller.signal).then(accept).catch(()=>{}):Promise.resolve();
  try{const data=await read('./api/official-cyclone',controller.signal);accept(data);transport='live';}
  catch{transport='error';}
  finally{await snapshot;clearTimeout(timer);pending=null;notify();}
 })();return pending;
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function fact(dl,label,value){const dt=el('dt',label),dd=el('dd',value);dl.append(dt,dd);}
const num=n=>new Intl.NumberFormat('ar-YE',{maximumFractionDigits:0}).format(n);
function range(lo,hi){return Math.abs(hi-lo)<.01?num(lo):`${num(lo)}–${num(hi)}`;}
function renderCard(){
 const data=valid(latest)?latest:null,active=data?.state==='active';
 const card=el('section',undefined,'official-cyclone-card');card.dataset.state=data?.state||'unavailable';card.setAttribute('aria-label','مركز رصد وتصنيف الحالات المدارية');card.setAttribute('aria-busy',String(!data&&transport==='loading'));
 card.appendChild(el('p','الرصد والتصنيف الرسمي • IMD / RSMC','cyclone-official-kicker'));
 card.appendChild(el('h3','🌀 مركز رصد وتصنيف الحالات المدارية'));
 const badge=el('span',data?.state==='ended'?'انتهاء موثق':active?(data.lifecycle==='weakening'?'حالة في طور الضعف':'حالة مصنفة رسميًا'):data?.state==='upper-air'?'دوران علوي مرصود':data?.state==='no-classified-system'?'لا تصنيف سطحي في النشرة':'بانتظار التحقق','cyclone-status-pill');card.appendChild(badge);
 const dl=el('dl',undefined,'cyclone-official-facts');
 fact(dl,'🌀 الحالة الحالية',data?active?`${data.category}${data.name?' باسم '+data.name:' — الاسم غير متاح للتحقق'}`:data.summary:transport==='error'?'تعذر تحديث النشرة الرسمية الآن.':'جارٍ قراءة أحدث نشرة رسمية لبحر العرب…');
 fact(dl,'📊 التصنيف الحالي',data?.category||'غير متاح للتحقق الآن');
 fact(dl,'💨 الرياح المركزية',data?.wind?`${range(data.wind.knotsMin,data.wind.knotsMax)} عقدة / ${range(data.wind.kmhMin,data.wind.kmhMax)} كم/س`:'لم ترد سرعة مركزية قابلة للتحقق');
 fact(dl,'🗺️ المسار المتوقع',data?.track.text||'بانتظار بيانات رسمية قابلة للتحقق');
 card.appendChild(dl);
 const wrap=el('div',undefined,'cyclone-stages-wrap');wrap.tabIndex=0;wrap.setAttribute('aria-label','شريط مراحل التصنيف؛ مرر أفقيًا عند الحاجة');
 const list=el('ol',undefined,'cyclone-stages');list.setAttribute('aria-label','مراحل تصنيف الحالة المدارية');
 STAGES.forEach((label,index)=>{const item=el('li');item.append(el('span',num(index+1),'cyclone-stage-dot'),el('span',label,'cyclone-stage-label'));if(active&&data.stage===index){item.className='is-active';item.setAttribute('aria-current','step');}list.appendChild(item);});wrap.appendChild(list);card.appendChild(wrap);
 card.appendChild(el('p','التسمية تبدأ من مرحلة العاصفة المدارية. يوضح الشريط التصنيف الحالي، ولا يعني تطور الحالة حتمًا.','cyclone-official-note'));
 if(data)card.appendChild(el('p','وقت النشرة: '+new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(data.issuedAt)),'cyclone-official-time'));
 if(transport==='loading')card.appendChild(el('p',data?'جارٍ التحقق من أحدث نشرة…':'جارٍ الاتصال بالمصدر الرسمي…','cyclone-official-note'));
 if(transport==='error')card.appendChild(el('p',data?'تعذر التحقق من آخر تحديث؛ المعروض هو آخر نشرة متاحة مؤرخة أعلاه.':'المعلومات غير متاحة الآن؛ لم تُعتبر الحالة مستقرة أو منتهية.','cyclone-official-note'));
 const retry=el('button','تحديث');retry.type='button';retry.disabled=transport==='loading';retry.onclick=()=>refresh(true);card.appendChild(retry);
 const credit=el('p',undefined,'cyclone-official-source'),link=el('a','المصدر الرسمي: المركز الإقليمي للأعاصير – نيودلهي');link.href=data?.sourceUrl||HOME;link.target='_blank';link.rel='noopener noreferrer';credit.appendChild(link);card.appendChild(credit);
 return card;
}
window.HadaOfficialCyclone={refresh,renderCard,valid,stages:STAGES,getData:()=>valid(latest)?latest:null};
window.addEventListener('online',()=>{if(window.HadaSeaBulletin?.isOpen()){lastAttempt=0;refresh();}});
setInterval(()=>{if(window.HadaSeaBulletin?.isOpen()){notify();refresh();}},60000);
})();
