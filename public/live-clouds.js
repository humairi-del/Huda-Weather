(()=>{'use strict';
const frame=document.getElementById('windyLiveMap'),button=document.getElementById('refreshLiveClouds'),status=document.getElementById('liveCloudRefreshStatus');if(!frame||!button||!status)return;
const host=frame.parentElement,interval=15*60000;let last=0,pending=false,timer=null,failed=false;
const fallback=document.createElement('p');fallback.className='small-note';fallback.style.padding='20px';fallback.id='liveCloudFallback';host.appendChild(fallback);
function unavailable(message){clearTimeout(timer);pending=false;failed=true;frame.style.display='none';host.style.height='auto';fallback.hidden=false;fallback.textContent=message+' افتح صور السحب في Windy من الزر أعلاه.';status.textContent='لم يُتحقق من وقت التقاط الصور؛ لا تُعد هذه حالة طقس هادئة.';}
function graphicsSupported(){try{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
function refresh(){
 if(pending||Date.now()-last<10000)return;last=Date.now();
 if(navigator.onLine===false){unavailable('تعذر عرض السحب مع انقطاع الاتصال.');return;}
 if(!graphicsSupported()){unavailable('هذا المتصفح لا يدعم عرض صور السحب داخل الموقع.');return;}
 failed=false;pending=true;fallback.hidden=false;fallback.textContent='جارٍ فتح صور السحب من المصدر…';frame.style.display='block';host.style.height='';status.textContent='وقت التقاط الصورة يحدده المصدر؛ طلب العرض ليس إثباتًا لوصول صورة أحدث.';
 const url=new URL(frame.dataset.src);url.searchParams.set('product','ecmwf');url.searchParams.set('overlay','satellite');url.searchParams.set('_refresh',String(last));timer=setTimeout(()=>unavailable('تعذر التحقق من تحميل عرض السحب.'),20000);frame.src=url.href;
}
frame.addEventListener('load',()=>{if(!pending)return;try{if(frame.contentWindow.location.href==='about:blank')return;}catch{}clearTimeout(timer);pending=false;fallback.hidden=true;status.textContent='تحقق من وقت التقاط الصورة داخل Windy. إذا لم تظهر الصور أو ظهرت الرياح، افتح العرض الأصلي من الزر أعلاه.';});
frame.addEventListener('error',()=>unavailable('تعذر عرض صور السحب من المصدر.'));
button.addEventListener('click',()=>{last=0;refresh();});
function resume(){if(!document.hidden&&!failed&&Date.now()-last>=interval)refresh();}
setInterval(resume,interval);document.addEventListener('visibilitychange',resume);window.addEventListener('online',()=>{last=0;refresh();});refresh();
})();
