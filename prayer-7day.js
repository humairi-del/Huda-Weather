(()=>{
'use strict';
// Hada local prayer schedule for 2–8 Oct 2026, monitored against Hada mosque clock.
const schedule={
  '2026-10-02':['4:36 ص','5:40 ص','11:41 ص','3:01 م','5:41 م','6:47 م'],
  '2026-10-03':['4:36 ص','5:40 ص','11:40 ص','3:01 م','5:40 م','6:47 م'],
  '2026-10-04':['4:36 ص','5:41 ص','11:40 ص','3:01 م','5:39 م','6:46 م'],
  '2026-10-05':['4:36 ص','5:41 ص','11:40 ص','3:01 م','5:39 م','6:45 م'],
  '2026-10-06':['4:36 ص','5:41 ص','11:39 ص','3:00 م','5:38 م','6:45 م'],
  '2026-10-07':['4:36 ص','5:41 ص','11:39 ص','3:00 م','5:37 م','6:44 م'],
  '2026-10-08':['4:36 ص','5:41 ص','11:39 ص','3:00 م','5:37 م','6:43 م']
};
const ids=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
function adenDateKey(){
  const p={};
  new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);
  return `${p.year}-${p.month}-${p.day}`;
}
function apply(){
  const row=schedule[adenDateKey()];
  if(!row) return;
  ids.forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=row[i];});
}
window.addEventListener('load',apply);
setTimeout(apply,0);
})();
