(function(root){
'use strict';
function windAlert(data,now=Date.now()){
 const hours=data?.hourly;if(!Array.isArray(hours?.time))return '';
 const lo=Math.floor(now/3600000)*3600000,hi=now+24*3600000;let peak=null;
 for(let i=0;i<hours.time.length;i++){
  const raw=hours.time[i],time=Date.parse(/[Zz]|[+-]\d\d:\d\d$/.test(raw)?raw:raw+'+03:00'),gust=hours.wind_gusts_10m?.[i];
  if(typeof gust!=='number'||!Number.isFinite(gust)||time<lo||time>=hi)continue;
  if(!peak||gust>peak.gust)peak={gust,time};
 }
 if(!peak||peak.gust<40)return '';
 const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
 const label=day(peak.time)===day(now)?'اليوم':day(peak.time)===day(now+86400000)?'غدًا':new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',weekday:'long'}).format(new Date(peak.time));
 const clock=new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(peak.time));
 return `💨 هبّات رياح متوقعة على هدى حتى ${Math.round(peak.gust)} كم/س • ${label} الساعة ${clock}`;
}
if(typeof module==='object'&&module.exports)module.exports=windAlert;else root.HadaWindAlert=windAlert;
})(typeof window==='object'?window:globalThis);
