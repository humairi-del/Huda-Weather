(()=>{'use strict';
const ZONE='Asia/Aden',HOUR=3600000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const number=n=>new Intl.NumberFormat('ar-YE',{maximumFractionDigits:1}).format(n);
const time=n=>new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(n));
const date=n=>new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(n));
function select(hourly,now=Date.now()){
 if(!Array.isArray(hourly?.time)||!Array.isArray(hourly.precipitation_probability))return null;
 let best=null;
 hourly.time.forEach((stamp,i)=>{
  if(typeof stamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(stamp))return;
  const start=Date.parse(stamp+'+03:00'),end=start+HOUR,probability=hourly.precipitation_probability[i];
  if(!Number.isFinite(start)||end<=now||!finite(probability)||probability<0||probability>100)return;
  const raw=hourly.precipitation?.[i],amount=finite(raw)&&raw>=0?raw:null;
  if(!best||probability>best.probability||(probability===best.probability&&start<best.start))best={start,end,probability,amount,current:start<=now};
 });
 return best;
}
function view(hourly,now=Date.now()){
 const best=select(hourly,now);
 if(!best)return {value:'—',period:'البيانات غير متاحة',note:'تظهر أفضل فرصة عند توفر توقعات حديثة.'};
 if(best.probability===0)return {value:'٠٪',period:'خلال الفترة المتاحة',note:'لا تظهر فرصة مطر واضحة في الساعات القادمة.'};
 const dayChange=new Date(best.start+3*HOUR).toISOString().slice(0,10)!==new Date(best.end+3*HOUR).toISOString().slice(0,10);
 const period=date(best.start)+' · من '+time(best.start)+' إلى '+(dayChange?date(best.end)+'، ':'')+time(best.end);
 const amount='';const tech=document.getElementById('bestRainTechnical');if(tech)tech.textContent=best.amount===null?'كمية المطر غير متاحة.':`كمية المطر المتوقعة للساعة كاملة: ${number(best.amount)} ملم. المصدر: Open-Meteo.`;
 return {value:number(best.probability)+'٪',period,note:(best.current?'فرصة المطر خلال هذه الساعة. ':'أقرب فترة ذات أعلى احتمال للمطر. ')+'التوقعات قابلة للتغيّر.'};
}
function render(data,now=Date.now()){
 const state=view(data?.hourly,now);
 for(const [id,text] of [['bestRainValue',state.value],['bestRainDay',state.period],['bestRainNote',state.note]]){const node=document.getElementById(id);if(node)node.textContent=text;}
 return state;
}
window.HadaRainPeriod={select,view,render};
})();
