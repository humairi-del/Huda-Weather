(()=>{
'use strict';

function dustLevel(v){
  v=Number(v||0);
  if(v<15)return 'لا يوجد غبار مؤثر';
  if(v<40)return 'خفيف';
  if(v<80)return 'متوسط';
  if(v<150)return 'كثيف';
  return 'شديد';
}
function adenDay(iso){return String(iso||'').slice(0,10)}
function dayLabel(day,index){return index===0?'اليوم':'غدًا'}
function fmtHour(iso){return new Date(iso).toLocaleTimeString('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true})}
function windText(deg){
  if(!Number.isFinite(deg))return '';
  const names=['شمالية','شمالية شرقية','شرقية','جنوبية شرقية','جنوبية','جنوبية غربية','غربية','شمالية غربية'];
  return names[Math.round((((deg%360)+360)%360)/45)%8];
}
async function renderSimpleDust(){
  const summary=document.getElementById('dustSummary'),grid=document.getElementById('dustForecast');
  if(!summary||!grid)return;
  try{
    const lat=window.latitude??14.230586,lon=window.longitude??47.199415;
    const u=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=dust&hourly=dust&forecast_days=2&timezone=Asia%2FAden`;
    const r=await fetch(u);if(!r.ok)throw new Error('dust');const d=await r.json();
    const times=d.hourly?.time||[],vals=d.hourly?.dust||[];
    const nowKey=d.current?.time||times[0];
    let start=times.findIndex(t=>t>=nowKey);if(start<0)start=0;
    const future=times.map((t,i)=>({t,v:Number(vals[i]||0),i})).slice(start);
    const days=[...new Set(future.map(x=>adenDay(x.t)))].slice(0,2);
    const cards=days.map((day,di)=>{
      const a=future.filter(x=>adenDay(x.t)===day);if(!a.length)return '';
      const peak=a.reduce((p,x)=>x.v>p.v?x:p,a[0]);
      return `<div class="dust-item"><span>${dayLabel(day,di)}</span><strong>${dustLevel(peak.v)}</strong><br>الذروة ${Math.round(peak.v)} µg/m³ • ${fmtHour(peak.t)}</div>`;
    }).join('');
    grid.innerHTML=cards;
    const current=Number(d.current?.dust||0);
    const significant=future.filter(x=>x.v>=40);
    let wave='لا تظهر موجة غبار مؤثرة خلال اليوم وغدًا.';
    if(significant.length){
      const first=significant[0],last=significant[significant.length-1],peak=significant.reduce((p,x)=>x.v>p.v?x:p,significant[0]);
      let wind='';
      const w=window.weatherData?.hourly;
      if(w?.time){const wi=w.time.indexOf(peak.t),deg=wi>=0?Number(w.wind_direction_10m?.[wi]):NaN;if(Number.isFinite(deg))wind=` • رياح ${windText(deg)}`;}
      wave=`🌫️ موجة الغبار: تبدأ تقريبًا ${fmtHour(first.t)}، الذروة ${fmtHour(peak.t)} (${dustLevel(peak.v)} ${Math.round(peak.v)} µg/m³)، وتخف تقريبًا ${fmtHour(last.t)}${wind}.`;
    }
    summary.innerHTML=`الحالة الحالية: <strong>${dustLevel(current)}</strong> • ${Math.round(current)} µg/m³<br>${wave}`;
    const frame=document.querySelector('#dustModal .dust-map iframe');
    if(frame){frame.src=`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=6&level=surface&overlay=dustsm&product=cams-global&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=false&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;frame.title='خريطة الغبار الصحراوي';}
  }catch(e){console.error(e);}
}
function install(){
  const original=window.openDust;
  window.openDust=function(){if(typeof original==='function')original();setTimeout(renderSimpleDust,0)};
  const frame=document.querySelector('#dustModal .dust-map iframe');
  if(frame){frame.src=frame.src.replace('overlay=dust&','overlay=dustsm&').replace('product=ecmwf','product=cams-global');frame.title='خريطة الغبار الصحراوي';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();