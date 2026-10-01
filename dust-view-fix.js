(()=>{
'use strict';

const LAT=14.230586,LON=47.199415;
let sandstormAlert='';
let lastResult=null;

function dayKey(t){return String(t||'').slice(0,10)}
function fmtTime(t){return new Date(t).toLocaleTimeString('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true})}
function todayKey(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function tomorrowKey(){const d=new Date();d.setDate(d.getDate()+1);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}

async function getData(lat,lon){
  const dustUrl=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=dust&forecast_days=2&timezone=Asia%2FAden&domains=cams_global`;
  const weatherUrl=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,visibility&forecast_days=2&timezone=Asia%2FAden&wind_speed_unit=kmh`;
  const [dr,wr]=await Promise.all([fetch(dustUrl),fetch(weatherUrl)]);
  if(!dr.ok||!wr.ok)throw new Error('sandstorm-data');
  return {dust:await dr.json(),weather:await wr.json()};
}

function classify(dust,gust,wind,visibility){
  // Conservative local guidance: never call dust concentration alone a sandstorm.
  // A signal requires elevated desert dust together with sufficiently strong surface wind.
  // Visibility is used only as supporting model evidence, not as proof of an observed storm.
  if(dust>=300&&gust>=40) return 2;
  if(dust>=200&&gust>=35&&visibility>0&&visibility<=5000) return 2;
  if(dust>=150&&gust>=35&&visibility>0&&visibility<=8000) return 1;
  if(dust>=200&&wind>=30&&gust>=35) return 1;
  return 0;
}

async function evaluate(){
  const {dust,weather}=await getData(LAT,LON);
  const dt=dust.hourly?.time||[],dv=dust.hourly?.dust||[];
  const wt=weather.hourly?.time||[];
  const wm=new Map(wt.map((t,i)=>[t,i]));
  const allowed=new Set([todayKey(),tomorrowKey()]);
  const rows=[];
  for(let i=0;i<dt.length;i++){
    if(!allowed.has(dayKey(dt[i])))continue;
    const j=wm.get(dt[i]);if(j===undefined)continue;
    const d=Number(dv[i]||0),wind=Number(weather.hourly.wind_speed_10m?.[j]||0),gust=Number(weather.hourly.wind_gusts_10m?.[j]||0),vis=Number(weather.hourly.visibility?.[j]||0),dir=Number(weather.hourly.wind_direction_10m?.[j]||0);
    rows.push({t:dt[i],dust:d,wind,gust,vis,dir,rank:classify(d,gust,wind,vis)});
  }
  const peak=rows.reduce((a,b)=>!a||b.rank>a.rank||(b.rank===a.rank&&b.dust>a.dust)?b:a,null);
  const result={rank:peak?.rank||0,peak,rows};
  lastResult=result;
  return result;
}

function statusText(result){
  if(!result||result.rank===0)return {icon:'🟢',title:'لا توجد عاصفة رملية متوقعة',body:'لا تظهر حاليًا مؤشرات مشتركة كافية على عاصفة رملية مؤثرة على هدى خلال اليوم أو غدًا.'};
  const p=result.peak,when=dayKey(p.t)===todayKey()?'اليوم':'غدًا';
  if(result.rank===1)return {icon:'🟠',title:'مؤشرات تستحق المتابعة',body:`توجد إشارة محتملة لموجة غبار صحراوي مع رياح نشطة ${when} قرب ${fmtTime(p.t)}. التوقع غير مؤكد ويُعاد تقييمه مع التحديثات.`};
  return {icon:'🔴',title:'تنبيه عاصفة رملية محتملة',body:`تتوافق مؤشرات الغبار الصحراوي والرياح على احتمال عاصفة رملية مؤثرة ${when} قرب ${fmtTime(p.t)}. يُنصح بمتابعة التحديثات مع اقتراب الوقت.`};
}

function paint(result){
  const s=statusText(result),summary=document.getElementById('dustSummary'),grid=document.getElementById('dustForecast'),card=document.getElementById('observerDust');
  if(card)card.textContent=result.rank===0?'لا توجد عاصفة رملية':result.rank===1?'احتمال قيد المتابعة':'تنبيه محتمل';
  if(summary)summary.innerHTML=`${s.icon} <strong>${s.title}</strong><br><span style="display:block;margin-top:8px">${s.body}</span>`;
  if(grid){
    const days=[todayKey(),tomorrowKey()];
    grid.innerHTML=days.map((day,i)=>{
      const arr=result.rows.filter(x=>dayKey(x.t)===day),best=arr.reduce((a,b)=>!a||b.rank>a.rank||(b.rank===a.rank&&b.dust>a.dust)?b:a,null);
      const st=statusText({rank:best?.rank||0,peak:best});
      return `<div class="dust-item"><span>${i===0?'اليوم':'غدًا'}</span><strong>${st.icon} ${st.title}</strong></div>`;
    }).join('');
  }
  const modal=document.getElementById('dustModal');
  const h=modal?.querySelector('.modal-header h2');if(h)h.textContent='🌫️ مراقبة العواصف الرملية – هدى';
  const note=modal?.querySelector('.modal-pad > .small-note');if(note)note.textContent='المتابعة لليوم وغدًا فقط. لا يُصدر تنبيه من تركيز الغبار وحده؛ تُقارن بيانات الغبار الصحراوي مع الرياح والرؤية النموذجية. المصدر: CAMS عبر Open‑Meteo وبيانات الطقس عبر Open‑Meteo.';
  const frame=modal?.querySelector('.dust-map iframe');if(frame){frame.src=`https://embed.windy.com/embed2.html?lat=${LAT}&lon=${LON}&detailLat=${LAT}&detailLon=${LON}&width=650&height=450&zoom=6&level=surface&overlay=dustsm&product=cams-global&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=false&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;frame.title='خريطة الغبار الصحراوي';}
  sandstormAlert=result.rank===2?`${s.icon} ${s.title}: ${s.body}`:'';
}

window.loadDust=async function(){
  try{paint(await evaluate());}
  catch(e){console.error(e);const card=document.getElementById('observerDust');if(card)card.textContent='تعذر التحديث';}
};

const oldOpen=window.openDust;
window.openDust=function(){
  if(typeof oldOpen==='function')oldOpen();
  const m=document.getElementById('dustModal');if(m){m.style.display='block';document.body.style.overflow='hidden';}
  if(lastResult)paint(lastResult);else window.loadDust();
};

const oldRender=window.renderWeatherAlerts;
window.renderWeatherAlerts=function(){
  if(typeof oldRender==='function')oldRender();
  const box=document.getElementById('weatherAlerts');if(!box)return;
  [...box.children].forEach(el=>{if(/الغبار|غبار|CAMS/.test(el.textContent||''))el.remove();});
  if(sandstormAlert){const d=document.createElement('div');d.style.margin='7px 0';d.textContent=sandstormAlert;box.appendChild(d);}
  if(!box.textContent.trim())box.textContent='✅ لا توجد تنبيهات جوية بارزة خلال الـ24 ساعة القادمة.';
};

// Install immediately so the main weather refresh uses the conservative monitor.
const relabel=()=>{
  const dust=document.getElementById('observerDust'),item=dust?.closest('.observer-item');
  const label=item?.querySelector('span');if(label)label.textContent='🌫️ العواصف الرملية';
  const note=item?.querySelector('.small-note');if(note)note.textContent='مراقبة اليوم وغدًا';
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{relabel();setTimeout(relabel,0)});else relabel();
})();