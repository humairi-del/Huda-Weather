import {assessRain,officialAlert} from './region-model.js';
const $=id=>document.getElementById(id),num=n=>new Intl.NumberFormat('ar-YE',{maximumFractionDigits:0}).format(n);
const time=at=>new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let region=null,regionError=false,localHazard=window.HadaLiveWeather?.getHazard()||null,weather=window.HadaLiveWeather?.getData()||null;
function official(){return window.HadaOfficialCyclone.getData();}
function tech(root,assessment){root.replaceChildren();for(const a of assessment.areas||[]){root.append(el('p',a.name+': '+(a.available?num(a.total)+' ملم خلال ٧ أيام. '+a.coverage:'البيانات غير متاحة')));}root.append(el('p','كميات المطر: متوسط ECMWF وGFS وICON عبر Open-Meteo. النسب: precipitation_probability_max من توقع Open-Meteo المرجعي؛ ليست احتمال وصول حالة مدارية. التنبيه: تجاوز ٥٠ ملم واتفاق نموذجين على الأقل، ضمن نقاط النطاق نفسه.'));}
function render(){
 const a=region?assessRain(region.rain):{state:'unavailable',areas:[],alert:null};
 const storm=official(),stormAlert=officialAlert(storm),candidate=stormAlert||a.alert;
 const localFresh=localHazard?.active&&Date.now()-localHazard.checkedAt<90*60000;
 const box=$('activeHazardBox');box.dataset.state=candidate||localFresh?'active':a.state==='ready'?'quiet':'unavailable';
 $('hazardTitle').textContent=candidate?candidate.title:localFresh?'انتبه لاحتمال أمطار غزيرة':a.state==='ready'?'لا يظهر تنبيه مطر في البيانات المتاحة':'لا توجد تحديثات جديدة مكتملة للمنطقة';
 $('hazardMessage').textContent=candidate?candidate.text:localFresh?'تقديرات الطقس الحالي تشير إلى أمطار قوية؛ ابتعد عن مجاري الأودية.':a.state==='ready'?'تابع أقرب فرصة مطر والتوقعات أدناه.':'';
 $('hazardChecked').hidden=false;$('hazardChecked').textContent=a.fetchedAt?(regionError||a.refreshFailed?'آخر بيانات صالحة · ':'آخر تحديث · ')+time(a.fetchedAt):'نعيد المحاولة تلقائيًا؛ غياب البيانات لا يعني غياب المخاطر.';
 $('hazardDetails').hidden=!candidate;$('hazardDetails').href=candidate?.kind==='cyclone'?'#arabianSea':'#weatherMapHub';
 $('regionOverview').textContent=a.areas.length?a.areas.map(x=>x.name+': '+x.description).join(' ← '):'شبوة ← حبان ← هدى';
 const system=storm?storm.state==='active'?storm.category+(storm.name?' «'+storm.name+'»':''):storm.summary:'لا توجد نشرة رسمية حديثة متاحة للتحقق';
 $('seaSystem').textContent=system;
 $('seaConnection').textContent=stormAlert?'ورد اتجاه نحو اليمن في النشرة؛ التأثير على المواقع المحلية يحتاج متابعة.':storm?'لم تُثبت النشرة المقروءة وصول الحالة إلى هدى أو حبان. '+storm.track.text:'لا يمكن تحديد تأثير الحالة البحرية دون نشرة حديثة. توقعات المطر المحلية مستقلة.';
 const flow=$('seaImpact');flow.replaceChildren();
 for(const area of a.areas){const card=el('article',undefined,'region-place');card.append(el('h3',area.name),el('div',area.chance===null||area.chance===undefined?'النسبة غير متاحة':num(area.chance)+'٪','region-chance'),el('p',area.description),el('small',area.id==='shabwa'?'أعلى احتمال يومي في النقاط الممثلة من شبوة':'أعلى احتمال يومي للمطر خلال ٧ أيام'));flow.append(card);}
 if(!a.areas.length)flow.append(el('p','لا توجد تحديثات جديدة لتوقعات المطر المحلي.'));
 $('rainMapSimple').textContent=a.areas.length?a.areas.map(x=>x.name+': '+x.description).join(' · '):'لا توجد تحديثات جديدة للخريطة الآن.';
 tech($('hazardTechnical'),a);tech($('seaTechnical'),a);
 $('seaOfficialTechnical').replaceChildren(window.HadaOfficialCyclone.renderCard());
}
async function refreshRegion(force=false){$('refreshHazards').disabled=true;try{region=await window.HadaData.region(force);regionError=false;}catch{regionError=true;}finally{$('refreshHazards').disabled=false;render();}}
window.addEventListener('hada:region',e=>{region=e.detail;regionError=false;render();});
window.addEventListener('hada:region-error',()=>{regionError=true;render();});
window.addEventListener('hada:official-cyclone',render);
window.addEventListener('hada:local-hazard',e=>{localHazard=e.detail;render();});
$('refreshHazards').onclick=()=>refreshRegion(true);
$('refreshSea').onclick=async()=>{const b=$('refreshSea');b.disabled=true;try{await Promise.all([refreshRegion(true),window.HadaOfficialCyclone.refresh(true)]);}finally{b.disabled=false;render();}};
// Existing tab controls become a single forecast view; each has one content panel.
function forecastTab(){const selected=document.querySelector('[data-period][aria-selected="true"]')?.dataset.period||'today';$('forecastHours').hidden=selected!=='today';$('forecastWeek').hidden=selected!=='week';$('forecastTomorrow').hidden=selected!=='tomorrow';if(weather&&selected==='tomorrow'){const d=weather.daily,chance=d.precipitation_probability_max?.[1];$('forecastTomorrow').textContent='غدًا في هدى: '+num(d.temperature_2m_min[1])+'° إلى '+num(d.temperature_2m_max[1])+'°'+(Number.isFinite(chance)?' · احتمال المطر '+num(chance)+'٪':'');}document.querySelector('[data-open="sea"]').textContent='متابعة بحر العرب';}
for(const b of document.querySelectorAll('[data-period]')){b.addEventListener('click',forecastTab);b.addEventListener('keydown',()=>queueMicrotask(forecastTab));}
window.addEventListener('hada:weather',e=>{weather=e.detail;forecastTab();});forecastTab();
for(const b of document.querySelectorAll('[data-open="sea"]'))b.onclick=()=>$('arabianSea').scrollIntoView({behavior:'smooth',block:'start'});
$('openNotificationSettings').onclick=()=>$('installApp').click();
$('activateUnifiedAlerts').disabled=true;$('activateUnifiedAlerts').textContent='معاينة الإشعارات';$('unifiedAlertsStatus').textContent='هذه معاينة مستقلة. الاشتراك والإرسال معطّلان لحماية إعدادات الموقع الحقيقي.';
$('viewWeatherAlerts').onclick=()=>{$('installModal').style.display='none';document.body.style.overflow='';$('weatherAlerts').scrollIntoView({behavior:'smooth'});};
// Disable the old browser-permission fallback on returning to a preview tab.
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('activateUnifiedAlerts').disabled=true;$('activateUnifiedAlerts').onclick=()=>{};refreshRegion();window.HadaOfficialCyclone.refresh();}});
refreshRegion();window.HadaOfficialCyclone.refresh();
setInterval(()=>{if(!document.hidden)refreshRegion();},3600000);
setInterval(()=>{if(!document.hidden)window.HadaOfficialCyclone.refresh();},6*3600000);
window.addEventListener('online',()=>refreshRegion());
const query=new URLSearchParams(location.search);if(query.get('sea')==='tracking')$('arabianSea').scrollIntoView();
