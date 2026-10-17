(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document&&root.location.hostname==='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev'){const start=()=>api.mount(root);if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof window==='object'?window:null,function(){
 'use strict';
 const MINUTE=60000;
 function createTask(run,{now=Date.now,allowed=()=>true,fresh=()=>false}={}){
  let busy=false,next=now()+MINUTE,last=-Infinity,failures=0;const listeners=new Set();
  return {async tick(force=false){
   const at=now();if(busy||!allowed()||at-last<10000||!force&&(at<next||fresh()))return null;
   busy=true;last=at;let ok=null;
   try{const result=await run();ok=result===null?null:result===true;return ok;}catch{ok=false;return false;}
   finally{if(ok!==null){failures=ok?0:failures+1;next=now()+(ok?15:Math.min(10,2**Math.min(failures-1,4)))*MINUTE;}else next=now()+MINUTE;busy=false;if(ok!==null)for(const listener of listeners)listener(ok);}
  },onResult:listener=>listeners.add(listener),state:()=>({busy,next,last,failures})};
 }
 function mount(w){
  const doc=w.document,available=()=>!doc.hidden&&w.navigator.onLine!==false;
  const recent=(stamp,minutes)=>{const age=Date.now()-Date.parse(stamp);return Number.isFinite(age)&&age>=0&&age<minutes*MINUTE;};
  const weather=createTask(()=>w.loadWeather(),{allowed:available,fresh:()=>!w.weatherData?._hada?.stale&&recent(w.weatherData?._hada?.fetchedAt,15)});
  const models=createTask(()=>{w.modelsLastSuccess=0;return w.loadModels();},{allowed:()=>available()&&doc.getElementById('modelsModal')?.style.display==='block',fresh:()=>Date.now()-(w.modelsLastSuccess||0)<15*MINUTE});
  const satellite=createTask(()=>w.refreshHadaSatellite?.(),{allowed:()=>available()&&doc.querySelector('#hadaLiveMap [data-layer="satellite"][aria-pressed="true"]'),fresh:()=>Date.now()-(w.satelliteLastSuccess||0)<15*MINUTE});
  const tasks=[weather,models,satellite];
  const tick=()=>{for(const task of tasks)void task.tick();};
  w.addEventListener('online',tick);doc.addEventListener('visibilitychange',tick);w.setInterval(tick,MINUTE);
  const addButton=(parent,label,task)=>{if(!parent)return;const button=doc.createElement('button');button.type='button';button.className='action-btn';button.textContent=label;button.style.marginTop='12px';const status=doc.createElement('p');status.className='small-note';status.setAttribute('role','status');task.onResult(ok=>{status.textContent=ok?'اكتمل التحديث.':'تعذر جلب تحديث مكتمل؛ ستتكرر المحاولة تلقائيًا.';});button.onclick=async()=>{if(task.state().busy){status.textContent='يوجد تحديث جارٍ؛ انتظر النتيجة.';return;}button.disabled=true;status.textContent='جاري التحديث…';try{const ok=await task.tick(true);if(ok===null)status.textContent=w.navigator.onLine===false?'لا يوجد اتصال حاليًا؛ ستتكرر المحاولة عند عودته.':'يوجد طلب تحديث قريب؛ انتظر قليلًا.';}finally{button.disabled=false;}};parent.append(button,status);};
  addButton(doc.getElementById('weatherCombined'),'تحديث بيانات الطقس',weather);
  addButton(doc.querySelector('#modelsModal .modal-pad'),'تحديث مقارنة الموديلات',models);
 }
 return {createTask,mount};
});
