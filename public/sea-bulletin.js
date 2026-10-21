(()=>{'use strict';
const HOUR=3600000,ACTIVE='الحالة: نشاط ركامي - تدفق كتل سحابية وفرص أمطار متفرقة من جهة بحر العرب نحو السواحل والمناطق الداخلية',REGIONAL_ACTIVE='الحالة: نشاط سحابي - غطاء سحابي مرتفع أو فرص أمطار متفرقة في نطاق بحر العرب وسواحل شبوة والمناطق الداخلية',MARINE_ACTIVE='الحالة: رصد مؤشرات نشاط مداري / تدفق كتل ركامية من بحر العرب وخليج عدن نحو السواحل الجنوبية',WIND_ACTIVE='الحالة: نشاط رياح في بحر العرب وخليج عدن ومحيط سقطرى؛ تُتابَع فرص امتداد السحب نحو السواحل الجنوبية',MOIST_ACTIVE='الحالة: تدفق رطوبة وسحب في بحر العرب وخليج عدن باتجاه السواحل الجنوبية',QUIET='الحالة: لا تبرز حاليًا مؤشرات سحب كثيفة أو فرص أمطار مؤثرة في النطاق المتابع';
let latest=null,pending=null,lastAttempt=0;
const root=()=>document.getElementById('seaLiveBulletin');
function valid(data){const now=Date.now();return data?.schema==='hada-sea-activity-v3'&&['active','quiet'].includes(data.state)&&(data.state==='active'?[ACTIVE,REGIONAL_ACTIVE,MARINE_ACTIVE,WIND_ACTIVE,MOIST_ACTIVE].includes(data.summary):data.summary===QUIET)&&data.source==='Open-Meteo'&&data.basis==='hourly-model-estimate'&&Number.isFinite(data.checkedAt)&&data.checkedAt<=now+300000&&now-data.checkedAt<HOUR&&data.validFrom===Math.floor(now/HOUR)*HOUR&&data.validUntil===data.validFrom+HOUR;}
function render(){const box=root();if(!box)return;box.replaceChildren();const p=document.createElement('p');p.className='sea-current-summary';p.textContent=valid(latest)?latest.summary:pending?'جارٍ تحديث أجواء بحر العرب…':'لا تتوفر بيانات حديثة الآن؛ ستُعاد المحاولة تلقائيًا.';box.appendChild(p);if(valid(latest)){const note=document.createElement('p');note.className='small-note';note.textContent='رصد آلي متجدد · تحديث '+new Intl.DateTimeFormat('ar-YE-u-nu-arab',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(latest.checkedAt));box.appendChild(note);}}
async function refresh(){
 if(pending)return pending;if(valid(latest)){render();return;}
 lastAttempt=Date.now();
 pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{const r=await fetch('./api/sea-activity?revision=marine-v3',{signal:controller.signal,cache:'no-cache',credentials:'same-origin'});if(!r.ok)throw Error('sea_unavailable');const data=await r.json();if(!valid(data))throw Error('invalid_sea');latest=data;}catch{latest=null;}finally{clearTimeout(timer);pending=null;render();}})();render();return pending;
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
