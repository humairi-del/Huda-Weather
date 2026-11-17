/* Experimental forecast screening, shared by the isolated UI and preview engine. No network or sending. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HadaWinterWeather=factory();})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const HOUR=3600000,ZONE='Asia/Aden',finite=v=>typeof v==='number'&&Number.isFinite(v);
const policy=Object.freeze({version:'hada-winter-screen-v1',northMinKmh:25,northGustKmh:40,northHours:3,coolMaxC:18,dryMaxRH:35,coldMaxC:15,dropMinC:5,coldHours:6,singleModelHours:48,modelMaxAgeMs:6*HOUR,weatherMaxAgeMs:45*60000,climatology:null});
const stamp=t=>typeof t==='string'?Date.parse(t+(/(?:Z|[+-]\d\d:\d\d)$/.test(t)?'':'+03:00')):NaN;
const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const age=(t,now,max)=>finite(t)&&t<=now+300000&&now-t<max;
const north=a=>finite(a)&&a>=0&&a<=360&&(a>=315||a<=45);
const strong=(w,g)=>finite(w)&&w>=0&&w<=250&&w>=policy.northMinKmh||finite(g)&&g>=0&&g<=300&&g>=policy.northGustKmh;
function windChill(t,w){if(!finite(t)||t>10||t< -90||!finite(w)||w<=4.8||w>100)return null;const p=w**.16;return Math.min(t,13.12+.6215*t-11.37*p+.3965*t*p);}
function family(id){return /ecmwf|aifs/i.test(id)?'ecmwf':String(id);}
function support(d,i,kind,now){
 const time=d.hourly.time[i],t=stamp(time);if(t-now<=policy.singleModelHours*HOUR)return {allowed:true,label:'توقع أولي',models:0};
 const families=new Set();for(const m of d.engine?.models||[]){if(!m.available||!age(m.provenance?.fetchedAt,now,policy.modelMaxAgeMs)||!m.hourly)continue;const j=m.hourly.time?.indexOf(time);if(j<0)continue;let ok=false;
  if(kind==='north')ok=north(m.hourly.wind_direction_10m?.[j])&&strong(m.hourly.wind_speed_10m?.[j],m.hourly.wind_gusts_10m?.[j]);
  if(kind==='temperature_drop'){const temp=m.hourly.temperature_2m?.[j],p=m.hourly.time.indexOf(new Date(t-24*HOUR+3*HOUR).toISOString().slice(0,16)),before=m.hourly.temperature_2m?.[p];ok=finite(temp)&&temp<=policy.coldMaxC&&finite(before)&&before-temp>=policy.dropMinC;}
  if(kind==='cold')ok=finite(m.hourly.temperature_2m?.[j])&&m.hourly.temperature_2m[j]<15;
  if(kind==='hot')ok=finite(m.hourly.temperature_2m?.[j])&&m.hourly.temperature_2m[j]>40;
  if(kind==='thunder')ok=[95,96,99].includes(m.hourly.weather_code?.[j]);
  if(kind==='rain')ok=[65,82].includes(m.hourly.weather_code?.[j])||finite(m.hourly.precipitation?.[j])&&m.hourly.precipitation[j]>=7.5;
  if(ok)families.add(family(m.model));
 }return {allowed:families.size>=2,label:families.size>=2?'توافق نماذج؛ قابل للتغيّر':'دعم غير كافٍ للفترة البعيدة',models:families.size};
}
function assess(d,now=Date.now()){
 const out={schema:policy.version,events:[],missing:[],state:'unavailable',until:null,climatologyAvailable:false};
 if(!d?.hourly?.time||d.engine?.schema!=='hada-weather-engine-v1'||!age(d.engine.fetchedAt,now,policy.weatherMaxAgeMs)||d.daily?.time?.[0]!==day(now)){out.missing.push('بيانات الطقس الحديثة');return out;}
 const h=d.hourly,units=d.hourly_units||{},unitOk=(k,u)=>units[k]===u;const keys={temperature_2m:'°C',wind_speed_10m:'km/h',wind_gusts_10m:'km/h',wind_direction_10m:'°',relative_humidity_2m:'%'};
 const valid=(k,i)=>unitOk(k,keys[k])&&finite(h[k]?.[i])&&(k==='temperature_2m'?h[k][i]>=-90&&h[k][i]<=65:k==='relative_humidity_2m'?h[k][i]>=0&&h[k][i]<=100:k==='wind_direction_10m'?h[k][i]>=0&&h[k][i]<=360:h[k][i]>=0&&h[k][i]<=300);
 const index=new Map(h.time.map((t,i)=>[stamp(t),i]));let missing=false,held=false,referenceMissing=false,previousFuture=null;
 const runs={north:[],temperature_drop:[]};
 for(let i=0;i<h.time.length;i++){
  const t=stamp(h.time[i]);if(!Number.isFinite(t))continue;if(t+HOUR>now){if(previousFuture===null?t>now:t!==previousFuture+HOUR)missing=true;previousFuture=t;out.until=Math.max(out.until||0,t+HOUR);}
  const w=valid('wind_speed_10m',i)?h.wind_speed_10m[i]:null,g=valid('wind_gusts_10m',i)?h.wind_gusts_10m[i]:null,a=valid('wind_direction_10m',i)?h.wind_direction_10m[i]:null,temp=valid('temperature_2m',i)?h.temperature_2m[i]:null;
  if(t+HOUR>now&&(!finite(a)||!finite(w)||!finite(g)||!finite(temp)||!valid('relative_humidity_2m',i)))missing=true;
  const n=north(a)&&strong(w,g),p=index.get(t-24*HOUR),before=valid('temperature_2m',p)?h.temperature_2m[p]:null,c=finite(temp)&&temp<=policy.coldMaxC&&finite(before)&&before-temp>=policy.dropMinC;
  if(t+HOUR>now&&finite(temp)&&temp<=policy.coldMaxC&&!finite(before))referenceMissing=true;
  for(const [kind,yes]of [['north',n],['temperature_drop',c]]){const s=support(d,i,kind,now);if(yes&&!s.allowed&&t+HOUR>now)held=true;const list=runs[kind],last=list.at(-1);if(yes&&s.allowed){if(last&&last.end===t){last.end=t+HOUR;last.indices.push(i);last.models=Math.min(last.models,s.models);}else list.push({kind,start:t,end:t+HOUR,indices:[i],models:s.models});}}
 }
 for(const [kind,list]of Object.entries(runs))for(const e of list){if(e.end<=now||e.indices.length<(kind==='north'?policy.northHours:policy.coldHours))continue;
  const vals=k=>e.indices.filter(i=>valid(k,i)).map(i=>h[k][i]),temps=vals('temperature_2m'),rh=vals('relative_humidity_2m'),winds=vals('wind_speed_10m'),gusts=vals('wind_gusts_10m');
  const score=i=>Math.max(valid('wind_speed_10m',i)?h.wind_speed_10m[i]:0,valid('wind_gusts_10m',i)?h.wind_gusts_10m[i]*.65:0);let peak=e.indices[0];for(const i of e.indices)if(kind==='north'?score(i)>score(peak):h.temperature_2m[i]<h.temperature_2m[peak])peak=i;
  const peakIndices=kind==='north'?e.indices.filter(i=>score(i)>=score(peak)*.85):e.indices.filter(i=>h.temperature_2m[i]<=h.temperature_2m[peak]+.5),center=peakIndices.indexOf(peak);let lo=center,hi=center;while(lo>0&&peakIndices[lo-1]+1===peakIndices[lo])lo--;while(hi+1<peakIndices.length&&peakIndices[hi]+1===peakIndices[hi+1])hi++;
  const feels=e.indices.map(i=>windChill(valid('temperature_2m',i)?h.temperature_2m[i]:null,valid('wind_speed_10m',i)?h.wind_speed_10m[i]:null)).filter(finite);
  const cool=e.indices.filter(i=>valid('temperature_2m',i)&&h.temperature_2m[i]<=policy.coolMaxC).length>=3,dry=e.indices.filter(i=>valid('relative_humidity_2m',i)&&h.relative_humidity_2m[i]<=policy.dryMaxRH).length>=3;
  out.events.push({...e,components:[kind],title:kind==='north'?'رياح شمالية':'انخفاض ملحوظ في الحرارة',text:kind==='north'?'رياح شمالية نشطة'+(cool&&dry?' مع برودة وجفاف':cool?' مع برودة':dry?' مع جفاف':''):'انخفاض ملحوظ في الحرارة مقارنة باليوم السابق',severity:kind==='north'&&Math.max(...winds)>=40||Math.max(...gusts)>=60?3:2,peakStart:stamp(h.time[peakIndices[lo]]),peakEnd:stamp(h.time[peakIndices[hi]])+HOUR,minTemperature:temps.length?Math.min(...temps):null,maxWind:winds.length?Math.max(...winds):null,maxGust:gusts.length?Math.max(...gusts):null,minHumidity:rh.length?Math.min(...rh):null,cool,dry,feelsLike:feels.length?Math.min(...feels):null,timingUncertain:missing,endIsForecastBoundary:e.end===out.until});
 }
 // One combined advisory for overlapping north-wind and temperature-drop periods.
 const sets=[];for(const e of out.events.sort((a,b)=>a.start-b.start)){const last=sets.at(-1);if(last&&last.end>e.start){last.items.push(e);last.end=Math.max(last.end,e.end);}else sets.push({items:[e],end:e.end});}
 out.events=sets.flatMap(g=>{const n=g.items.filter(e=>e.kind==='north'),c=g.items.filter(e=>e.kind==='temperature_drop');if(!n.length||!c.length)return g.items;const lead=n.sort((a,b)=>b.severity-a.severity)[0];return [{...lead,kind:'north_cold',components:['north','temperature_drop'],title:'رياح شمالية وانخفاض ملحوظ في الحرارة',text:'رياح شمالية تتزامن مع انخفاض ملحوظ في الحرارة'+(n.some(e=>e.dry)?' وجفاف':''),start:Math.min(...g.items.map(e=>e.start)),end:g.end,minTemperature:Math.min(...g.items.map(e=>e.minTemperature).filter(finite)),componentPeriods:g.items.map(e=>({kind:e.kind,start:e.start,end:e.end})),severity:Math.max(...g.items.map(e=>e.severity))}];});
 out.events.sort((a,b)=>a.start-b.start||b.severity-a.severity);
 if(!out.until){out.missing.push('ساعات التوقع القادمة');return out;}if(referenceMissing)out.missing.push('مرجع المقارنة الحرارية لليوم السابق');if(missing)out.missing.push('بعض متغيرات الرياح والحرارة والرطوبة');if(held)out.missing.push('دعم النماذج للفترات البعيدة');out.state=out.events.length?'active':out.missing.length?'partial':'no_signal';return out;
}
function timeLabel(t,withDay=true){return new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,...(withDay?{weekday:'long'}:{}),hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(t));}
function transition(previous,next,now=Date.now()){if(!previous?.events?.length)return null;if(next.state==='unavailable'||next.missing?.length)return 'تعذر تأكيد تحديث المتابعة؛ نقص البيانات لا يعني انتهاء الحالة.';if(!next.events.length)return previous.events.some(e=>e.end>now)?'تراجعت مؤشرات التوقع؛ يستمر التحقق مع التحديث.':'انتهت الفترة المتوقعة سابقًا؛ يُراجع أي تطور جديد.';return null;}
return {policy,assess,support,windChill,stamp,timeLabel,transition};
});
