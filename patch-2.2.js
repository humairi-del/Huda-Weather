(()=>{
'use strict';

const VERSION='2.2.0';
const DUST_APP_ID='4b60cca8-16ec-432d-88ae-e0bbc22d6558';
let dustDataCache=null;
let dustWeatherAlert='';
let baseWeatherAlerts=[];

function addStyle(){
  if(document.getElementById('patch22Style')) return;
  const style=document.createElement('style');
  style.id='patch22Style';
  style.textContent=`
    .header-star{margin-top:5px;color:#e3bd61;font-size:13px;line-height:1.7}
    .observer-item.clickable{cursor:pointer;border:1px solid transparent}
    .observer-item.clickable:active{border-color:#35c6d0}
    .dust-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px}
    .dust-item{background:#081725;border-radius:12px;padding:12px;line-height:1.7}
    .dust-item span{display:block;color:#91b8d4;font-size:12px;margin-bottom:5px}
    .dust-map{height:430px;margin-top:14px;border-radius:14px;overflow:hidden;border:1px solid #294760}
    .dust-map iframe{width:100%;height:100%;border:0}
    .notification-btn{background:#3d7d63}
    @media(max-width:420px){.dust-grid{grid-template-columns:1fr}.dust-map{height:390px}}
  `;
  document.head.appendChild(style);
}

function setupStaticUI(){
  addStyle();

  const date=document.querySelector('header .date');
  if(date && !document.getElementById('headerStar')){
    const el=document.createElement('div');
    el.id='headerStar'; el.className='header-star';
    el.textContent='⭐ جاري تحديد النجم الزراعي...';
    date.appendChild(el);
  }

  const dust=document.getElementById('observerDust');
  if(dust){
    const item=dust.closest('.observer-item');
    if(item){
      item.classList.add('clickable');
      item.onclick=window.openDust;
      const label=item.querySelector('span');
      if(label) label.textContent='🌫️ الغبار';
      if(!item.querySelector('.small-note')){
        const note=document.createElement('div');note.className='small-note';note.textContent='اضغط للتفاصيل';item.appendChild(note);
      }
    }
  }

  const install=document.getElementById('installButton');
  if(install){
    install.textContent='📱 تثبيت الموقع على الهاتف';
    const oldNote=install.nextElementSibling;
    if(oldNote?.classList.contains('small-note')) oldNote.textContent='استخدم الموقع كتطبيق وفعّل تنبيهات الطقس 🔔';
    if(!document.getElementById('notificationButton')){
      const b=document.createElement('button');
      b.className='action-btn notification-btn'; b.id='notificationButton';
      b.textContent='🔔 تفعيل تنبيهات الطقس'; b.onclick=window.openNotificationPrompt;
      (oldNote||install).insertAdjacentElement('afterend',b);
    }
  }

  const alerts=document.getElementById('weatherAlerts');
  if(alerts){
    const card=alerts.closest('.card');
    card?.querySelectorAll('.small-note').forEach(n=>n.remove());
  }

  const footer=document.querySelector('footer');
  if(footer) footer.textContent=`بيانات الطقس تُحدّث تلقائيًا • الإصدار ${VERSION}`;

  const about=document.querySelector('#whatsNewModal .modal-pad');
  if(about){
    about.innerHTML=`
      <div class="status-box"><strong>طقس هدى وما جاورها</strong><br>موقع محلي لخدمة هدى وما جاورها في مديرية حبان بمحافظة شبوة، يجمع حالة الطقس والتوقعات وخرائط الطقس وبحر العرب وحساب النجوم ومواقيت الصلاة في مكان واحد.</div>
      <div class="small-note" style="font-size:13px;margin-top:12px">تعتمد بيانات الطقس والتوقعات على مصادر ونماذج جوية رقمية، وتُعرض بصورة مبسطة للمتابعة. التوقعات الجوية قابلة للتغير، ولا تُعد رصدًا ميدانيًا مؤكدًا.</div>
      <div class="source-note" style="margin-top:14px">الإصدار ${VERSION}</div>`;
  }

  if(!document.getElementById('dustModal')){
    document.body.insertAdjacentHTML('beforeend',`
      <div class="modal" id="dustModal"><div class="modal-content">
        <div class="modal-header"><h2>🌫️ الغبار الصحراوي – هدى</h2><button class="close" onclick="closeDust()">×</button></div>
        <div class="modal-pad">
          <div id="dustSummary" class="status-box">جاري تحميل بيانات الغبار...</div>
          <div id="dustForecast" class="dust-grid"></div>
          <div class="dust-map"><iframe loading="lazy" src="https://embed.windy.com/embed2.html?lat=14.230586&lon=47.199415&detailLat=14.230586&detailLon=47.199415&width=650&height=450&zoom=6&level=surface&overlay=dust&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"></iframe></div>
          <div class="small-note">المصدر: CAMS عبر Open‑Meteo. التصنيف «خفيف/متوسط/كثيف/شديد» تبسيط للغبار الصحراوي المتوقع، وليس رصدًا ميدانيًا مباشرًا.</div>
        </div>
      </div></div>`);
  }

  if(!document.getElementById('notificationModal')){
    document.body.insertAdjacentHTML('beforeend',`
      <div class="modal" id="notificationModal"><div class="modal-content">
        <div class="modal-header"><h2>🔔 تنبيهات طقس هدى</h2><button class="close" onclick="closeNotificationPrompt()">×</button></div>
        <div class="modal-pad">
          <div class="status-box">فعّل التنبيهات ليصلك إشعار عند وجود تغيرات جوية مهمة يرسلها الموقع.</div>
          <button class="action-btn notification-btn" style="margin-top:12px" onclick="enableWeatherNotifications()">تفعيل التنبيهات</button>
          <button class="action-btn" style="margin-top:8px;background:#34475b" onclick="closeNotificationPrompt()">لاحقًا</button>
          <div class="small-note">قد تظهر نافذة إذن إضافية من المتصفح أو الهاتف، ولغتها يحددها النظام.</div>
        </div>
      </div></div>`);
  }
}

function getHudaToday(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p={};parts.forEach(x=>p[x.type]=x.value);
  return new Date(Number(p.year),Number(p.month)-1,Number(p.day));
}

function currentStarInfo(){
  if(!window.starsData || !window.parseStarEntryDate) return null;
  const today=getHudaToday();
  for(const group of starsData){
    for(const star of group.stars){
      const start=parseStarEntryDate(star[1]); if(!start) continue;
      const end=new Date(start); end.setDate(end.getDate()+12);
      if(today>=start && today<=end){
        const day=Math.floor((today-start)/86400000)+1;
        return {name:star[0],day,remaining:Math.max(0,13-day)};
      }
    }
  }
  return null;
}

window.showHeaderStar=function(){
  const box=document.getElementById('headerStar'); if(!box) return;
  const info=currentStarInfo();
  box.textContent=info?`⭐ النجم الزراعي: ${info.name} • اليوم ${info.day} من 13 • متبقي ${info.remaining} أيام`:'⭐ النجم الزراعي: خارج نطاق الجدول الحالي';
};

function dustLevel(value){
  const v=Number(value||0);
  if(v<15) return {label:'لا يوجد غبار مؤثر',rank:0};
  if(v<40) return {label:'خفيف',rank:1};
  if(v<80) return {label:'متوسط',rank:2};
  if(v<150) return {label:'كثيف',rank:3};
  return {label:'شديد',rank:4};
}

function currentHourKey(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const p={};parts.forEach(x=>p[x.type]=x.value);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`;
}

window.loadDust=async function(){
  try{
    const url=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=dust&hourly=dust&forecast_days=3&timezone=Asia%2FAden`;
    const r=await fetch(url); if(!r.ok) throw new Error('dust');
    const data=await r.json(); dustDataCache=data;
    const current=Number(data.current?.dust??0), level=dustLevel(current);
    const card=document.getElementById('observerDust'); if(card) card.textContent=level.label;

    const times=data.hourly?.time||[], values=data.hourly?.dust||[];
    let nowIndex=times.indexOf(currentHourKey()); if(nowIndex<0) nowIndex=0;
    let peak=-1,peakIndex=-1;
    for(let i=nowIndex;i<Math.min(values.length,nowIndex+36);i++){
      const v=Number(values[i]); if(Number.isFinite(v)&&v>peak){peak=v;peakIndex=i;}
    }
    const peakLevel=dustLevel(peak); dustWeatherAlert='';
    if(peakIndex>=0 && peakLevel.rank>=2 && peak>current+15){
      const hours=Math.max(1,peakIndex-nowIndex);
      let dirText='';
      if(window.weatherData?.hourly?.time){
        const wi=weatherData.hourly.time.indexOf(times[peakIndex]);
        const dir=wi>=0?Number(weatherData.hourly.wind_direction_10m?.[wi]):NaN;
        if(Number.isFinite(dir)) dirText=` مع رياح ${windDirection(dir)}`;
      }
      dustWeatherAlert=`🕒 🌫️ متوقع ارتفاع الغبار إلى ${peakLevel.label} خلال نحو ${hours} ساعة${dirText}.`;
    }else if(level.rank>=3){
      dustWeatherAlert=`🌫️ تشير بيانات CAMS الحالية إلى غبار ${level.label} فوق المنطقة.`;
    }
    window.renderWeatherAlerts?.();
    renderDustDetails();
  }catch(e){console.error(e);const card=document.getElementById('observerDust');if(card)card.textContent='تعذر التحديث';}
};

function renderDustDetails(){
  if(!dustDataCache) return;
  const current=Number(dustDataCache.current?.dust??0), level=dustLevel(current);
  const summary=document.getElementById('dustSummary'), grid=document.getElementById('dustForecast');
  if(summary) summary.innerHTML=`الحالة النموذجية الحالية: <strong>${level.label}</strong> • ${Math.round(current)} µg/m³${dustWeatherAlert?`<br>${dustWeatherAlert}`:''}`;
  if(!grid) return;
  const times=dustDataCache.hourly?.time||[],values=dustDataCache.hourly?.dust||[];
  let start=times.indexOf(currentHourKey()); if(start<0) start=0;
  const rows=[];
  for(let i=start;i<times.length&&rows.length<8;i+=3){
    const d=new Date(times[i]),v=Number(values[i]??0),l=dustLevel(v);
    const t=d.toLocaleString('ar-YE',{timeZone:'Asia/Aden',weekday:'short',hour:'numeric',minute:'2-digit',hour12:true});
    rows.push(`<div class="dust-item"><span>${t}</span><strong>${l.label}</strong><br>${Math.round(v)} µg/m³</div>`);
  }
  grid.innerHTML=rows.join('');
}

window.openDust=function(){const m=document.getElementById('dustModal');if(m){m.style.display='block';document.body.style.overflow='hidden';renderDustDetails();}};
window.closeDust=function(){const m=document.getElementById('dustModal');if(m){m.style.display='none';document.body.style.overflow='';}};

async function loadCloudLayers(data,i){
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&timezone=Asia%2FAden&forecast_days=1`;
    const r=await fetch(url);if(!r.ok)throw new Error('clouds');const d=await r.json();
    let ci=d.hourly?.time?.indexOf(currentHourKey());if(ci<0)ci=0;
    const total=Number(d.hourly?.cloud_cover?.[ci]??data.hourly.cloud_cover?.[i]??0);
    const low=Number(d.hourly?.cloud_cover_low?.[ci]??0),mid=Number(d.hourly?.cloud_cover_mid?.[ci]??0),high=Number(d.hourly?.cloud_cover_high?.[ci]??0);
    const el=document.getElementById('observerCloud');if(el){el.textContent=`منخفضة ${Math.round(low)}% • إجمالي ${Math.round(total)}%`;el.title=`منخفضة ${Math.round(low)}% • متوسطة ${Math.round(mid)}% • عالية ${Math.round(high)}% • إجمالي ${Math.round(total)}%`;}
  }catch(e){console.error(e);}
}

const originalObserver=window.showObserverWeather;
window.showObserverWeather=function(data){
  const i=getCurrentHourIndex(data);
  const rain=Number(data.hourly.precipitation[i]??0), chance=Number(data.hourly.precipitation_probability[i]??0), cloud=Number(data.hourly.cloud_cover[i]??0), visibility=Number(data.hourly.visibility?.[i]??0);
  document.getElementById('observerRain').textContent=`${rain.toFixed(1)} ملم • ${Math.round(chance)}%`;
  const cloudEl=document.getElementById('observerCloud');if(cloudEl)cloudEl.textContent=`إجمالي ${Math.round(cloud)}%`;
  document.getElementById('observerVisibility').textContent=visibility>0?`${(visibility/1000).toFixed(1)} كم`:'--';
  const gust=Number(data.hourly.wind_gusts_10m?.[i]??0);document.getElementById('observerGust').textContent=`${Math.round(gust)} كم/س`;
  const mins=(data.daily.temperature_2m_min||[]).filter(Number.isFinite),min7=mins.length?Math.min(...mins):NaN;
  let winter='معتدل';
  if(Number.isFinite(min7)&&min7<=8)winter=`برد قوي • أدنى ${Math.round(min7)}°`;
  else if(Number.isFinite(min7)&&min7<=13)winter=`بارد • أدنى ${Math.round(min7)}°`;
  else if(Number.isFinite(min7)&&min7<=18)winter=`مائل للبرودة • أدنى ${Math.round(min7)}°`;
  else if(Number.isFinite(min7))winter=`لا برد قوي • أدنى ${Math.round(min7)}°`;
  document.getElementById('observerWinter').textContent=winter;
  let summary='';
  if(rain>=1)summary='🕒 هطول متوقع في الساعة الحالية حسب بيانات التوقع، وليس رصدًا ميدانيًا.';
  else if(chance>=50)summary='🕒 فرصة مطر متوقعة مرتفعة نسبيًا خلال الفترة الحالية.';
  else if(cloud>=75)summary='🕒 غطاء سحابي إجمالي مرتفع في النموذج؛ راجع تفصيل السحب المنخفضة في البطاقة.';
  else summary='🕒 لا تظهر في التوقع الحالي إشارة قوية لهطول على هدى.';
  document.getElementById('observerSummary').textContent=summary;
  document.getElementById('observerUpdated').textContent='آخر تحديث: '+new Date().toLocaleTimeString('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true});
  loadCloudLayers(data,i);window.loadDust();
};

window.renderWeatherAlerts=function(){
  const box=document.getElementById('weatherAlerts');if(!box)return;
  const all=[...baseWeatherAlerts];if(dustWeatherAlert)all.push(dustWeatherAlert);
  box.innerHTML=all.length?all.map(x=>`<div style="margin:7px 0">${x}</div>`).join(''):'✅ لا توجد تنبيهات جوية بارزة خلال الـ24 ساعة القادمة.';
};
window.showWeatherAlerts=function(data){
  const start=getCurrentHourIndex(data),end=Math.min(start+24,data.hourly.time.length),alerts=[];
  let maxRain=0,maxGust=0,minTemp=Infinity,maxTemp=-Infinity,thunder=false,northWind=false;
  for(let i=start;i<end;i++){
    const rain=Number(data.hourly.precipitation_probability?.[i]??0),gust=Number(data.hourly.wind_gusts_10m?.[i]??0),temp=Number(data.hourly.temperature_2m?.[i]),code=Number(data.hourly.weather_code?.[i]??0),dir=Number(data.hourly.wind_direction_10m?.[i]);
    maxRain=Math.max(maxRain,rain);maxGust=Math.max(maxGust,gust);
    if(Number.isFinite(temp)){minTemp=Math.min(minTemp,temp);maxTemp=Math.max(maxTemp,temp);}
    if(code>=95)thunder=true;if(gust>=35&&Number.isFinite(dir)&&(dir>=315||dir<=45))northWind=true;
  }
  if(maxRain>=40)alerts.push(`🕒 🌧️ مطر متوقع: أعلى احتمال خلال 24 ساعة ${Math.round(maxRain)}%`);
  if(maxGust>=40)alerts.push(`🕒 💨 رياح قوية متوقعة: هبات قد تصل إلى ${Math.round(maxGust)} كم/س${northWind?' • بينها رياح شمالية':''}`);
  if(Number.isFinite(minTemp)&&minTemp<=15)alerts.push(`🕒 🥶 برودة متوقعة: قد تنخفض الحرارة إلى ${Math.round(minTemp)}°`);
  if(thunder)alerts.push('🕒 ⛈️ عواصف رعدية أو برق متوقع خلال الساعات القادمة');
  if(Number.isFinite(maxTemp)&&maxTemp>=40)alerts.push(`🕒 🌡️ حرارة شديدة متوقعة: قد تصل إلى ${Math.round(maxTemp)}°`);
  baseWeatherAlerts=alerts;window.renderWeatherAlerts();
};

window.getDayDetails=function(data,dateString,dailyIndex){
  const indexes=[];for(let i=0;i<data.hourly.time.length;i++)if(data.hourly.time[i].startsWith(dateString))indexes.push(i);
  if(!indexes.length)return{amount:'0.0',hours:'0',bestHour:'--',humidity:0,cloud:0,wind:0,cape:0,stormPotential:'--',note:'لا توجد بيانات تفصيلية.'};
  const humidity=maxFromIndexes(data.hourly.relative_humidity_2m,indexes),cloud=maxFromIndexes(data.hourly.cloud_cover,indexes),wind=maxFromIndexes(data.hourly.wind_speed_10m,indexes),cape=maxFromIndexes(data.hourly.cape,indexes);
  const amount=Number(data.daily.precipitation_sum[dailyIndex]??0).toFixed(1),hours=Number(data.daily.precipitation_hours[dailyIndex]??0).toFixed(0),bestHour=getBestHourForDay(data,dateString)||'--',rainChance=Number(data.daily.precipitation_probability_max[dailyIndex]??0);
  const thunderExpected=indexes.some(i=>Number(data.hourly.weather_code?.[i]??0)>=95);
  let stormPotential='منخفضة حاليًا';
  if(thunderExpected)stormPotential='مرتفعة';
  else if(cape>=1500&&rainChance>=60)stormPotential='متوسطة إلى مرتفعة';
  else if(cape>=700&&rainChance>=30)stormPotential='متوسطة';
  else if(cape>=300&&rainChance>=20)stormPotential='محدودة';
  let note='☀️ لا تظهر حاليًا إشارة قوية للمطر في هذا اليوم.';
  if(rainChance>=70)note='🌧️ فرصة المطر مرتفعة نسبيًا وفق التوقع الحالي. راقب تحديث الساعات لأن التوقيت والكمية قد يتغيران.';
  else if(rainChance>=40)note='☁️ توجد فرصة متوسطة للمطر، والتفاصيل الساعية ستوضح الفترة الأفضل مع اقتراب الموعد.';
  else if(rainChance>=20)note='🌤️ توجد إشارة محدودة للمطر، لكنها ليست قوية حاليًا.';
  return{amount,hours,bestHour,humidity:Math.round(humidity),cloud:Math.round(cloud),wind:Math.round(wind),cape:Math.round(cape),stormPotential,note};
};

window.showWeeklyWeather=function(data){
  const box=document.getElementById('weeklyForecast');box.innerHTML='';
  for(let i=0;i<data.daily.time.length;i++){
    const date=new Date(data.daily.time[i]+'T12:00:00'),dayName=date.toLocaleDateString('ar-YE',{weekday:'long'}),max=Math.round(data.daily.temperature_2m_max[i]),min=Math.round(data.daily.temperature_2m_min[i]),rain=data.daily.precipitation_probability_max[i]??0,code=data.daily.weather_code[i],details=getDayDetails(data,data.daily.time[i],i);
    const wrap=document.createElement('div');wrap.className='day-wrap';
    wrap.innerHTML=`<div class="day" onclick="toggleDay(${i})"><div class="day-name">${dayName}<div style="font-size:11px;color:#7fa1bd;margin-top:3px">اضغط للتفاصيل</div></div><div class="day-icon">${weatherIcon(code)}</div><div class="day-temp">${max}° / ${min}°</div><div class="day-rain">💧 ${rain}%</div></div><div class="day-details" id="dayDetails${i}"><div class="detail-grid"><div class="forecast-detail"><span>🌧️ كمية المطر</span><strong>${details.amount} ملم</strong></div><div class="forecast-detail"><span>🕒 ساعات الهطول</span><strong>${details.hours} ساعة</strong></div><div class="forecast-detail"><span>⏰ أفضل فترة</span><strong>${details.bestHour}</strong></div><div class="forecast-detail"><span>💧 أعلى رطوبة</span><strong>${details.humidity}%</strong></div><div class="forecast-detail"><span>☁️ أعلى سحب</span><strong>${details.cloud}%</strong></div><div class="forecast-detail"><span>💨 أقوى رياح</span><strong>${details.wind} كم/س</strong></div><div class="forecast-detail"><span>⚡ CAPE</span><strong>${details.cape} J/kg</strong></div><div class="forecast-detail"><span>⛈️ قابلية العواصف</span><strong>${details.stormPotential}</strong></div></div><div class="day-note">${details.note}</div></div>`;
    box.appendChild(wrap);
  }
};

window.loadModels=async function(){
  const grid=document.getElementById('modelsGrid'),summary=document.getElementById('modelsSummary');grid.innerHTML='<div class="loading">جاري التحميل...</div>';
  try{
    const models=MODEL_LIST.map(x=>x[1]).join(','),url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&models=${models}&timezone=Asia%2FAden&forecast_days=7`;
    const r=await fetch(url);if(!r.ok)throw new Error('models');const d=await r.json(),daily=d.daily||{},get=(base,model)=>daily[`${base}_${model}`]||[],cards=[],rainSignals=[];
    for(const [label,model] of MODEL_LIST){
      const probs=get('precipitation_probability_max',model),sums=get('precipitation_sum',model),maxs=get('temperature_2m_max',model),mins=get('temperature_2m_min',model),winds=get('wind_speed_10m_max',model);
      let bi=0,bp=-1;probs.forEach((v,i)=>{if(Number(v)>bp){bp=Number(v);bi=i;}});rainSignals.push(bp);
      if(!Number.isFinite(bp)||bp<=0){cards.push(`<div class="model-item"><span>${label}</span><strong>لا توجد فرصة مطر معتبرة خلال فترة التوقع.</strong><br>الحرارة اليوم: ${Math.round(Number(maxs[0]||0))}° / ${Math.round(Number(mins[0]||0))}°<br>الرياح اليوم: ${Math.round(Number(winds[0]||0))} كم/س</div>`);}
      else{const rain=Number(sums[bi]||0),raw=daily.time?.[bi]||'--',day=raw==='--'?'--':new Date(raw+'T12:00:00').toLocaleDateString('ar-YE',{weekday:'long',day:'numeric',month:'long'});cards.push(`<div class="model-item"><span>${label}</span><strong>أفضل فرصة: ${Math.round(bp)}%</strong><br>المطر: ${rain.toFixed(1)} ملم<br>اليوم: ${day}<br>الحرارة: ${Math.round(Number(maxs[bi]||0))}° / ${Math.round(Number(mins[bi]||0))}°<br>الرياح: ${Math.round(Number(winds[bi]||0))} كم/س</div>`);}
    }
    grid.innerHTML=cards.join('');const valid=rainSignals.filter(Number.isFinite),high=valid.filter(v=>v>=50).length;summary.textContent=high>=3?`🌧️ اتفاق جيد: ${high} من ${valid.length} نماذج تظهر إشارة مطر 50% أو أكثر خلال 7 أيام.`:high>0?`☁️ اتفاق محدود: ${high} من ${valid.length} نماذج تظهر إشارة مطر 50% أو أكثر.`:'☀️ لا يوجد حاليًا اتفاق قوي بين النماذج على فرصة مطر مرتفعة.';window.modelsLoaded=true;
  }catch(e){console.error(e);summary.textContent='تعذر تحميل مقارنة الموديلات حاليًا.';grid.innerHTML='';}
};

function quakePlaceArabic(lat,lon,raw){
  const t=String(raw||'');
  if(/Socotra/i.test(t)||(/Yemen/i.test(t)&&lon>=52&&lon<=55.8&&lat>=11&&lat<=14.5))return'منطقة سقطرى';
  if(/Somalia/i.test(t)&&lat>=10&&lat<=14.5&&lon>=43&&lon<=52.8)return'خليج عدن – قبالة سواحل الصومال';
  if(/Yemen/i.test(t))return'اليمن';if(/Oman/i.test(t))return'عُمان';if(/Somalia/i.test(t))return'الصومال';
  if(/Gulf of Aden/i.test(t)||(lat>=10&&lat<=15.5&&lon>=43&&lon<=52.8))return'خليج عدن';
  if(/Arabian Sea/i.test(t)||(lat>=5&&lat<=24&&lon>52.8&&lon<=72))return'بحر العرب';
  return'ضمن النطاق الإقليمي حول هدى';
}
window.loadQuakes=async function(){
  const grid=document.getElementById('quakeGrid'),summary=document.getElementById('quakeSummary');
  try{const end=new Date(),start=new Date(Date.now()-30*86400000),iso=x=>x.toISOString().slice(0,10),url=`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${iso(start)}&endtime=${iso(end)}&latitude=${latitude}&longitude=${longitude}&maxradiuskm=1500&minmagnitude=3&orderby=time&limit=8`;const r=await fetch(url);if(!r.ok)throw new Error('usgs');const d=await r.json(),f=d.features||[];summary.textContent=f.length?`آخر 30 يومًا: ${f.length} من أحدث الزلازل بقوة 3.0 فأعلى ضمن نطاق 1500 كم.`:'لم يسجل الاستعلام زلازل بقوة 3.0 فأعلى ضمن النطاق المحدد خلال 30 يومًا.';grid.innerHTML=f.map(q=>{const c=q.geometry?.coordinates||[],dist=haversine(latitude,longitude,c[1],c[0]),dt=new Date(q.properties.time).toLocaleString('ar-YE',{timeZone:'Asia/Aden',day:'numeric',month:'numeric',hour:'numeric',minute:'2-digit',hour12:true}),place=quakePlaceArabic(Number(c[1]),Number(c[0]),q.properties.place);return`<div class="quake-item"><span>${dt}</span><strong>قوة ${Number(q.properties.mag).toFixed(1)}</strong><br>${place}<br>يبعد نحو ${Math.round(dist)} كم • العمق ${Math.round(Number(c[2]||0))} كم</div>`;}).join('');window.quakesLoaded=true;}catch(e){console.error(e);summary.textContent='تعذر تحميل رصد الزلازل حاليًا.';grid.innerHTML='';}
};

window.openNotificationPrompt=function(){
  const b=document.getElementById('notificationButton');if(b?.textContent.includes('مفعلة'))return;
  const m=document.getElementById('notificationModal');if(m){m.style.display='block';document.body.style.overflow='hidden';}
};
window.closeNotificationPrompt=function(){const m=document.getElementById('notificationModal');if(m){m.style.display='none';document.body.style.overflow='';}};
window.enableWeatherNotifications=function(){
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  OneSignalDeferred.push(async function(OneSignal){try{await OneSignal.Notifications.requestPermission();updateNotificationButton(OneSignal);closeNotificationPrompt();}catch(e){console.error(e);alert('تعذر تفعيل التنبيهات حاليًا. تحقق من سماح الإشعارات في المتصفح.');}});
};
function updateNotificationButton(OneSignal){const b=document.getElementById('notificationButton');if(!b)return;const granted=OneSignal?.Notifications?.permission===true;b.textContent=granted?'✅ التنبيهات مفعلة':'🔔 تفعيل تنبيهات الطقس';}
function initOneSignal(){
  if(document.getElementById('oneSignalPageSdk'))return;
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  const sc=document.createElement('script');sc.id='oneSignalPageSdk';sc.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';sc.defer=true;document.head.appendChild(sc);
  OneSignalDeferred.push(async function(OneSignal){try{await OneSignal.init({appId:DUST_APP_ID,serviceWorkerPath:'sw.js',notifyButton:{enable:false}});updateNotificationButton(OneSignal);OneSignal.Notifications.addEventListener('permissionChange',()=>updateNotificationButton(OneSignal));}catch(e){console.error('OneSignal',e);}});
}

function refreshPatchedViews(){
  setupStaticUI();showHeaderStar();initOneSignal();
  if(window.weatherData){showObserverWeather(weatherData);showWeeklyWeather(weatherData);showWeatherAlerts(weatherData);}
  window.modelsLoaded=false;window.quakesLoaded=false;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshPatchedViews);else refreshPatchedViews();
})();