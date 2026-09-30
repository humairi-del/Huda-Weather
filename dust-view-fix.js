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
function hourDiff(a,b){return Math.max(0,Math.round((new Date(b)-new Date(a))/36e5))}

const directions=[
  {name:'شمال هدى',short:'الشمال',dlat:.8,dlon:0},
  {name:'شمال شرق هدى',short:'الشمال الشرقي',dlat:.57,dlon:.57},
  {name:'شرق هدى',short:'الشرق',dlat:0,dlon:.8},
  {name:'جنوب شرق هدى',short:'الجنوب الشرقي',dlat:-.57,dlon:.57},
  {name:'جنوب هدى',short:'الجنوب',dlat:-.8,dlon:0},
  {name:'جنوب غرب هدى',short:'الجنوب الغربي',dlat:-.57,dlon:-.57},
  {name:'غرب هدى',short:'الغرب',dlat:0,dlon:-.8},
  {name:'شمال غرب هدى',short:'الشمال الغربي',dlat:.57,dlon:-.57}
];
async function getDust(lat,lon){
  const u=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(5)}&longitude=${lon.toFixed(5)}&current=dust&hourly=dust&forecast_days=2&timezone=Asia%2FAden&domains=cams_global`;
  const r=await fetch(u);if(!r.ok)throw new Error('dust');return r.json();
}
function series(data,fromTime){
  const t=data.hourly?.time||[],v=data.hourly?.dust||[];
  let s=t.findIndex(x=>x>=fromTime);if(s<0)s=0;
  return t.map((x,i)=>({t:x,v:Number(v[i]||0)})).slice(s);
}
async function detectApproach(lat,lon,local,fromTime){
  const nearby=await Promise.all(directions.map(async dir=>({dir,data:await getDust(lat+dir.dlat,lon+dir.dlon)})));
  const localMap=new Map(local.map(x=>[x.t,x.v]));
  let best=null;
  for(const item of nearby){
    const arr=series(item.data,fromTime);
    for(const x of arr){
      const lv=localMap.get(x.t);if(!Number.isFinite(lv))continue;
      const lead=x.v-lv;
      if(x.v<40||lead<20)continue;
      const score=lead+(x.v*.15);
      if(!best||score>best.score)best={dir:item.dir,t:x.t,v:x.v,local:lv,score};
    }
  }
  return best;
}
async function renderSimpleDust(){
  const summary=document.getElementById('dustSummary'),grid=document.getElementById('dustForecast');
  if(!summary||!grid)return;
  try{
    const lat=Number(window.latitude??14.230586),lon=Number(window.longitude??47.199415);
    const d=await getDust(lat,lon);
    const times=d.hourly?.time||[],vals=d.hourly?.dust||[];
    const nowKey=d.current?.time||times[0];
    let start=times.findIndex(t=>t>=nowKey);if(start<0)start=0;
    const future=times.map((t,i)=>({t,v:Number(vals[i]||0)})).slice(start);
    const days=[...new Set(future.map(x=>adenDay(x.t)))].slice(0,2);
    grid.innerHTML=days.map((day,di)=>{
      const a=future.filter(x=>adenDay(x.t)===day);if(!a.length)return '';
      const peak=a.reduce((p,x)=>x.v>p.v?x:p,a[0]);
      return `<div class="dust-item"><span>${dayLabel(day,di)}</span><strong>${dustLevel(peak.v)}</strong><br>الذروة ${Math.round(peak.v)} µg/m³ • ${fmtHour(peak.t)}</div>`;
    }).join('');

    const current=Number(d.current?.dust||0);
    const significant=future.filter(x=>x.v>=40);
    let wave='لا تظهر موجة غبار صحراوي مؤثرة خلال اليوم وغدًا.';
    if(significant.length){
      const first=significant[0],last=significant[significant.length-1],peak=significant.reduce((p,x)=>x.v>p.v?x:p,significant[0]);
      let approach=null;
      try{approach=await detectApproach(lat,lon,future,nowKey)}catch(e){console.warn('dust direction unavailable',e)}
      const eta=hourDiff(nowKey,first.t);
      const when=eta<=1?'قريبًا':`خلال نحو ${eta} ساعة`;
      if(approach){
        wave=`🌫️ موجة غبار صحراوي متوقعة ${when}. تشير بيانات الغبار المحيطة إلى كتلة أعلى تركيزًا في ${approach.dir.name}، مع ذروة متوقعة على هدى ${fmtHour(peak.t)} (${dustLevel(peak.v)} ${Math.round(peak.v)} µg/m³)، ثم تبدأ بالتراجع قرابة ${fmtHour(last.t)}.`;
      }else{
        wave=`🌫️ متوقع ارتفاع تركيز الغبار الصحراوي ${when}، مع ذروة ${fmtHour(peak.t)} (${dustLevel(peak.v)} ${Math.round(peak.v)} µg/m³)، ثم يبدأ بالتراجع قرابة ${fmtHour(last.t)}. لا تتوفر إشارة مكانية كافية لتحديد جهة قدوم الموجة بثقة.`;
      }
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