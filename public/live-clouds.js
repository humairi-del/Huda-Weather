(()=>{'use strict';
const frame=document.getElementById('windyLiveMap'),button=document.getElementById('refreshLiveClouds'),status=document.getElementById('liveCloudRefreshStatus');
if(!frame||!button)return;
const clouds=document.getElementById('showLiveClouds'),rain=document.getElementById('showRainAccumulation'),link=document.getElementById('liveMapExternal'),description=document.getElementById('liveMapDescription'),title=document.getElementById('mapHubTitle');
const INTERVAL=15*60*1000;
let mode='satellite',lastRequest=Date.now();
function refresh(){
 if(navigator.onLine===false){if(status)status.textContent='اتصل بالإنترنت لتحديث الخريطة.';return;}
 const url=new URL('https://embed.windy.com/embed.html');
 url.search=new URLSearchParams({type:'map',location:'coordinates',zoom:'7',overlay:mode,product:mode==='satellite'?'satellite':'ecmwf',level:'surface',lat:'14.230586',lon:'47.199415',metricRain:'mm',message:'true',calendar:'now'});
 // Request current provider data instead of replaying a dated local drawing.
 url.searchParams.set('_refresh',String(Date.now()));lastRequest=Date.now();frame.src=url.href;
 if(status)status.textContent='جارٍ طلب أحدث خريطة…';
}
frame.addEventListener('load',()=>{if(status)status.textContent='آخر تحميل للخريطة: '+new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(lastRequest))+' — راجع وقت البيانات داخل الخريطة.';});
function select(next){
 if(next===mode)return;mode=next;
 clouds?.setAttribute('aria-pressed',String(mode==='satellite'));rain?.setAttribute('aria-pressed',String(mode==='rainAccu'));
 const satellite=mode==='satellite';
 if(title)title.textContent=satellite?'🛰️ صور السحب الحية':'🌧️ تراكم الأمطار المتوقع';
 if(description)description.textContent=satellite?'تابع حركة السحب فوق هدى وحبان وشبوة وبحر العرب. اضغط تشغيل داخل الخريطة لمشاهدة الحركة.':'تراكم الأمطار المتوقع من الموديل الأوروبي. اختر فترة التراكم داخل الخريطة؛ الألوان توقعات وليست أمطارًا مرصودة.';
 frame.title=satellite?'صور السحب الحية فوق هدى وحبان وشبوة من Windy':'تراكم الأمطار المتوقع من Windy';
 if(link){link.href='https://www.windy.com/?'+mode+',14.231,47.199,7';link.textContent=satellite?'فتح حركة السحب مباشرة ↗':'فتح خريطة تراكم الأمطار ↗';}refresh();
}
button.addEventListener('click',refresh);clouds?.addEventListener('click',()=>select('satellite'));rain?.addEventListener('click',()=>select('rainAccu'));
function resume(){if(!document.hidden&&Date.now()-lastRequest>=INTERVAL)refresh();}
document.addEventListener('visibilitychange',resume);window.addEventListener('online',()=>{if(!document.hidden)refresh();});setInterval(resume,INTERVAL);
})();
