// Read-only presentation of the SAME rain and hourly sea availability checks used by the hazard sender.
// Reading this endpoint never subscribes, schedules, or sends a notification.
(()=>{'use strict';
 const $=id=>document.getElementById(id),box=$('activeHazardBox');if(!box)return;
 const MAX_AGE=15*60000;let latest=null,pending=null,lastAttempt=0,local=null,timer,retryTimer,failures=0;
 function valid(data,now=Date.now()){
  if(data?.schema!=='hada-public-hazards-v2'||!Number.isFinite(data.checkedAt)||data.checkedAt>now+300000||now-data.checkedAt>MAX_AGE||typeof data.rainAvailable!=='boolean'||typeof data.seaAvailable!=='boolean')return false;
  if(data.candidate===null)return true;
  const c=data.candidate;return !!c&&['rain'].includes(c.kind)&&typeof c.title==='string'&&c.title.length<=200&&typeof c.text==='string'&&c.text.length<=2000&&typeof c.url==='string'&&((c.kind==='rain'&&data.rainAvailable)||(c.kind==='cyclone'&&data.seaAvailable));
 }
 function render(){
  const data=valid(latest)?latest:null,c=data?.candidate,localActive=local?.active===true&&Number.isFinite(local.checkedAt)&&Date.now()-local.checkedAt<90*60000;
  box.dataset.state=c||localActive?'active':!data?'unavailable':data.rainAvailable&&data.seaAvailable?'quiet':'partial';
  const quiet=data&&data.rainAvailable&&data.seaAvailable;
  $('hazardTitle').textContent=c?c.title.replace(' — اختبار طقس هدى',''):localActive?'تنبيه طقس محلي':quiet?'لا توجد تنبيهات مطر محلية حاليًا':data?'لا توجد تحديثات مكتملة للتنبيهات الآن':'لا توجد تحديثات للتنبيهات الآن';
  const detail=$('hazardMessage');detail.textContent=c?c.text:localActive?'راجع تفاصيل التنبيه أدناه.':data&&!quiet?'لا توجد تحديثات حديثة لـ '+[!data.rainAvailable?'توقعات المطر':null,!data.seaAvailable?'أجواء بحر العرب':null].filter(Boolean).join(' و')+'؛ سنعيد المحاولة تلقائيًا. غياب التحديث لا يعني عدم وجود مخاطر.':!data?'سنحاول الاتصال بالمصادر مجددًا تلقائيًا.':'';detail.hidden=!detail.textContent;
  const checked=$('hazardChecked');checked.textContent='';checked.hidden=true;
  const link=$('hazardDetails');link.hidden=!c;
  if(c){link.href=c.kind==='cyclone'?'?sea=tracking#weatherAlerts':'?map=rain#weatherAlerts';link.textContent=c.kind==='cyclone'?'عرض متابعة بحر العرب':'عرض خريطة الأمطار';}
 }
 async function refresh(force=false){
  if(pending)return pending;
  if(!force&&Date.now()-lastAttempt<5*60000){render();return;}
  clearTimeout(retryTimer);lastAttempt=Date.now();$('refreshHazards').disabled=true;
  pending=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
   let complete=false;
   try{const response=await fetch('./api/hazards',{signal:controller.signal,cache:'no-store',credentials:'same-origin'});if(!response.ok)throw Error('hazards_unavailable');const data=await response.json();if(!valid(data))throw Error('invalid_hazards');latest=data;complete=data.rainAvailable&&data.seaAvailable;render();}
   catch{render();}finally{clearTimeout(timeout);pending=null;$('refreshHazards').disabled=false;if(complete)failures=0;else{const delay=[10000,30000,60000,300000][Math.min(failures++,3)];retryTimer=setTimeout(()=>{if(!document.hidden)refresh(true);},delay);}}
  })();return pending;
 }
 async function open(){
  const modal=$('installModal');if(modal?.style.display==='block'){modal.style.display='none';document.body.style.overflow='';}
  box.classList.add('is-highlighted');clearTimeout(timer);timer=setTimeout(()=>box.classList.remove('is-highlighted'),2500);
  $('weatherAlerts').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});box.focus({preventScroll:true});
  await refresh();
 }
 $('refreshHazards').addEventListener('click',()=>{open();refresh(true);});
 $('viewWeatherAlerts')?.addEventListener('click',open);
 document.querySelector('a[href="#weatherAlerts"]')?.addEventListener('click',event=>{event.preventDefault();open();});
 const activation=$('activateUnifiedAlerts'),prior=activation?.onclick;
 if(prior)activation.onclick=async function(event){try{return await prior.call(this,event);}finally{if(['success','permission-only','subscription-ready'].includes($('unifiedAlertsStatus')?.dataset.state))await open();}};
 window.addEventListener('hada:local-hazard',event=>{local=event.detail;render();});
 local=window.HadaLiveWeather?.getHazard()||null;
 const query=new URLSearchParams(location.search);
 if(query.get('map')==='rain'||query.get('sea')==='tracking')refresh().then(()=>{if(query.get('map')==='rain')$('weatherAlerts').scrollIntoView({block:'start'});});
 window.addEventListener('online',()=>refresh(true));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},5*60000);
 window.HadaHazards={valid,refresh,open,getData:()=>valid(latest)?latest:null};
 refresh();
})();
