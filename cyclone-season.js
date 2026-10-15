/* Arabian Sea seasonal desk — preview only; no alert sends or tracking. */
(function(){
'use strict';
if(location.hostname!=='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev')return;
const ZONE='Asia/Aden';let busy=false,lastLoad=0;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const date=(value,time=false)=>new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,year:'numeric',month:'long',day:'numeric',...(time?{hour:'numeric',minute:'2-digit',hour12:true}:{})}).format(new Date(value));
const link=(text,url)=>{const a=el('a',text,'official-btn cyclone-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function start(){
 const sea=document.querySelector('#seaModal .sea-content');if(!sea)return;
 const desk=el('section','','cyclone-desk');desk.id='cycloneSeason';desk.setAttribute('aria-label','متابعة موسم الأعاصير');
 const title=el('h3','🌀 متابعة موسم الأعاصير');desk.append(title,el('p','بحر العرب • سقطرى • سواحل اليمن وشبوة','small-note'));
 const observer=el('section','','cyclone-panel');observer.append(el('h4','تحديث الراصد محمد علي عبدالرحمن'));
 const observerState=el('p','جاري تحميل التحديث المحفوظ…','small-note');observerState.setAttribute('role','status');observer.append(observerState);desk.append(observer);
 const official=el('section','','cyclone-panel');official.append(el('h4','النشرات والمسارات الرسمية'));
 const status=el('p','تُجلب روابط النشرات عند فتح بحر العرب.','small-note');status.setAttribute('role','status');
 const refresh=el('button','تحديث روابط النشرات','action-btn');refresh.type='button';const reports=el('div','','cyclone-links');official.append(status,refresh,reports,link('فتح مركز الأعاصير الرسمي ↗','https://rsmcnewdelhi.imd.gov.in/'));desk.append(official);
 const maps=el('details','','cyclone-panel');maps.append(el('summary','خرائط الموديلات والرياح'));
 maps.append(el('p','استعرض الرياح والضغط وتقدم الساعات داخل Windy لمقارنة تطور التوقع. هذه الخرائط لا تمثل مسارًا رسميًا، واتجاه الرياح لا يحدد وحده اتجاه حركة الحالة.','small-note'));
 maps.append(link('فتح خرائط بحر العرب في Windy ↗','https://www.windy.com/?wind,14,60,4'));desk.append(maps);
 desk.append(el('p','الاحتمال البعيد ليس إعلان إعصار أو موعد وصوله. لا يظهر اسم حالة أو مسار أو تأثير محلي مؤكد إلا مع مصدر مؤرخ يدعمه. تعذر جلب المصدر لا يعني عدم وجود خطر.','sea-note'));
 sea.prepend(desk);
 async function loadObserver(){try{
  const r=await fetch('/cyclone-season-data.json?v=20261015-1',{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();
  const age=Date.now()-Date.parse(d.reviewedAt);observerState.textContent=age>48*3600000?'تحديث سابق — راجع آخر منشورات الراصد.':'تحديث محفوظ من صورة أرسلها مالك الموقع.';
  const timing=el('details');timing.append(el('summary','مصدر التحديث وتوقيته'));observer.append(el('p',d.summary),el('p',d.track,'small-note'));timing.append(el('p','تشغيل الموديل: '+date(d.modelRunAt,true)+' • '+d.model,'small-note'),el('p','الخريطة صالحة لـ: '+date(d.chartValidAt,true),'small-note'),el('p','مراجعة الملخص: '+date(d.reviewedAt,true)+'؛ وقت نشر المنشور غير محدد بدقة.','small-note'),el('p',d.attribution,'small-note'));observer.append(timing,link('فتح حساب الراصد وآخر منشوراته ↗',d.profile));
 }catch{observerState.textContent='تعذر تحميل ملخص الراصد؛ يمكنك فتح حسابه مباشرة.';observer.append(link('فتح حساب محمد علي عبدالرحمن ↗','https://www.facebook.com/100002148432799/'));}}
 async function loadSources(force=false){if(busy||!force&&Date.now()-lastLoad<900000)return;busy=true;refresh.disabled=true;status.textContent='جاري جلب روابط النشرات الرسمية…';reports.replaceChildren();
  try{const r=await fetch('/api/cyclone-sources',{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.reports)||!data.reports.length)throw Error();
   for(const report of data.reports){const box=el('div','','cyclone-report');box.append(link(report.label+' ↗',report.url));let note=report.issuedAt?'تاريخ المصدر: '+date(report.issuedAt,true):report.date?'التاريخ في رابط المصدر: '+date(report.date):report.id==='interactive'?'خريطة مباشرة؛ راجع وقت التحديث داخلها.':'تاريخ الإصدار غير ظاهر؛ راجعه داخل النشرة.';if(report.stale)note+=' • تحديث سابق؛ قد لا يعكس أحدث المستجدات.';if(report.dateUncertain&&report.date)note+=' • التاريخ يحتاج تحققًا.';box.append(el('p',note,'small-note'));if(report.noTrackFile)box.append(el('p','صفحة المصدر تعرض ملف «لا يوجد إعصار» بدل خريطة مسار؛ راجع أحدث نشرة مؤرخة.','small-note'));reports.append(box);}
   status.textContent='آخر جلب لروابط المصدر: '+date(data.checkedAt,true)+' • '+data.source+'؛ تواريخ النشرات موضحة أسفل الروابط.';lastLoad=Date.now();
  }catch{status.textContent='تعذر جلب روابط النشرات الآن. لا يمكن تأكيد الحالة الرسمية من هذا القسم؛ افتح المركز الرسمي أو حاول مجددًا.';}
  finally{busy=false;refresh.disabled=false;}
 }
 refresh.onclick=()=>loadSources(true);
 const oldOpen=window.openSea;window.openSea=function(){oldOpen?.();loadSources();};
 loadObserver();
 if(document.getElementById('seaModal').style.display==='block')loadSources();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
