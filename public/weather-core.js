/* Shared, deterministic weather presentation. No network, credentials or UI. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./sandstorm.js'),require('./winter-weather.js'));else root.HadaWeatherCore=factory(root.HadaSandstorm,root.HadaWinterWeather);})(typeof window==='undefined'?globalThis:window,function(Sandstorm,Winter){
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
// Reject late responses and upgrades from an older forecast valid time.
function currentFresh(d,now=Date.now()){const t=stamp(d?.current?.time||'');return Number.isFinite(t)&&t<=now+300000&&now-t<=90*60000;}
function acceptNewer(previous,next){
 if(!next?.engine)return false;if(!previous?.engine)return true;
 const a=previous.engine,b=next.engine,ta=stamp(previous.current?.time||''),tb=stamp(next.current?.time||'');
 if(Number.isFinite(ta)&&Number.isFinite(tb)&&tb<ta)return false;
 if(b.fetchedAt<a.fetchedAt)return false;
 if(b.fetchedAt===a.fetchedAt&&a.enrichment==='complete'&&b.enrichment!=='complete')return false;
 return true;
}
// Owner-approved display criterion: first eligible hour >=20%; never an emergency trigger.
function nearestRain(d,now=Date.now(),minimum=20){
 if(!isFresh(d,now)||!prob(minimum)||minimum<=0)return {state:'unavailable'};
 const h=d.hourly;if(!Array.isArray(h?.time)||h.precipitation_probability?.length!==h.time.length)return {state:'unavailable'};
 let missing=false,remaining=0,expected=Math.floor(now/HOUR)*HOUR;
 for(let i=0;i<h.time.length;i++){
  const start=stamp(h.time[i]);if(!Number.isFinite(start)||start+HOUR<=now)continue;remaining++;if(start!==expected)missing=true;expected=start+HOUR;
  const chance=h.precipitation_probability[i];if(!prob(chance)){missing=true;continue;}
  if(chance>=minimum)return missing?{state:'partial',candidate:{start,end:start+HOUR,chance}}:{state:'found',start,end:start+HOUR,chance};
 }
 return {state:!remaining||missing?'unavailable':'none',until:h.time.at(-1)};
}
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
// All 24 forecast hours of the Yemen calendar day, including hours already past.
// Never substitute a current observation or tomorrow's hours for a missing value.
function dayWeather(d,day){
 const h=d?.hourly,indices=Array.from({length:24},(_,i)=>h?.time?.indexOf(day+'T'+String(i).padStart(2,'0')+':00')??-1);
 const values=(key,valid)=>indices.every(i=>i>=0&&valid(h[key]?.[i]))?indices.map(i=>h[key][i]):null;
 const humidity=values('relative_humidity_2m',v=>finite(v)&&v>=0&&v<=100),wind=values('wind_speed_10m',v=>finite(v)&&v>=0),angles=values('wind_direction_10m',v=>finite(v)&&v>=0&&v<=360);
 const range=rows=>rows?{min:Math.min(...rows),max:Math.max(...rows)}:null;
 let prevailing='الاتجاه غير متاح';
 if(wind&&angles){const total=wind.reduce((a,b)=>a+b,0),x=wind.reduce((a,v,i)=>a+v*Math.sin(angles[i]*Math.PI/180),0),y=wind.reduce((a,v,i)=>a+v*Math.cos(angles[i]*Math.PI/180),0);prevailing=total===0?'ساكنة':Math.hypot(x,y)/total<.25?'متغيرة':direction((Math.atan2(x,y)*180/Math.PI+360)%360);}
 const mean=rows=>rows?rows.reduce((sum,v)=>sum+v,0)/rows.length:null;
 return {humidity:range(humidity),wind:range(wind),humidityMean:mean(humidity),windMean:mean(wind),direction:prevailing};
}
function cardData(d,calendar,now=Date.now()){
 const day=dayKey(now),valid=isFresh(d,now),i=valid?d.daily.time.indexOf(day):-1,summary=dayWeather(valid?d:null,day),winter=Winter?.assess(d,now),start=stamp(day)-12*HOUR,end=start+DAY,all=valid?alerts(d,now):{items:[]},candidates=[...(winter?.events||[]),...all.items.filter(e=>!e.winterEvent).map(e=>({...e,start:stamp(e.time),end:stamp(e.end)+HOUR,peakStart:null,peakEnd:null})),...(all.sandstorm?.events||[]).map(e=>({...e,text:e.type==='possible_sandstorm'?'احتمال عاصفة رملية؛ التوقيت تقديري':'احتمال غبار مثار؛ التوقيت تقديري',peakStart:null,peakEnd:null}))],alert=candidates.filter(e=>e.start<end&&e.end>Math.max(start,now)).sort((a,b)=>b.severity-a.severity||a.start-b.start)[0]||null;let feelsLike=null;if(alert)for(let j=0;j<(d?.hourly?.time?.length||0);j++){const t=stamp(d.hourly.time[j]);if(t>=Math.max(start,alert.start)&&t<Math.min(end,alert.end)&&t+HOUR>now){const v=Winter.windChill(d.hourly.temperature_2m?.[j],d.hourly.wind_speed_10m?.[j]);if(finite(v))feelsLike=feelsLike===null?v:Math.min(feelsLike,v);}}
 return {day,winter,cardAlert:alert?{...alert,start:Math.max(start,alert.start),end:Math.min(end,alert.end),feelsLike}:null,min:i>=0?d.daily.temperature_2m_min[i]:null,max:i>=0?d.daily.temperature_2m_max[i]:null,chance:i>=0&&prob(d.daily.precipitation_probability_max[i])?d.daily.precipitation_probability_max[i]:null,code:i>=0?d.daily.weather_code[i]:null,...summary,best:bestWeek(d,now),stars:stars(calendar,now),reflection:reflection(now),ramadan:ramadan(now),fresh:valid};
}
function sandstormForecast(d,now=Date.now()){return Sandstorm?Sandstorm.assess(d,now):{schema:'huda-sandstorm-screen-v1',state:'unavailable',events:[],missing:['screen_unavailable']};}
function alerts(d,now=Date.now()){
 if(!isFresh(d,now))return {items:[],complete:false,missing:['الطقس'],winter:Winter?.assess(d,now)};
 const h=d.hourly,items=[],groups=new Map(),winter=Winter?.assess(d,now);let complete=true,held=false,count=0,previousHour=null;
 function add(kind,i,text,severity){const day=h.time[i].slice(0,10),key=kind+day,prior=groups.get(key);if(prior&&stamp(prior.end)+HOUR===stamp(h.time[i])){prior.end=h.time[i];return;}const item={kind,day,time:h.time[i],end:h.time[i],text,severity};groups.set(key,item);items.push(item);}
 function candidate(kind,i,text,severity){if(Winter&&!Winter.support(d,i,kind,now).allowed){held=true;return;}add(kind,i,text,severity);}
 for(let i=0;i<(h?.time?.length||0);i++){
  const t=stamp(h.time[i]);if(!Number.isFinite(t)||t+HOUR<=now)continue;if(previousHour===null?t>now:t!==previousHour+HOUR)complete=false;previousHour=t;count++;
  const temp=h.temperature_2m?.[i],code=h.weather_code?.[i];if(!finite(temp)||!finite(code))complete=false;
  const inDrop=winter?.events.some(e=>(e.components.includes('temperature_drop')||e.cool)&&e.start<=t&&e.end>t);
  if(finite(temp)&&temp<15&&!inDrop)candidate('cold',i,'برودة متوقعة؛ الحرارة '+number(temp)+'°',2);
  if(finite(temp)&&temp>40)candidate('hot',i,'ارتفاع الحرارة إلى '+number(temp)+'°',2);
  if([95,96,99].includes(code))candidate('thunder',i,code===99?'عواصف رعدية قد يصحبها برد قوي':code===96?'عواصف رعدية قد يصحبها برد':'فرص عواصف رعدية',code===99?3:2);
  else if([65,82].includes(code)||finite(h.precipitation?.[i])&&h.precipitation[i]>=7.5)candidate('rain',i,'فرص أمطار غزيرة؛ انتبه لمجاري السيول',2);
 }
 const dust=d.engine.dust,central=d.engine.centralSchema==='hada-rasid-v1',sandstorm=central?sandstormForecast(d,now):null;let dustComplete=!!dust?.hourly?.time?.length,dustCount=0;
 if(!central&&dustComplete)for(let i=0;i<dust.hourly.time.length;i++){const time=dust.hourly.time[i];if(stamp(time)+HOUR<=now)continue;dustCount++;const v=dust.hourly.dust?.[i];if(!finite(v)||v<0){dustComplete=false;continue;}if(v>=150){const j=h.time.indexOf(time),wind=h.wind_speed_10m?.[j];if(!finite(wind))dustComplete=false;if(j>=0&&finite(wind)&&wind>=20)add('dust',j,'غبار صحراوي ورياح نشطة متوقعة',v>=300?3:2);}}
 const missing=[];if(!complete||!count)missing.push('بعض ساعات الطقس');if(held)missing.push('دعم النماذج للفترات البعيدة');if(central){if(!sandstorm||['unavailable','partial'].includes(sandstorm.state))missing.push('تقدير العاصفة الرملية');}else if(!dustComplete||!dustCount)missing.push('الغبار');
 if(winter){missing.push(...winter.missing);for(const e of winter.events){const local=t=>new Date(t+3*HOUR).toISOString().slice(0,16);items.push({...e,time:local(e.start),end:local(e.end-HOUR),day:dayKey(e.start),text:e.text,winterEvent:e});}}
 items.sort((a,b)=>stamp(a.time)-stamp(b.time)||b.severity-a.severity);return {items,complete:missing.length===0,missing:[...new Set(missing)],sandstorm,winter,until:winter?.until||null};
}
// An hourly forecast advisory; not a measured warning or seven-day rain total.
function currentAdvisory(d,now=Date.now()){
 const result=alerts(d,now);const items=result.items.filter(x=>stamp(x.time)<=now&&stamp(x.time)+HOUR>now);
 if(!items.length)return {candidate:null,complete:result.complete};
 const item=items.sort((a,b)=>b.severity-a.severity)[0];
 return {complete:result.complete,candidate:{kind:item.kind,eventKey:item.kind+':'+dayKey(now),title:'تنبيه جوي لهدى',text:'وفق توقعات الساعة الحالية: '+item.text+' · التوقعات قابلة للتغيّر.',time:item.time}};
}
return {ZONE,DAY,HOUR,finite,prob,dayKey,stamp,weekday,number,description,direction,isFresh,currentFresh,acceptNewer,nearestRain,currentAdvisory,bestWeek,stars,reflection,ramadan,dayWeather,cardData,alerts,sandstormForecast,winter:Winter};
});
