(()=>{
'use strict';
const LAT=14.230586,LON=47.199415;
window.MODEL_LIST=[['ECMWF','ecmwf_ifs025'],['GFS','gfs_seamless'],['ICON','icon_seamless'],['GEM / CMC','gem_seamless'],['AIFS','ecmwf_aifs025']];
window.haversine=function(a,b,c,d){const R=6371,r=x=>x*Math.PI/180,da=r(c-a),dl=r(d-b),q=Math.sin(da/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(q));};
const oldModels=window.openModels,oldQuakes=window.openQuakes,oldSea=window.openSea;
window.openModels=function(){oldModels?.();window.modelsLoaded=false;if(typeof window.loadModels==='function')window.loadModels();};
window.openQuakes=function(){oldQuakes?.();window.quakesLoaded=false;if(typeof window.loadQuakes==='function')window.loadQuakes();};

/* نقاط بحرية واسعة للمراقبة النموذجية فقط. لا تستخدم لتصنيف الأعاصير. */
const seaPoints=[['غرب بحر العرب',12,52],['شرق سقطرى',12,55],['شمال غرب بحر العرب',16,55],['وسط بحر العرب الغربي',14,58],['شمال بحر العرب',18,58],['وسط بحر العرب',14,61],['شمال بحر العرب الشرقي',18,61],['وسط بحر العرب الشرقي',14,64],['شمال شرق بحر العرب',18,64],['شرق بحر العرب',14,67],['جنوب بحر العرب',10,58],['جنوب شرق بحر العرب',10,64]];

function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function dir(deg){const x=['شمالية','شمالية شرقية','شرقية','جنوبية شرقية','جنوبية','جنوبية غربية','غربية','شمالية غربية'];return x[Math.round(Number(deg||0)/45)%8];}
function fmtTime(t){return t?new Date(t).toLocaleString('ar-YE',{timeZone:'Asia/Aden',weekday:'long',hour:'numeric',minute:'2-digit',hour12:true}):'--';}

async function seaPoint(p){
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${p[1]}&longitude=${p[2]}&hourly=pressure_msl,precipitation,cloud_cover,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=Asia%2FAden&forecast_days=3&cell_selection=sea`;
  const r=await fetch(u);if(!r.ok)throw Error('sea');
  const d=await r.json(),h=d.hourly||{};let best=null;
  for(let i=0;i<(h.time||[]).length;i++){
    const pressure=Number(h.pressure_msl?.[i]),rain=Number(h.precipitation?.[i]||0),cloud=Number(h.cloud_cover?.[i]||0),humidity=Number(h.relative_humidity_2m?.[i]||0),wind=Number(h.wind_speed_10m?.[i]||0),direction=Number(h.wind_direction_10m?.[i]||0);
    if(!Number.isFinite(pressure))continue;
    /* المؤشر لترتيب نقاط المراقبة فقط، وليس احتمال إعصار. */
    const score=Math.max(0,1010-pressure)*1.8+Math.min(rain,20)*2.2+Math.max(0,wind-20)*.28+Math.max(0,humidity-75)*.05+Math.max(0,cloud-70)*.025;
    const row={name:p[0],lat:p[1],lon:p[2],time:h.time[i],pressure,rain,cloud,humidity,wind,direction,score};
    if(!best||row.score>best.score)best=row;
  }
  return best;
}

function modelLevel(a){
  if(!a)return {rank:0,title:'لا تتوفر بيانات كافية',icon:'⚪',note:'تعذر تقييم المؤشرات النموذجية.'};
  if(a.pressure<=1000||a.wind>=60||a.rain>=15)return {rank:3,title:'مؤشرات جوية قوية تحتاج متابعة',icon:'🟠',note:'ظهرت مؤشرات قوية في إحدى نقاط بحر العرب. هذا لا يعني وجود حالة مدارية ما لم تؤكدها النشرات الرسمية.'};
  if(a.pressure<=1005||a.wind>=45||a.rain>=8)return {rank:2,title:'نشاط جوي ملحوظ قيد المتابعة',icon:'🟡',note:'توجد مؤشرات نموذجية ملحوظة، لكنها لا تكفي وحدها لتصنيف منخفض أو عاصفة مدارية.'};
  if(a.pressure<=1008||a.wind>=35||a.rain>=4)return {rank:1,title:'نشاط جوي محدود',icon:'🔵',note:'توجد بعض المؤشرات الجوية، دون إشارة نموذجية قوية في شبكة المتابعة.'};
  return {rank:0,title:'لا توجد إشارة نموذجية قوية',icon:'🟢',note:'لا تظهر شبكة المتابعة الحالية مؤشرات قوية لحالة جوية منظمة.'};
}

function impactText(a,dist,level){
  if(!a)return 'لا تتوفر بيانات كافية لتقييم القرب من شبوة.';
  if(dist<=700&&level.rank>=2)return 'النشاط المرصود قريب نسبيًا من شبوة ويستحق متابعة التحديثات، لكن لا يمكن إثبات تأثير مباشر أو مسار مداري من هذه البيانات وحدها.';
  if(dist<=1000&&level.rank>=2)return 'النشاط ليس بعيدًا عن المنطقة ويستحق المتابعة، ولا يظهر من هذه البيانات وحدها تهديد مباشر مؤكد على شبوة.';
  return 'لا يظهر من المؤشرات النموذجية الحالية تأثير مباشر واضح على شبوة.';
}

function ensureSeaUI(){
  const summary=document.getElementById('seaSummary');if(!summary)return null;
  const grid=summary.parentElement?.querySelector('.sea-grid');
  if(grid){
    grid.style.display='block';
    grid.innerHTML=`
      <div id="seaSimpleArea" class="sea-item" style="margin-bottom:9px"><span>📍 أهم منطقة تستحق المتابعة</span><div class="sea-value" id="seaSimpleAreaValue">جاري الفحص...</div><div class="sea-small" id="seaSimpleAreaMeta"></div></div>
      <div id="seaSimpleImpact" class="sea-item" style="margin-bottom:9px"><span>🏠 ماذا يعني ذلك لشبوة؟</span><div class="sea-value" id="seaSimpleImpactValue">جاري التقييم...</div></div>
      <div id="seaSimpleOfficial" class="sea-item"><span>🌀 التصنيف المداري الرسمي</span><div class="sea-value">لا يعتمد الموقع على الأرقام وحدها لإعلان منخفض أو عاصفة.</div><div class="sea-small">التصنيف المداري والتحذيرات تُؤخذ من النشرات الرسمية عبر الزر أسفل القسم.</div></div>`;
  }
  return summary;
}

window.loadSea=async function(){
  const s=ensureSeaUI();if(s)s.innerHTML='🔄 جاري فحص مؤشرات بحر العرب...';
  try{
    const out=[];
    for(let i=0;i<seaPoints.length;i+=4){const rows=await Promise.all(seaPoints.slice(i,i+4).map(seaPoint));out.push(...rows.filter(Boolean));}
    if(!out.length)throw Error('empty sea data');
    const a=out.reduce((x,y)=>y.score>x.score?y:x),dist=window.haversine(LAT,LON,a.lat,a.lon),level=modelLevel(a);
    if(s)s.innerHTML=`${level.icon} <strong>${level.title}</strong><br><span class="sea-small">${level.note}</span>`;
    const area=document.getElementById('seaSimpleAreaValue'),meta=document.getElementById('seaSimpleAreaMeta'),impact=document.getElementById('seaSimpleImpactValue');
    if(area)area.textContent=a.name;
    if(meta)meta.textContent=`${a.lat.toFixed(1)}°N ، ${a.lon.toFixed(1)}°E • نحو ${Math.round(dist)} كم من هدى • ${fmtTime(a.time)}\nضغط ${Math.round(a.pressure)} hPa • رياح ${Math.round(a.wind)} كم/س ${dir(a.direction)} • مطر ${a.rain.toFixed(1)} ملم/س`;
    if(impact)impact.textContent=impactText(a,dist,level);

    /* تحديث الحقول القديمة إن وجدت، من نفس النقطة/الوقت لتجنب خلط قمم من أماكن مختلفة. */
    set('seaArea',a.name);set('seaTime',fmtTime(a.time));set('seaCoords',`${a.lat.toFixed(1)}°N ، ${a.lon.toFixed(1)}°E`);set('seaDistance',`نحو ${Math.round(dist)} كم`);set('seaPressure',`${Math.round(a.pressure)} hPa`);set('seaWind',`${Math.round(a.wind)} كم/س`);set('seaRain',`${a.rain.toFixed(1)} ملم/ساعة`);set('seaCloud',`${Math.round(a.cloud)}%`);set('seaHumidity',`${Math.round(a.humidity)}%`);set('seaDirection',dir(a.direction));set('seaYemen',impactText(a,dist,level));set('seaImpact',impactText(a,dist,level));
    window.seaLoaded=true;
  }catch(e){console.error(e);if(s)s.textContent='تعذر تحميل بيانات بحر العرب حاليًا. حاول مرة أخرى.';}
};
window.openSea=function(){oldSea?.();window.loadSea();};
})();