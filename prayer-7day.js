(()=>{
'use strict';
// Huda mosque location; agreed custom angles, standard Asr, no manual offsets.
const ids=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
const fields=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
const zone='Asia/Aden', key='hada-prayers-v1-14.212599-47.161149-16.5-17';
let calendar=null, pending=null, lastAttempt=0, displayedDay='';
function today(){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
function validCalendar(value,month){
 if(!value||value.month!==month||!Array.isArray(value.rows))return false;
 const [y,m]=month.split('-').map(Number), count=new Date(Date.UTC(y,m,0)).getUTCDate();
 return value.rows.length===count&&value.rows.every((r,i)=>r.day===`${month}-${String(i+1).padStart(2,'0')}`&&Array.isArray(r.times)&&r.times.length===6&&r.times.every(t=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)));
}
function parseCalendar(data,month){
 if(data.code!==200||!Array.isArray(data.data))throw new Error('Invalid prayer calendar');
 const rows=data.data.map(r=>{
  const g=r.date?.gregorian, meta=r.meta;
  if(!g||meta?.timezone!==zone||Math.abs(meta.latitude-14.212599)>0.000001||Math.abs(meta.longitude-47.161149)>0.000001||meta.school!=='STANDARD'||Number(meta.method?.params?.Fajr)!==16.5||Number(meta.method?.params?.Isha)!==17||Object.values(meta.offset||{}).some(v=>Number(v)!==0))throw new Error('Wrong prayer settings');
  return {day:`${g.year}-${String(g.month.number).padStart(2,'0')}-${String(g.day).padStart(2,'0')}`,times:fields.map(f=>String(r.timings?.[f]||'').replace(/ \(\+03\)$/,''))};
 });
 const value={month,rows};
 if(!validCalendar(value,month))throw new Error('Incomplete prayer calendar');
 return value;
}
function status(text){
 let el=document.getElementById('prayerDailyStatus');
 if(!el){const grid=document.querySelector('.prayers');if(!grid)return;el=document.createElement('div');el.id='prayerDailyStatus';el.className='small-note';el.style.cssText='text-align:center;margin-top:10px;line-height:1.8';el.setAttribute('aria-live','polite');grid.insertAdjacentElement('afterend',el);}
 el.textContent=text;
}
function render(day,loading=false){
 const row=calendar?.rows.find(r=>r.day===day);
 ids.forEach((id,i)=>{const el=document.getElementById(id);if(!el)return;const t=row?.times[i];if(!t){el.textContent='—';return;}const [h,m]=t.split(':').map(Number);el.textContent=`${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'ص':'م'}`;});
 displayedDay=day;
 if(row){const date=new Intl.DateTimeFormat('ar-YE',{timeZone:zone,calendar:'islamic-umalqura',day:'numeric',month:'long',year:'numeric'}).format(new Date());status(`مواقيت اليوم في هدى • ${date}`);}
 else status(loading?'جارٍ تحديث مواقيت اليوم في هدى…':'تعذر عرض مواقيت اليوم. اتصل بالإنترنت لتحديثها.');
}
async function refresh(force=false){
 const day=today(),month=day.slice(0,7);
 if(!validCalendar(calendar,month)){
  calendar=null;
  try{const cached=JSON.parse(localStorage.getItem(key));if(validCalendar(cached,month))calendar=cached;}catch(e){}
 }
 if(calendar){render(day);return;}
 if(pending){if(displayedDay!==day)render(day,true);return pending;}
 if(!force&&Date.now()-lastAttempt<300000){render(day);return;}
 lastAttempt=Date.now();render(day,true);
 pending=(async()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const [year,monthNumber]=month.split('-');
   const query=new URLSearchParams({latitude:'14.212599',longitude:'47.161149',method:'99',methodSettings:'16.5,null,17',school:'0',timezonestring:zone,calendarMethod:'UAQ',tune:'0,0,0,0,0,0,0,0,0'});
   const response=await fetch(`https://api.aladhan.com/v1/calendar/${year}/${Number(monthNumber)}?${query}`,{signal:controller.signal});
   if(!response.ok)throw new Error('Prayer request failed');
   const next=parseCalendar(await response.json(),month);
   // A request completing after midnight must never put yesterday's times back.
   if(today().slice(0,7)===month){calendar=next;try{localStorage.setItem(key,JSON.stringify(next));}catch(e){}}
  }catch(e){console.warn('prayer calendar unavailable',e);}
  finally{clearTimeout(timeout);pending=null;render(today());if(today().slice(0,7)!==month){lastAttempt=0;refresh();}}
 })();
 return pending;
}
window.loadPrayers=()=>refresh();
refresh();
window.addEventListener('load',()=>refresh());
window.addEventListener('online',()=>refresh(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
setInterval(()=>{if(today()!==displayedDay||!calendar)refresh();},60000);
})();
