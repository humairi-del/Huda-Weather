/* Hada daily bulletin: preview only, no automatic sends. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.HadaDailyBulletin=api;if(root.document)api.mount(root);}})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const ZONE='Asia/Aden';
const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const range=values=>{const v=values.map(number).filter(x=>x!==null);return v.length?{min:Math.min(...v),max:Math.max(...v)}:null;};
function dayKey(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
function description(code){if(code===null)return 'وصف الأجواء غير متاح';if(code===0)return 'صحو';if(code<=3)return 'غيوم متفاوتة';if(code<=48)return 'ضباب';if(code<=67)return 'أمطار أو رذاذ';if(code<=77)return 'هطول ثلجي';if(code<=86)return 'زخات متفرقة';return 'احتمال عواصف رعدية';}
function formatDays(value){if(!Number.isInteger(value)||value<0)return 'غير متاح';if(value===1)return 'يوم واحد';if(value===2)return 'يومان';return value+' '+(value>=3&&value<=10?'أيام':'يومًا');}
function build(data,now=new Date(),calendar=null){
 const date=dayKey(now),d=data?.daily,h=data?.hourly,index=d?.time?.indexOf(date)??-1;if(index<0||!Array.isArray(h?.time))throw new Error('today-unavailable');
 const points=h.time.flatMap((time,i)=>{if(typeof time!=='string'||!time.startsWith(date+'T'))return[];const hour=Number(time.slice(11,13));if(!Number.isInteger(hour)||hour<0||hour>23)return[];return[{time,hour,temp:number(h.temperature_2m?.[i]),chance:number(h.precipitation_probability?.[i]),rain:number(h.precipitation?.[i]),wind:number(h.wind_speed_10m?.[i]),gust:number(h.wind_gusts_10m?.[i]),direction:number(h.wind_direction_10m?.[i]),code:number(h.weather_code?.[i])}];});
 if(!points.length)throw new Error('hours-unavailable');
 const bands=[['الصباح','6 ص – 12 ظهرًا',p=>p.hour>=6&&p.hour<12],['الظهر والعصر','12 ظهرًا – 6 م',p=>p.hour>=12&&p.hour<18],['المساء','6 م – 9 م',p=>p.hour>=18&&p.hour<21],['الليل','12 ص – 6 ص، و9 م – 12 ص',p=>p.hour<6||p.hour>=21]];
 const periods=bands.map(([name,hours,filter])=>{const rows=points.filter(filter),codes=rows.map(p=>p.code).filter(c=>c!==null),dominant=codes.length?codes.some(c=>c>=95)?95:codes.reduce((best,c,_,all)=>all.filter(x=>x===c).length>all.filter(x=>x===best).length?c:best,codes[0]):null;return{name,hours,count:rows.length,temp:range(rows.map(p=>p.temp)),chance:range(rows.map(p=>p.chance))?.max??null,wind:range(rows.map(p=>p.wind))?.max??null,gust:range(rows.map(p=>p.gust))?.max??null,description:description(dominant)};});
 const min=number(d.temperature_2m_min?.[index]),max=number(d.temperature_2m_max?.[index]),chance=number(d.precipitation_probability_max?.[index]),rain=number(d.precipitation_sum?.[index]),gust=number(d.wind_gusts_10m_max?.[index]);
 const upcoming=points.filter(p=>Date.parse(p.time+':00+03:00')>now.getTime()),rainCandidates=upcoming.filter(p=>p.chance!==null),best=rainCandidates.reduce((a,p)=>!a||p.chance>a.chance?p:a,null);
 const notices=[];if(points.some(p=>p.code!==null&&p.code>=95))notices.push('تظهر احتمالات عواصف رعدية في توقعات اليوم.');if(gust!==null&&gust>=40)notices.push('هبات رياح نشطة متوقعة؛ قد تبلغ '+Math.round(gust)+' كم/س.');
 const completeness=new Set(points.map(p=>p.hour)).size;
 const stars=(calendar?.observers||[]).map(o=>{const info=calendar.current(o,Date.parse(date+'T00:00:00Z'));return {name:o.id==='thay'?'الطهيبي':o.id==='qushar'?'قشعر':o.name,star:info?.name||null,remaining:info?.remaining??null};});
 const windRows=points.filter(p=>p.direction!==null&&p.direction>=0&&p.direction<=360&&p.wind!==null&&p.wind>0);let x=0,y=0,weight=0;for(const p of windRows){const rad=p.direction*Math.PI/180;x+=Math.sin(rad)*p.wind;y+=Math.cos(rad)*p.wind;weight+=p.wind;}
 const direction=weight===0?'الاتجاه غير متاح':Math.hypot(x,y)/weight<0.2?'متغيرة الاتجاه':['شمالية','شمالية شرقية','شرقية','جنوبية شرقية','جنوبية','جنوبية غربية','غربية','شمالية غربية'][Math.round((Math.atan2(x,y)*180/Math.PI+360)%360/45)%8];
 const weekday=new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long'}).format(now),hijri=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{timeZone:ZONE,day:'numeric',month:'long',year:'numeric'}).format(now);
 const pushTitle='☀️ صباح هدى';
 const pushText=[weekday+' • '+hijri,'','⭐ النجوم الزراعية',...(stars.length?stars.map(s=>s.name+': '+(s.star?s.star+' • المتبقي: '+formatDays(s.remaining):'الجدول غير متاح')):['النجوم غير متاحة حاليًا.']),'','🌤️ توقعات اليوم','🌡️ الحرارة: '+(min!==null&&max!==null?`${Math.round(min)}–${Math.round(max)}°م`:'غير متاحة'),'🌧️ احتمال المطر: '+(chance!==null?`${Math.round(chance)}٪`:'غير متاح'),'💨 الرياح: '+direction+(gust!==null?` • هبّات حتى ${Math.round(gust)} كم/س`:''),'','📍 اضغط لعرض نشرة اليوم كاملة.'].join('\n');
 return{date,generatedAt:now.toISOString(),min,max,chance,rain,gust,periods,bestRain:best,notices,complete:completeness===24,pushTitle,pushText,stars,direction};
}
function mount(w){
 const doc=w.document;if(w.location.hostname!=='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev')return;
 const txt=(tag,text,cls)=>{const e=doc.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
 const units=(v,u)=>v===null?'غير متاح':Math.round(v*10)/10+u;
 const hour=time=>new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(time+':00+03:00'));
 function start(){const app=doc.getElementById('appSection');if(!app)return;
  const card=txt('section','','card');card.id='dailyBulletinSection';card.append(txt('h2','☀️ صباح هدى','card-title'),txt('p','نشرة اليوم كاملة • الموعد المعتمد: 7:00 صباحًا بتوقيت اليمن','small-note'));
  const open=txt('button','عرض نشرة اليوم','action-btn');open.type='button';card.append(open);
  const label=txt('label','','small-note');const checkbox=doc.createElement('input');checkbox.type='checkbox';checkbox.id='dailyBulletinOptIn';label.htmlFor=checkbox.id;label.append(checkbox,doc.createTextNode(' أرغب باستقبال «صباح هدى» يوميًا، مستقلًا عن التنبيهات المهمة.'));label.style.display='block';label.style.margin='16px 0';card.append(label);
  const save=txt('button','حفظ اختياري للنشرة اليومية','action-btn');save.type='button';card.append(save);
  const state=txt('p','الإرسال الآلي مفعّل تجريبيًا لهاتف المالك المحدد فقط، الساعة 7:00 صباحًا بتوقيت اليمن. حفظ الاختيار هنا لا يضيف أجهزة أخرى إلى التجربة.','small-note');state.setAttribute('role','status');card.append(state);app.before(card);
  const modal=doc.createElement('div');modal.className='modal';modal.id='dailyBulletinModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','نشرة صباح هدى');
  const content=doc.createElement('div');content.className='modal-content';const header=doc.createElement('div');header.className='modal-header';header.append(txt('h2','☀️ صباح هدى'));
  const close=txt('button','×','close');close.type='button';close.setAttribute('aria-label','إغلاق نشرة صباح هدى');header.append(close);const pad=doc.createElement('div');pad.className='modal-pad';content.append(header,pad);modal.append(content);doc.body.append(modal);
  let inFlight=false,abort=null,renderedDate=null;
  function shut(){modal.style.display='none';doc.body.style.overflow='';abort?.abort();open.focus();}
  close.onclick=shut;modal.onclick=e=>{if(e.target===modal)shut();};doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.style.display==='block')shut();});
  async function load(){if(inFlight)return;inFlight=true;abort=new AbortController();modal.style.display='block';doc.body.style.overflow='hidden';close.focus();pad.replaceChildren(txt('p','جاري تجهيز توقعات اليوم…','small-note'));
   const timer=setTimeout(()=>abort.abort(),15000);
   try{const params=new URLSearchParams({latitude:'14.230586',longitude:'47.199415',timezone:ZONE,forecast_days:'2',hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params,{signal:abort.signal,cache:'no-store'});if(!response.ok)throw new Error('forecast-failed');const b=build(await response.json(),new Date(),w.HadaStarCalendar);if(abort.signal.aborted)return;renderedDate=b.date;
    pad.replaceChildren(txt('p',new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(b.generatedAt)),'small-note'));
    pad.append(txt('h3','ملخص اليوم'),txt('p','الصغرى '+units(b.min,'°')+' • العظمى '+units(b.max,'°')),txt('p','احتمال المطر '+units(b.chance,'٪')+' • كمية اليوم المتوقعة '+units(b.rain,' ملم')),txt('p','أقوى هبات متوقعة '+units(b.gust,' كم/س')));
    if(!b.complete)pad.append(txt('p','توقعات بعض ساعات اليوم غير متاحة؛ لا يُقدّم هذا العرض كنشرة مكتملة.','small-note'));
    for(const p of b.periods){const box=txt('section','','card');box.append(txt('h3',p.name+' • '+p.hours),txt('p',p.count?p.description:'بيانات هذه الفترة غير متاحة'),txt('p','الحرارة '+(p.temp?units(p.temp.min,'°')+' – '+units(p.temp.max,'°'):'غير متاحة')),txt('p','احتمال المطر '+units(p.chance,'٪')+' • الرياح حتى '+units(p.wind,' كم/س')));pad.append(box);}
    pad.append(txt('h3','فرصة المطر القادمة اليوم'));const r=b.bestRain;pad.append(txt('p',r?`أعلى احتمال بين الساعات القادمة ${units(r.chance,'٪')} عند ${hour(r.time)}. الكمية المتوقعة للساعة المنتهية عند هذا الوقت ${units(r.rain,' ملم')}.`:'لا توجد بيانات لساعات قادمة ضمن هذا اليوم.'));
    pad.append(txt('h3','مؤشرات تستحق الانتباه'));for(const message of b.notices.length?b.notices:['لا تظهر في هذه النشرة مؤشرات رعد أو هبات نشطة؛ تابع التنبيهات الجوية أيضًا.'])pad.append(txt('p',message));
    pad.append(txt('h3','النجوم الزراعية'));const calendar=w.HadaStarCalendar;for(const observer of calendar?.observers||[]){const info=calendar.current(observer,Date.parse(b.date+'T00:00:00Z'));pad.append(txt('p',observer.name+': '+(info?info.name+' • المتبقي: '+formatDays(info.remaining):'خارج نطاق الجدول المعتمد')));}if(!calendar)pad.append(txt('p','حساب النجوم غير متاح حاليًا.'));
    pad.append(txt('h3','معاينة نص الإشعار'),txt('p',b.pushTitle+'\n'+b.pushText,'daily-push-preview'),txt('p','هذه معاينة؛ لم يُرسل إشعار من هذه الصفحة. المصدر: توقعات Open-Meteo. التوقعات قابلة للتغيّر، والتحذيرات الرسمية مقدّمة.','small-note'),txt('p','تجهيز النشرة: '+new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(b.generatedAt)),'small-note'));
    pad.querySelector('.daily-push-preview').style.whiteSpace='pre-line';
   }catch(error){if(modal.style.display!=='none'){pad.replaceChildren(txt('p','تعذر تجهيز توقعات اليوم. لا تتوفر نشرة حديثة الآن.','small-note'));const retry=txt('button','إعادة تحميل النشرة','action-btn');retry.onclick=load;pad.append(retry);}}
   finally{clearTimeout(timer);inFlight=false;}
  }
  open.onclick=load;
  function refreshPreference(){const pref=w.HadaDailyPush?.getPreference();if(pref!==null&&pref!==undefined)checkbox.checked=pref;}
  refreshPreference();w.addEventListener('hada-push-ready',refreshPreference);
  save.onclick=async()=>{save.disabled=true;try{if(!w.HadaDailyPush)throw new Error('not-ready');await w.HadaDailyPush.setPreference(checkbox.checked);state.textContent=checkbox.checked?'تم حفظ اختيار استقبال النشرة اليومية. الإرسال الآلي التجريبي مقتصر على هاتف المالك المحدد فقط.':'تم تجهيز اختيار إيقاف النشرة اليومية. التنبيهات المهمة تحتفظ باشتراكها.';}catch(error){state.textContent=error.message==='not-subscribed'?'فعّل تنبيهات الطقس أولًا لإكمال اشتراك الهاتف، ثم احفظ اختيارك اليومي.':'تعذر تسجيل الاختيار. انتظر جاهزية خدمة الإشعارات ثم حاول مجددًا.';}finally{save.disabled=false;}};
  const refreshDate=()=>{if(modal.style.display==='block'&&renderedDate&&renderedDate!==dayKey(new Date()))load();};setInterval(refreshDate,60000);doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)refreshDate();});
  if(new URLSearchParams(w.location.search).get('bulletin')==='today')load();
 }
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});else start();
}
return{build,dayKey,formatDays,mount};
});
