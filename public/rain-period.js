(()=>{'use strict';
const ZONE='Asia/Aden',HOUR=3600000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
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
 if(!best)return {value:'احتمال المطر غير متاح',period:'بانتظار توقعات حديثة'};
 return {value:'احتمال المطر '+new Intl.NumberFormat('ar-YE-u-nu-latn',{maximumFractionDigits:0}).format(best.probability)+'٪',period:new Intl.DateTimeFormat('ar-YE-u-nu-latn',{timeZone:ZONE,weekday:'long',day:'numeric',month:'long'}).format(new Date(best.start))};
}
function render(data,now=Date.now()){
 const state=view(data?.hourly,now);
 for(const [id,value] of [['bestRainValue',state.value],['bestRainDay',state.period]]){const node=document.getElementById(id);if(node)node.textContent=value;}return state;
}
window.HadaRainPeriod={select,view,render};
})();
