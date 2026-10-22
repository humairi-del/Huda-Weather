/* Shared, deterministic weather presentation. No network, credentials or UI. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HadaWeatherCore=factory();})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const ZONE='Asia/Aden',DAY=86400000,HOUR=3600000;
const finite=v=>typeof v==='number'&&Number.isFinite(v),prob=v=>finite(v)&&v>=0&&v<=100;
const dayKey=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const stamp=s=>Date.parse(s+(s.length===10?'T12:00:00+03:00':'+03:00'));
const weekday=s=>new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long'}).format(new Date(stamp(s)));
const number=(v,digits=0)=>finite(v)?new Intl.NumberFormat('ar-YE-u-nu-arab',{maximumFractionDigits:digits}).format(v):'—';
function description(c){return c===0?'صحو':c===1?'صحو غالبًا':c===2?'غائم جزئيًا':c===3?'غائم':[45,48].includes(c)?'ضباب':[51,53,55,56,57].includes(c)?'رذاذ':[61,80].includes(c)?'أمطار خفيفة':[63,81].includes(c)?'أمطار متوسطة':[65,82].includes(c)?'أمطار غزيرة':[95,96,99].includes(c)?'أمطار رعدية':[71,73,75,77,85,86].includes(c)?'هطول ثلجي':'البيانات غير مكتملة';}
function direction(v){return finite(v)&&v>=0&&v<=360?['شمالية','شمالية شرقية','شرقية','جنوبية شرقية','جنوبية','جنوبية غربية','غربية','شمالية غربية'][Math.round(v/45)%8]:'الاتجاه غير متاح';}
function isFresh(d,now=Date.now()){return d?.engine?.schema==='hada-weather-engine-v1'&&finite(d.engine.fetchedAt)&&d.engine.fetchedAt<=now+300000&&now-d.engine.fetchedAt<45*60000&&d.daily?.time?.[0]===dayKey(now);}
function bestWeek(d,now=Date.now()){
 if(!isFresh(d,now))return null;let best=null;
 // Today's daily chance describes the whole day, including hours already past.
 for(let i=0;i<Math.min(7,d.daily.time.length);i++){const chance=d.daily.precipitation_probability_max?.[i];if(!prob(chance))continue;if(!best||chance>best.chance)best={day:d.daily.time[i],chance,description:description(d.daily.weather_code?.[i])};}return best;
}
function stars(calendar,now=Date.now()){
 const date=dayKey(now),today=Date.parse(date+'T00:00:00Z');return (calendar?.observers||[]).map(o=>{const s=calendar.current(o,today);return {name:o.name,star:s?.name||'الجدول غير متاح',elapsed:s?.elapsed??null,remaining:s?.remaining??null};});
}
const reflections=['اجعل لك في كل يوم نصيبًا من الذكر وفعل الخير.','الكلمة الطيبة صدقة، فاختر من القول أحسنه.','بالصبر وحسن الظن بالله تهون مشاق الطريق.','اشكر الله على النعم، وأحسن إلى من حولك.','برّ الوالدين باب خير لا يغلقه انشغال الحياة.','اجعل الإخلاص أساس عملك، وإن قلّ.','من أجمل القربات جبر خاطر وإدخال سرور.','ابدأ يومك بنية صالحة، واختمه باستغفار.','ارفق بالناس؛ فلكل إنسان ما يشغله.','لا تستصغر معروفًا تستطيع فعله اليوم.','صل رحمك، وادع لأهلك وأحبابك بخير.','للطمأنينة أبواب؛ منها الصلاة والدعاء والذكر.','العفو يريح القلب، والإحسان يترك أثرًا طيبًا.','حسن الخلق زينة لا تبلى مع الأيام.'];
function reflection(now=Date.now()){return reflections[((Math.floor(Date.parse(dayKey(now)+'T00:00:00Z')/DAY)%reflections.length)+reflections.length)%reflections.length];}
function ramadan(now=Date.now()){
 const formatter=new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura',{timeZone:ZONE,month:'numeric',day:'numeric'}),base=stamp(dayKey(now));
 const part=t=>Object.fromEntries(formatter.formatToParts(new Date(t)).map(x=>[x.type,x.value]));if(+part(base).month===9)return {active:true,days:0};
 for(let i=1;i<=370;i++){const p=part(base+i*DAY);if(+p.month===9&&+p.day===1)return {active:false,days:i};}return null;
}
function cardData(d,calendar,now=Date.now()){
 const valid=isFresh(d,now),i=valid?d.daily.time.indexOf(dayKey(now)):-1,c=valid?d.current:null;
 return {day:dayKey(now),min:i>=0?d.daily.temperature_2m_min[i]:null,max:i>=0?d.daily.temperature_2m_max[i]:null,chance:i>=0&&prob(d.daily.precipitation_probability_max[i])?d.daily.precipitation_probability_max[i]:null,code:i>=0?d.daily.weather_code[i]:null,wind:c?.wind_speed_10m??null,direction:direction(c?.wind_direction_10m),humidity:c?.relative_humidity_2m??null,best:bestWeek(d,now),stars:stars(calendar,now),reflection:reflection(now),ramadan:ramadan(now),fresh:valid};
}
function alerts(d,now=Date.now()){
 if(!isFresh(d,now))return {items:[],complete:false,missing:['الطقس']};
 const h=d.hourly,days=d.daily.time.slice(0,3),items=[],groups=new Map();let complete=true;
 function add(kind,i,text,severity){const day=h.time[i].slice(0,10),key=kind+day;const existing=groups.get(key);if(existing){existing.end=h.time[i];return;}const item={kind,day,time:h.time[i],end:h.time[i],text,severity};groups.set(key,item);items.push(item);}
 let count=0;
 for(let i=0;i<h.time.length;i++){
  if(!days.includes(h.time[i].slice(0,10))||stamp(h.time[i])+HOUR<=now)continue;count++;
  const temp=h.temperature_2m?.[i],code=h.weather_code?.[i];if(!finite(temp)||!finite(code))complete=false;
  if(finite(temp)&&temp<15)add('cold',i,'انخفاض الحرارة إلى '+number(temp)+'°',2);
  if(finite(temp)&&temp>40)add('hot',i,'ارتفاع الحرارة إلى '+number(temp)+'°',2);
  if([95,96,99].includes(code))add('thunder',i,code===99?'عواصف رعدية قد يصحبها برد قوي':code===96?'عواصف رعدية قد يصحبها برد':'فرص عواصف رعدية',code===99?3:2);
 }
 const dust=d.engine.dust;let dustComplete=!!dust?.hourly?.time;let dustCount=0;
 if(dustComplete)for(let i=0;i<dust.hourly.time.length;i++){const time=dust.hourly.time[i];if(!days.includes(time.slice(0,10))||stamp(time)+HOUR<=now)continue;dustCount++;const v=dust.hourly.dust?.[i];if(!finite(v)||v<0){dustComplete=false;continue;}if(v>=150){const j=h.time.indexOf(time),wind=h.wind_speed_10m?.[j];if(finite(wind)&&wind>=20)add('dust',j,'غبار صحراوي ورياح نشطة متوقعة',v>=300?3:2);}}
 const missing=[];const expected=Math.ceil((stamp(days[2])+12*HOUR-Math.floor(now/HOUR)*HOUR)/HOUR);if(!complete||count!==expected)missing.push('بعض ساعات الطقس');if(!dustComplete||dustCount!==expected)missing.push('الغبار');
 items.sort((a,b)=>stamp(a.time)-stamp(b.time)||b.severity-a.severity);return {items,complete:missing.length===0,missing};
}
return {ZONE,DAY,HOUR,finite,prob,dayKey,stamp,weekday,number,description,direction,isFresh,bestWeek,stars,reflection,ramadan,cardData,alerts};
});
