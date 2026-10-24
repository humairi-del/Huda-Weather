/* Hada daily bulletin: preview only, no automatic sends. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./weather-core.js'),require('./star-calendar.js'));else root.HadaDailyBulletin=factory(root.HadaWeatherCore,root.HadaStarCalendar);})(typeof window==='undefined'?globalThis:window,function(C,defaultCalendar){
'use strict';
const ZONE='Asia/Aden';
const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const range=values=>{const v=values.map(number).filter(x=>x!==null);return v.length?{min:Math.min(...v),max:Math.max(...v)}:null;};
function dayKey(now){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
function description(code){if(code===null)return 'وصف الأجواء غير متاح';if(code===0)return 'صحو';if(code<=3)return 'غيوم متفاوتة';if(code<=48)return 'ضباب';if(code<=67)return 'أمطار أو رذاذ';if(code<=77)return 'هطول ثلجي';if(code<=86)return 'زخات متفرقة';return 'احتمال عواصف رعدية';}
function formatDays(value){if(!Number.isInteger(value)||value<0)return 'غير متاح';if(value===1)return 'يوم واحد';if(value===2)return 'يومان';return value+' '+(value>=3&&value<=10?'أيام':'يومًا');}
function build(data,now=new Date(),calendar=defaultCalendar){
 const date=dayKey(now),d=data?.daily,h=data?.hourly,index=d?.time?.indexOf(date)??-1;if(index<0||!Array.isArray(h?.time))throw new Error('today-unavailable');
 const points=h.time.flatMap((time,i)=>{if(typeof time!=='string'||!time.startsWith(date+'T'))return[];const hour=Number(time.slice(11,13));if(!Number.isInteger(hour)||hour<0||hour>23)return[];return[{time,hour,temp:number(h.temperature_2m?.[i]),chance:number(h.precipitation_probability?.[i]),rain:number(h.precipitation?.[i]),wind:number(h.wind_speed_10m?.[i]),gust:number(h.wind_gusts_10m?.[i]),direction:number(h.wind_direction_10m?.[i]),code:number(h.weather_code?.[i])}];});
 if(!points.length)throw new Error('hours-unavailable');
 const bands=[['الصباح','6 ص – 12 ظهرًا',p=>p.hour>=6&&p.hour<12],['الظهر والعصر','12 ظهرًا – 6 م',p=>p.hour>=12&&p.hour<18],['المساء','6 م – 9 م',p=>p.hour>=18&&p.hour<21],['الليل','12 ص – 6 ص، و9 م – 12 ص',p=>p.hour<6||p.hour>=21]];
 const periods=bands.map(([name,hours,filter])=>{const rows=points.filter(filter),codes=rows.map(p=>p.code).filter(c=>c!==null),dominant=codes.length?codes.some(c=>c>=95)?95:codes.reduce((best,c,_,all)=>all.filter(x=>x===c).length>all.filter(x=>x===best).length?c:best,codes[0]):null;return{name,hours,count:rows.length,temp:range(rows.map(p=>p.temp)),chance:range(rows.map(p=>p.chance))?.max??null,wind:range(rows.map(p=>p.wind))?.max??null,gust:range(rows.map(p=>p.gust))?.max??null,description:description(dominant)};});
 const min=number(d.temperature_2m_min?.[index]),max=number(d.temperature_2m_max?.[index]),chance=number(d.precipitation_probability_max?.[index]),rain=number(d.precipitation_sum?.[index]),gust=points.length===24&&points.every(p=>p.gust!==null&&p.gust>=0)?Math.max(...points.map(p=>p.gust)):null;
 const upcoming=points.filter(p=>C.stamp(p.time)+C.HOUR>now.getTime()),rainCandidates=upcoming.filter(p=>p.chance!==null),best=rainCandidates.reduce((a,p)=>!a||p.chance>a.chance?p:a,null);
 const notices=[];if(points.some(p=>p.code!==null&&p.code>=95))notices.push('تظهر احتمالات عواصف رعدية في توقعات اليوم.');if(gust!==null&&gust>=40)notices.push('هبات رياح نشطة متوقعة؛ قد تبلغ '+Math.round(gust)+' كم/س.');
 const completeness=new Set(points.map(p=>p.hour)).size;
 const stars=(calendar?.observers||[]).map(o=>{const info=calendar.current(o,Date.parse(date+'T00:00:00Z'));return {name:o.id==='thay'?'الطهيبي':o.id==='qushar'?'قشعر':o.name,star:info?.name||null,remaining:info?.remaining??null,elapsed:info?.elapsed??null};});
 const windRows=points.filter(p=>p.direction!==null&&p.direction>=0&&p.direction<=360&&p.wind!==null&&p.wind>0);let x=0,y=0,weight=0;for(const p of windRows){const rad=p.direction*Math.PI/180;x+=Math.sin(rad)*p.wind;y+=Math.cos(rad)*p.wind;weight+=p.wind;}
 const direction=weight===0?'الاتجاه غير متاح':Math.hypot(x,y)/weight<0.2?'متغيرة الاتجاه':['شمالية','شمالية شرقية','شرقية','جنوبية شرقية','جنوبية','جنوبية غربية','غربية','شمالية غربية'][Math.round((Math.atan2(x,y)*180/Math.PI+360)%360/45)%8];
 const weekday=new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long'}).format(now),hijri=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{timeZone:ZONE,day:'numeric',month:'long',year:'numeric'}).format(now);
 const pushTitle='☀️ صباح هدى';
 const pushText=[weekday+' • '+hijri,'','⭐ النجوم الزراعية',...(stars.length?stars.map(s=>s.name+': '+(s.star?s.star+' • المتبقي: '+formatDays(s.remaining):'الجدول غير متاح')):['النجوم غير متاحة حاليًا.']),'','🌤️ توقعات اليوم','🌡️ الحرارة: '+(min!==null&&max!==null?`${Math.round(min)}–${Math.round(max)}°م`:'غير متاحة'),'🌧️ احتمال المطر: '+(chance!==null?`${Math.round(chance)}٪`:'غير متاح'),'💨 الرياح: '+direction+(gust!==null?` • هبّات حتى ${Math.round(gust)} كم/س`:''),'','📍 اضغط لعرض نشرة اليوم كاملة.'].join('\n');
 return{date,generatedAt:now.toISOString(),min,max,chance,rain,gust,periods,bestRain:best,notices,complete:C.isFresh(data,now.getTime())&&completeness===24&&points.length===24&&points.every(p=>p.temp!==null&&C.prob(p.chance)&&p.code!==null&&p.wind!==null&&p.wind>=0&&p.gust!==null&&p.gust>=0&&p.direction!==null&&p.direction>=0&&p.direction<=360)&&min!==null&&max!==null&&min<=max&&C.prob(chance),pushTitle,pushText,stars,direction};
}
return{build,dayKey,formatDays};
});
