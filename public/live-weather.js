(()=>{'use strict';
const ZONE='Asia/Aden',CACHE='hada-weather-engine-client-v1',MAX_CACHE_AGE=45*60*1000;
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('ar-YE',{maximumFractionDigits:0}).format(n),finite=n=>typeof n==='number'&&Number.isFinite(n);
const url=new URL('./api/weather-engine',location.href);
let pending=null,weather=null,weatherAt=0,nextAttemptAt=0,failures=0,retryTimer=null,calendarDay='',currentHazard=null,enrichmentTimer=null,enrichmentAttempts=0,enrichmentFor=0,showingCached=false;
function dayKey(now=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function parseTime(t){return Date.parse(t+'+03:00');}
function label(code){return code===0?'سماء صافية':code===1?'صحو غالبًا':code===2?'غائم جزئيًا':code===3?'غائم':[45,48].includes(code)?'ضباب':[51,53,55,56,57].includes(code)?'رذاذ':[61,80].includes(code)?'أمطار خفيفة':[63,81].includes(code)?'أمطار متوسطة':[65,82].includes(code)?'أمطار غزيرة':[71,73,75,77,85,86].includes(code)?'ثلوج':[95,96,99].includes(code)?'أمطار رعدية':'الحالة غير متاحة';}
function icon(code,night=false){const rain=[51,53,55,56,57,61,63,65,80,81,82,95,96,99].includes(code),clear=[0,1].includes(code);let body;if(rain)body='<path d="M6 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 1 9M8 18l-1 3m6-3-1 3m6-3-1 3"/>';else if(clear&&night)body='<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>';else if(clear)body='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';else body='<path d="M6 18a4 4 0 0 1-.5-8A6.5 6.5 0 0 1 18 8a5 5 0 0 1 0 10Z"/>';return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';}
function direction(value){return finite(value)?['شمالية','شمالية شرقية','شرقية','جنوبية شرقية','جنوبية','جنوبية غربية','غربية','شمالية غربية'][Math.round((((value%360)+360)%360)/45)%8]:'غير متاحة';}
function validated(d){const today=dayKey();if(!window.HadaWeatherCore.isFresh(d)||d.timezone!==ZONE||!d.current||!finite(d.current.temperature_2m)||d.current_units?.temperature_2m!=='°C'||d.daily_units?.precipitation_sum!=='mm'||d.daily?.time?.[0]!==today||d.daily.time.length!==7||!Array.isArray(d.hourly?.time))throw new Error('invalid_weather');for(const key of ['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max'])if(!Array.isArray(d.daily[key])||d.daily[key].length!==7)throw new Error('invalid_daily');if(d.daily.temperature_2m_max.some(x=>!finite(x))||d.daily.temperature_2m_min.some(x=>!finite(x)))throw new Error('missing_temperature');for(const key of ['temperature_2m','precipitation_probability','weather_code','uv_index'])if(!Array.isArray(d.hourly[key])||d.hourly[key].length!==d.hourly.time.length)throw new Error('invalid_hourly');return d;}
function chance(v){return window.HadaWeatherCore.prob(v)?new Intl.NumberFormat('ar-YE-u-nu-latn',{maximumFractionDigits:0}).format(v)+'٪':'غير متاحة';}
function dayChance(d,day,now){const values=d.hourly.time.map((t,i)=>t.startsWith(day)&&parseTime(t)+3600000>now?d.hourly.precipitation_probability[i]:null).filter(finite);return values.length?Math.max(...values):null;}
function summary(d,i){return `الحرارة ${fmt(Math.round(d.daily.temperature_2m_min[i]))}–${fmt(Math.round(d.daily.temperature_2m_max[i]))}°، ${label(d.daily.weather_code[i])}. فرصة المطر ${chance(i===0?dayChance(d,d.daily.time[0],Date.now()):d.daily.precipitation_probability_max[i])}.`;}
function render(d,cached=false,fetchedAt=Date.now()){weather=d;weatherAt=fetchedAt;showingCached=cached;calendarDay=dayKey();const c=d.current,h=d.hourly;const now=Date.now(),indices=h.time.map((t,i)=>parseTime(t)<=now?i:-1).filter(i=>i>=0),hourIndex=indices.at(-1);const uv=h.uv_index[hourIndex],prob=h.precipitation_probability[hourIndex];
 $('liveTemperature').textContent=fmt(Math.round(c.temperature_2m))+'°';$('liveCondition').textContent=label(c.weather_code);$('liveRange').textContent=`العظمى ${fmt(Math.round(d.daily.temperature_2m_max[0]))}° · الصغرى ${fmt(Math.round(d.daily.temperature_2m_min[0]))}°`;
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',hourCycle:'h23'}).format(new Date()));$('liveWeatherIcon').innerHTML=icon(c.weather_code,hour<6||hour>=18);
 $('liveHumidity').textContent=finite(c.relative_humidity_2m)?fmt(c.relative_humidity_2m)+'٪':'—';$('liveWind').textContent=finite(c.wind_speed_10m)?fmt(c.wind_speed_10m)+' كم/س':'—';$('liveRain').textContent=window.HadaRainLanguage.probability(prob);$('liveUv').textContent=finite(uv)?fmt(uv)+' · '+(uv<3?'منخفضة':uv<6?'متوسطة':uv<8?'مرتفعة':uv<11?'عالية جدًا':'شديدة'):'—';
 const nextHour=h.time.findIndex(t=>parseTime(t)+3600000>now),start=nextHour<0?h.time.length:nextHour;const timeline=document.querySelector('.timeline');timeline.replaceChildren();
 for(let i=start;i<Math.min(start+24,h.time.length);i++){const t=new Date(parseTime(h.time[i])),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,hour:'2-digit',hourCycle:'h23'}).format(t)),article=document.createElement('article');article.className='hour'+([51,53,55,61,63,65,80,81,82,95,96,99].includes(h.weather_code[i])?' rain':'');const when=new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,hour:'numeric',hour12:true}).format(t);article.innerHTML=`<span>${when}</span>${icon(h.weather_code[i],hour<6||hour>=18)}<strong>${finite(h.temperature_2m[i])?fmt(Math.round(h.temperature_2m[i]))+'°':'—'}</strong><span class="rain-percent" aria-label="احتمال المطر ${chance(h.precipitation_probability[i])}">${chance(h.precipitation_probability[i])}</span><span class="chance">${window.HadaRainLanguage.brief(h.precipitation_probability[i],h.weather_code[i])}</span>`;timeline.appendChild(article);}
 const week=document.querySelector('.week');week.replaceChildren();d.daily.time.forEach((date,i)=>{const article=document.createElement('article');article.className='day';const name=i===0?'اليوم':new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long'}).format(new Date(date+'T12:00:00+03:00'));article.innerHTML=`${name}${icon(d.daily.weather_code[i])}<strong>${finite(d.daily.temperature_2m_max[i])?fmt(Math.round(d.daily.temperature_2m_max[i]))+'°':'—'}</strong><small>${finite(d.daily.temperature_2m_min[i])?fmt(Math.round(d.daily.temperature_2m_min[i]))+'°':'—'}</small><span class="rain-percent" aria-label="احتمال المطر ${chance(d.daily.precipitation_probability_max[i])}">${chance(d.daily.precipitation_probability_max[i])}</span><span class="wet">${window.HadaRainLanguage.brief(d.daily.precipitation_probability_max[i],d.daily.weather_code[i])}</span>`;week.appendChild(article);});
 window.HadaRainPeriod.render(d,now);

 if(window.HadaMonitorPanels)window.HadaMonitorPanels.wind=['اتجاه الرياح',`رياح ${direction(c.wind_direction_10m)} بسرعة ${finite(c.wind_speed_10m)?fmt(c.wind_speed_10m):'—'} كم/س.`];
 window.dispatchEvent(new CustomEvent('hada:weather',{detail:d}));
 let status=$('liveWeatherSource');if(!status){status=document.createElement('p');status.id='liveWeatherSource';status.className='live-source-link';$('current').appendChild(status);}status.replaceChildren();const validTime=new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(parseTime(d.current.time)));status.append((cached?'بيانات محفوظة مؤقتًا · ':'')+'تقدير الطقس '+validTime+' · المصدر: ');const a=document.createElement('a');a.href='https://open-meteo.com/';a.target='_blank';a.rel='noopener noreferrer';a.textContent=d.engine?.source||'Open-Meteo';status.appendChild(a);
}
function connectionStatus(message='',busy=false){
 let status=$('liveWeatherConnection');
 if(!status){status=document.createElement('p');status.id='liveWeatherConnection';status.className='live-source-link';status.setAttribute('role','status');$('current').appendChild(status);}
 status.hidden=!message;status.replaceChildren();
 if(message){const text=document.createElement('span');text.textContent=message+' ';const button=document.createElement('button');button.id='retryLiveWeather';button.type='button';button.className='primary';button.textContent=busy?'جارٍ التحديث…':'إعادة المحاولة';button.disabled=busy;button.onclick=()=>refresh(true);status.append(text,button);}
}
function clearExpiredWeather(){
 weather=null;currentHazard=null;
 for(const id of ['liveTemperature','liveRange','liveHumidity','liveWind','liveRain','liveUv'])$(id).textContent='—';
 $('liveWeatherIcon').replaceChildren();window.dispatchEvent(new CustomEvent('hada:weather',{detail:null}));
 window.dispatchEvent(new CustomEvent('hada:local-hazard',{detail:null}));
 window.HadaRainPeriod.render(null);
 for(const selector of ['.timeline','.week']){const node=document.querySelector(selector);node.replaceChildren();const note=document.createElement('p');note.className='muted';note.textContent='التوقعات غير متاحة مؤقتًا؛ سنحاول تحديثها تلقائيًا.';node.appendChild(note);}
 if(window.HadaOutlookMessages)for(const key of ['today','tomorrow','week'])window.HadaOutlookMessages[key]='التوقعات غير متاحة مؤقتًا.';
 if(window.HadaMonitorPanels)window.HadaMonitorPanels.wind=['اتجاه الرياح','بيانات الرياح غير متاحة مؤقتًا.'];
}
const retryDelay=count=>[10000,30000,60000,300000][Math.min(Math.max(0,count-1),3)];
async function refresh(force=false){
 const now=Date.now();
 // Clear stale values even when the next network request is still throttled.
 if(weather&&(now-weatherAt>MAX_CACHE_AGE||calendarDay!==dayKey())){clearExpiredWeather();$('liveCondition').textContent='بانتظار تحديث الطقس';connectionStatus('انتهت صلاحية البيانات المحفوظة؛ سنعيد المحاولة تلقائيًا.');}
 if(pending)return pending;
 if(!force&&now<nextAttemptAt)return;
 clearTimeout(retryTimer);
 try{const cache=JSON.parse(localStorage.getItem(CACHE));if(!weather&&cache&&cache.saved<=now+300000&&now-cache.saved<MAX_CACHE_AGE)render(validated(cache.data),true,cache.saved);}catch{}
 if($('liveWeatherConnection')&&!$('liveWeatherConnection').hidden)connectionStatus('نعيد محاولة تحديث الطقس.',true);
 pending=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(url.href,{signal:controller.signal,credentials:'omit',cache:'no-store'});if(!response.ok)throw new Error('weather_http');
   const data=validated(await response.json());if(!window.HadaWeatherCore.acceptNewer(weather,data))return;render(data,false,data.engine.fetchedAt);connectionStatus();failures=0;nextAttemptAt=Date.now()+15*60*1000;
   if(enrichmentFor!==data.engine.fetchedAt){enrichmentFor=data.engine.fetchedAt;enrichmentAttempts=0;}clearTimeout(enrichmentTimer);if(data.engine.enrichment==='pending'&&enrichmentAttempts<3){const delay=[3000,6000,12000][enrichmentAttempts++];enrichmentTimer=setTimeout(()=>{if(!document.hidden)refresh(true);},delay);}
   try{localStorage.setItem(CACHE,JSON.stringify({saved:data.engine.fetchedAt,data}));}catch{}
  }catch{
   if(weather&&(Date.now()-weatherAt>MAX_CACHE_AGE||calendarDay!==dayKey()))clearExpiredWeather();
   if(!weather){clearExpiredWeather();$('liveCondition').textContent='تعذر تحديث الطقس مؤقتًا';}
   else render(weather,true,weatherAt);
   connectionStatus(weather?'تعذر الاتصال؛ المعروضة بيانات محفوظة حديثًا، وسنعيد المحاولة تلقائيًا.':'تعذر الاتصال بالطقس؛ سنعيد المحاولة تلقائيًا.');
   const delay=retryDelay(++failures);nextAttemptAt=Date.now()+delay;
   retryTimer=setTimeout(()=>{if(!document.hidden)refresh();},delay);
  }finally{clearTimeout(timer);pending=null;}
 })();
 return pending;
}
refresh();window.addEventListener('online',()=>refresh(true));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(calendarDay!==dayKey());});setInterval(()=>{if(!document.hidden){if(weather&&calendarDay===dayKey()&&Date.now()-weatherAt<=MAX_CACHE_AGE)render(weather,showingCached,weatherAt);refresh(calendarDay!==dayKey());}},60000);
window.HadaLiveWeather={url:url.href,validated,dayChance,direction,refresh,retryDelay,getHazard:()=>currentHazard,getData:()=>weather};
})();
