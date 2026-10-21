(()=>{'use strict';
const HOUR=3600000,ACTIVE='الحالة: نشاط ركامي - تدفق كتل سحابية وفرص أمطار متفرقة من جهة بحر العرب نحو السواحل والمناطق الداخلية',QUIET='الحالة: هدوء واستقرار في أجواء بحر العرب دون تشكلات سحابية مؤثرة';
let latest=null,pending=null,lastAttempt=0;
const root=()=>document.getElementById('seaLiveBulletin');
function valid(data){const now=Date.now();return data?.schema==='hada-sea-activity-v1'&&['active','quiet'].includes(data.state)&&data.summary===(data.state==='active'?ACTIVE:QUIET)&&data.source==='Open-Meteo'&&data.basis==='hourly-model-estimate'&&Number.isFinite(data.checkedAt)&&data.checkedAt<=now+300000&&now-data.checkedAt<HOUR&&data.validFrom===Math.floor(now/HOUR)*HOUR&&data.validUntil===data.validFrom+HOUR;}
function render(){const box=root();if(!box)return;box.replaceChildren();const p=document.createElement('p');p.className='sea-current-summary';p.textContent=valid(latest)?latest.summary:pending?'جارٍ تحديث أجواء بحر العرب…':'لا تتوفر بيانات حديثة الآن؛ ستُعاد المحاولة تلقائيًا.';box.appendChild(p);if(valid(latest)){const note=document.createElement('p');note.className='small-note';note.textContent='تقدير ساعي: Open-Meteo · '+new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(latest.checkedAt));box.appendChild(note);}}
async function refresh(){
 if(pending)return pending;if(valid(latest)){render();return;}
 lastAttempt=Date.now();
 pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{const r=await fetch('./api/sea-activity',{signal:controller.signal,cache:'no-cache',credentials:'same-origin'});if(!r.ok)throw Error('sea_unavailable');const data=await r.json();if(!valid(data))throw Error('invalid_sea');latest=data;}catch{latest=null;}finally{clearTimeout(timer);pending=null;render();}})();render();return pending;
}
function isOpen(){return !!root()?.isConnected&&document.getElementById('infoModal')?.style.display==='block';}
function mount(box){const content=document.createElement('div');content.id='seaLiveBulletin';content.setAttribute('aria-live','polite');box.replaceChildren(content);render();refresh();}
function resume(){if(!document.hidden&&!valid(latest)&&Date.now()-lastAttempt>=60000)refresh();else if(isOpen())render();}
window.HadaSeaBulletin={mount,render,isOpen,refresh};
// Recheck the hourly window alongside weather updates, including after sleep.
window.addEventListener('hada:live-weather',resume);window.addEventListener('online',()=>{lastAttempt=0;resume();});document.addEventListener('visibilitychange',resume);
setInterval(resume,60000);refresh();
// Discard the retired reader's persisted bulletin; it is never displayed again.
try{localStorage.removeItem('hada-official-last-verified-v1');}catch{}
})();
