(()=>{'use strict';
const C=window.HadaWeatherCore;let latest=null;
// Approved display threshold only; unrelated to hazard notification rules.
const MINIMUM=20;
function select(hourly,now=Date.now()){return C.nearestRain({hourly,daily:{time:[C.dayKey(now)]},engine:{schema:'hada-weather-engine-v1',fetchedAt:now}},now,MINIMUM);}
function view(data,now=Date.now()){
 const r=C.nearestRain(data,now,MINIMUM);
 if(r.state==='unavailable')return {value:'احتمال المطر غير متاح',period:'تعذّر الحصول على توقعات حديثة مكتملة'};
 if(r.state==='none')return {value:'لا تظهر فرصة مطر تبلغ 20٪ خلال التوقعات المتاحة',period:''};
 const c=r.state==='partial'?r.candidate:r,date=new Date(c.start),today=C.dayKey(now)===C.dayKey(c.start),time=new Intl.DateTimeFormat('ar-YE-u-nu-latn',{timeZone:C.ZONE,hour:'numeric',hour12:true}).format(date);
 const period=today?(c.start<=now?'اليوم · من '+time+' إلى '+new Intl.DateTimeFormat('ar-YE-u-nu-latn',{timeZone:C.ZONE,hour:'numeric',hour12:true}).format(new Date(c.start+3600000)):'اليوم · '+time):new Intl.DateTimeFormat('ar-YE-u-nu-latn',{timeZone:C.ZONE,weekday:'long',day:'numeric',month:'long'}).format(date);
 return {value:'احتمال المطر '+new Intl.NumberFormat('ar-YE-u-nu-latn',{maximumFractionDigits:0}).format(c.chance)+'٪'+(c.chance<40?' · احتمال ضعيف':''),period:(r.state==='partial'?'بعض الساعات الأقرب غير متاحة · ':'')+period};
}
function render(data=latest,now=Date.now()){latest=data;const state=view(data,now);for(const [id,value] of [['bestRainValue',state.value],['bestRainDay',state.period]]){const node=document.getElementById(id);if(node)node.textContent=value;}return state;}
window.HadaRainPeriod={select,view,render,minimum:MINIMUM};
})();
