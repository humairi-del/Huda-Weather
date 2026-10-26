/* Experimental, deterministic forecast screening. Never an observed or official warning. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HadaSandstorm=factory();})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const HOUR=3600000,ZONE='Asia/Aden';
// Screening gates only: NOT locally calibrated storm or health thresholds.
const policy=Object.freeze({version:'huda-sandstorm-screen-v1',horizonHours:48,dustMinimum:200,windMinimumKmh:30,gustMinimumKmh:50,visibilityMaximumM:3000,stormVisibilityM:1000,humidityMaximum:85,rainMaximumMm:.2,dustMaxAgeMs:6*HOUR,weatherMaxAgeMs:45*60000,nativeWindowMs:3*HOUR});
const finite=v=>typeof v==='number'&&Number.isFinite(v),stamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:00$/.test(s)?Date.parse(s+'+03:00'):NaN;
const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const ageOk=(t,now,limit)=>finite(t)&&t<=now+300000&&now-t<limit;
const ordered=a=>Array.isArray(a)&&a.length>0&&a.every((t,i)=>Number.isFinite(stamp(t))&&(!i||stamp(t)-stamp(a[i-1])===HOUR));
function assess(d,now=Date.now()){
 const output={schema:policy.version,kind:'experimental_model_forecast',state:'unavailable',events:[],confidence:'limited',probability:null,evaluatedAt:now,coverage:null,missing:[],signals:[],sources:{weather:'Open-Meteo forecast',dust:'CAMS Global via Open-Meteo'},issuedAt:null,observed:false,staleCache:!!d?.engine?.staleCache};
 const unavailable=reason=>({...output,missing:[reason]});
 if(!finite(now)||d?.engine?.centralSchema!=='hada-rasid-v1')return unavailable('central_forecast_unavailable');
 if(!ageOk(d.engine.fetchedAt,now,policy.weatherMaxAgeMs)||d.daily?.time?.[0]!==day(now))return unavailable('weather_expired');
 const h=d.hourly,dust=d.engine.dust,p=dust?.provenance,fp=d.provenance?.forecast;
 if(d.timezone!==ZONE||dust?.timezone!==ZONE||p?.kind!=='model_forecast'||p?.model!=='cams_global'||fp?.kind!=='model_forecast')return unavailable('source_unverified');
 const point=p.requestedLocation,weatherPoint=fp.requestedLocation;
 if(!point||!weatherPoint||![point.latitude,point.longitude,weatherPoint.latitude,weatherPoint.longitude].every(finite)||point.id!==weatherPoint.id||point.latitude!==weatherPoint.latitude||point.longitude!==weatherPoint.longitude)return unavailable('location_mismatch');
 if(!ageOk(p.fetchedAt,now,policy.dustMaxAgeMs))return unavailable('dust_expired');
 if(dust.hourly_units?.dust!=='µg/m³'||d.hourly_units?.wind_speed_10m!=='km/h'||d.hourly_units?.wind_gusts_10m!=='km/h'||d.hourly_units?.visibility!=='m'||d.hourly_units?.relative_humidity_2m!=='%'||d.hourly_units?.precipitation!=='mm'||d.hourly_units?.weather_code!=='wmo code')return unavailable('unit_mismatch');
 if(!ordered(h?.time)||!ordered(dust.hourly?.time))return unavailable('time_axis_invalid');
 const start=Math.floor(now/HOUR)*HOUR,end=start+policy.horizonHours*HOUR,wi=new Map(h.time.map((t,i)=>[stamp(t),i])),di=new Map(dust.hourly.time.map((t,i)=>[stamp(t),i])),bins=new Map();
 output.coverage={from:now,to:end,weatherFetchedAt:d.engine.fetchedAt,dustFetchedAt:p.fetchedAt,nativeDustStepMinutes:p.nativeStepMinutes??180};
 let missing=0,unresolved=0;
 for(let t=start;t<end;t+=HOUR){
  const i=wi.get(t),j=di.get(t),v=dust.hourly.dust?.[j];
  const wind=h.wind_speed_10m?.[i],gust=h.wind_gusts_10m?.[i],visibility=h.visibility?.[i],humidity=h.relative_humidity_2m?.[i],rain=h.precipitation?.[i],code=h.weather_code?.[i];
  const dustOk=finite(v)&&v>=0,windOk=finite(wind)&&wind>=0,gustOk=finite(gust)&&gust>=0,visOk=finite(visibility)&&visibility>=0;
  const contextOk=finite(humidity)&&humidity>=0&&humidity<=100&&finite(rain)&&rain>=0&&Number.isInteger(code)&&[0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99].includes(code);
  if(!dustOk||!windOk||!gustOk||!visOk||!contextOk){missing++;if(dustOk&&v>=policy.dustMinimum)unresolved++;continue;}
  if(v<policy.dustMinimum)continue;
  if(wind<policy.windMinimumKmh&&gust<policy.gustMinimumKmh){unresolved++;continue;}
  // Cannot attribute poor visibility to dust amid rain/fog or other competing causes.
  if(![0,1,2,3].includes(code)||rain>=policy.rainMaximumMm||humidity>=policy.humidityMaximum){unresolved++;continue;}
  if(visibility>policy.visibilityMaximumM){unresolved++;continue;}
  const bucket=Math.floor(t/policy.nativeWindowMs)*policy.nativeWindowMs,key=String(bucket),type=visibility<policy.stormVisibilityM?'possible_sandstorm':'possible_blowing_dust';
  let e=bins.get(key);if(!e){e={start:bucket,end:bucket+policy.nativeWindowMs,type,severity:visibility<policy.stormVisibilityM?'potential_major_visibility_loss':'potential_reduced_visibility',confidence:'limited',probability:null,firstSignal:t,lastSignal:t,minimumVisibilityM:visibility,windMaximumKmh:wind,gustMaximumKmh:gust,samples:0,independentDustRuns:null};bins.set(key,e);}
  e.samples++;e.lastSignal=t;e.minimumVisibilityM=Math.min(e.minimumVisibilityM,visibility);e.windMaximumKmh=Math.max(e.windMaximumKmh,wind);e.gustMaximumKmh=Math.max(e.gustMaximumKmh,gust);if(type==='possible_sandstorm'){e.type=type;e.severity='potential_major_visibility_loss';}
 }
 output.events=[...bins.values()].map(e=>({...e,inProgress:e.start<=now,timingUncertain:missing>0,leadHours:Math.max(0,(e.start-now)/HOUR),windowPrecisionHours:3}));
 output.missing=missing?['some_forecast_hours']:[];output.signals=unresolved?['uncorroborated_dust']:[];
 output.state=output.events.length?'potential':missing?'partial':unresolved?'monitor':'no_signal';return output;
}
function transition(previous,next){
 if(!previous||previous.schema!==next.schema)return null;
 const a=previous.events||[],b=next.events||[];
 if(['unavailable','partial'].includes(next.state)&&!b.length)return a.length?'تعذر تحديث التقدير السابق؛ لا يعني ذلك زوال احتمال الخطر.':null;
 if(a.length&&!b.length)return a.every(e=>e.end<=next.evaluatedAt)?'انتهت الفترة المتوقعة السابقة؛ لا يتوفر هنا رصد يؤكد انتهاء الغبار.':'تراجعت مؤشرات التأثر في أحدث توقع متاح؛ لا يُعد ذلك تأكيدًا لزوال الخطر.';
 if(!a.length&&b.length)return 'ظهرت مؤشرات جديدة لتأثر محتمل بالغبار.';
 const signature=rows=>JSON.stringify(rows.map(e=>[e.start,e.end,e.type]));
 return signature(a)!==signature(b)?'تغيّر وقت التأثير المحتمل أو شدته في أحدث توقع متاح.':null;
}
const time=t=>new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long',day:'numeric',month:'short',hour:'numeric',hour12:true}).format(new Date(t));
function describe(result){
 const retained=result.staleCache?' تقدير محفوظ من آخر بيانات صالحة؛ تعذر تجديد المصدر، وليس تحديثًا جديدًا.':'';
 if(result.events.length){const e=result.events[0];return {title:e.type==='possible_sandstorm'?'احتمال تأثر هدى بعاصفة رملية — تقدير تجريبي':'احتمال غبار مثار يؤثر على هدى — تقدير تجريبي',text:'فترة التأثير المحتملة: '+time(e.start)+' إلى '+time(e.end)+'. '+(e.type==='possible_sandstorm'?'قد تنخفض الرؤية كثيرًا خلال جزء من الفترة.':'قد تتراجع الرؤية خلال جزء من الفترة.')+' الثقة محدودة؛ هذه فترة تقديرية وليست موعد وصول مؤكدًا.'+(e.timingUncertain?' بعض البيانات ناقصة؛ قد توجد فترة تأثير أقرب غير محسومة.':'')+(result.events.length>1?' توجد فترات محتملة أخرى خلال الساعات القادمة.':'')+retained};}
 if(result.state==='unavailable'||result.state==='partial')return {title:'تقدير العواصف الرملية غير مكتمل',text:'البيانات ناقصة أو قديمة؛ لا يمكن تحديد التأثير أو وقته، ولا يعني ذلك انتفاء الخطر.'};
 if(result.state==='monitor')return {title:'مؤشرات غبار تحتاج متابعة',text:'لا تكفي المؤشرات المتاحة لتوقع عاصفة رملية أو تحديد وقت وصولها.'};
 return {title:'متابعة العواصف الرملية',text:'لا تظهر مؤشرات مجتمعة كافية لتوقع عاصفة خلال نحو ٤٨ ساعة. هذا ليس نفيًا للخطر، وقد تفوت النماذج العواصف المحلية المفاجئة.'+retained};
}
return {policy,assess,transition,describe};
});
