// A separate experimental contract. Never masquerades as /api/weather.
export const OPEN_DATA_FIELDS = [
 {field:'الحرارة والرطوبة والرياح',status:'partial',detail:'عينات أصلية متاحة؛ عرض الحالة الحالية والتحويل الساعي لم يكتمل.'},
 {field:'المطر اليومي للموديلات',status:'available',detail:'سبعة أيام تبدأ غدًا؛ نقص الألماني ظاهر، وتقسيم حدود بعض الأيام تقديري.'},
 {field:'احتمالات المطر',status:'different',detail:'AIFS: احتمال يومي وفترات ٦ ساعات؛ بقية الموديلات بلا نسبة جاهزة. ليست النسبة الساعية الحالية.'},
 {field:'تطرف الحرارة والرياح',status:'different',detail:'من العينات الأصلية؛ AIFS متوسط تطرف عينات كل عضو، وليس تطرفًا ساعيًا كاملًا.'},
 {field:'السحب',status:'partial',detail:'السحب الإجمالية متاحة؛ المنخفضة والمتوسطة والعالية لم تُجمع بعد.'},
 {field:'الغبار',status:'available',detail:'٤٨ ساعة من عينات كل ٣ ساعات؛ لا تقدير ساعي أو تصنيف عاصفة منها وحدها.'},
 {field:'خريطة مطر الأسبوع',status:'available',detail:'٤٢٥ خلية و٣ نقاط؛ أربعة نماذج مكتملة، وAIFS نموذج واحد بمتوسط ٥١ عضوًا.'},
 {field:'المحسوسة ورمز الحالة والنهار/الليل',status:'missing',detail:'لم تُجهّز؛ لا قيم بديلة أو رموز مصطنعة.'},
 {field:'طاقة عدم الاستقرار CAPE',status:'missing',detail:'لم تُجمع في هذا المجمّع.'},
 {field:'مدى الرؤية وهبات الرياح',status:'missing',detail:'لم تُجمع؛ لا يجوز استنتاج غياب الغبار أو المخاطر من نقصها.'},
 {field:'التنبيهات وأفضل ساعة للمطر',status:'blocked',detail:'تحتاج حقول الطقس الساعي الكاملة وتعريف احتمال متوافقًا قبل نقلها.'},
 {field:'التحديث الدوري',status:'missing',detail:'البيانات لقطة تجريبية محفوظة؛ إعادة قراءتها لا تجلب تشغيلًا جديدًا.'}
];
const openFinite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export function prepareOpenDataBundle({local,aifs,region}){
 const period=local?.period;
 if(!period||Date.parse(period.endAt)-Date.parse(period.startAt)!==168*3600000)throw Error('open_period');
 if([aifs?.period,region?.period].some(p=>p?.startAt!==period.startAt||p?.endAt!==period.endAt))throw Error('open_period_mismatch');
 if(aifs.members!==51||region.cells?.length!==425||region.local?.length!==3)throw Error('open_shape');
 if(Object.keys(local.models||{}).length!==4||['ECMWF','GFS','ICON','CMC'].some(k=>!local.models[k])||Object.keys(local.errors||{}).length)throw Error('open_models_missing');
 const names={ECMWF:'الأوروبي ECMWF',GFS:'الأمريكي GFS',ICON:'الألماني ICON',CMC:'الكندي CMC',AIFS:'الأوروبي بالذكاء الاصطناعي AIFS'};
 const dates=Array.from({length:7},(_,i)=>new Date(Date.parse(period.startAt)+i*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Aden'}));
 const points=local.models?.ECMWF?.local?.map(p=>({name:p.name,lat:p.lat,lon:p.lon}));
 if(points?.length!==2)throw Error('open_points');
 const models=Object.entries(local.models).map(([key,m])=>({key,name:names[key],run:m.run,
  points:points.map(p=>{const row=m.local.find(r=>r.name===p.name);if(!row||JSON.stringify(row.daily.map(d=>d.date))!==JSON.stringify(dates))throw Error('open_dates');return {name:p.name,grid:row.series.precipitation.grid,daily:row.daily.map(d=>({date:d.date,rainMm:openFinite(d.rain.mm),completeRain:d.rain.complete===true,coveredHours:d.rain.coveredHours,estimatedBoundary:d.rain.estimatedBoundary===true,
   minimumC:openFinite(d.sampledTemperatureMinC),maximumC:openFinite(d.sampledTemperatureMaxC),windMaxKmh:openFinite(d.sampledWindMaxKmh),probabilityPercent:null,probabilityPeriod:null}))};})}));
 models.push({key:'AIFS',name:names.AIFS,run:aifs.run,points:points.map(p=>{const row=aifs.local.find(r=>r.name===p.name);if(!row||JSON.stringify(row.daily.map(d=>d.date))!==JSON.stringify(dates))throw Error('open_dates');return {name:p.name,grid:row.sourceGrid,daily:row.daily.map(d=>({date:d.date,rainMm:openFinite(d.ensembleMeanRainMm),completeRain:true,coveredHours:24,estimatedBoundary:d.estimatedDayBoundaries===true,minimumC:openFinite(d.meanMemberSampledTemperatureMinC),maximumC:openFinite(d.meanMemberSampledTemperatureMaxC),windMaxKmh:openFinite(d.meanMemberSampledWindMaxKmh),probabilityPercent:openFinite(d.dailyRainProbabilityAbove0_1mmPercent),probabilityPeriod:'allocated-yemen-day',members:51}))};})});
 const generatedAt={models:local.finishedAt,aifs:aifs.reprocessedAt||aifs.checkedAt,map:region.fetchedAt,dust:local.finishedAt};
 if(Object.values(generatedAt).some(t=>!Number.isFinite(Date.parse(t))))throw Error('open_timestamp');
 return {schema:'hada-open-data-lab-v1',experimental:true,readyForSite:false,staticSnapshot:true,period,dates,points,generatedAt,models,
  dust:local.dust,fields:OPEN_DATA_FIELDS,
  map:{period:region.period,grid:region.grid,local:region.local.map(({name,lat,lon,value,count,totals})=>({name,lat,lon,value,count,totals})),province:region.provinceSummary,cellCount:425,minimumModelCount:region.minimumCompleteModelCount,completeFive:region.completeGridFiveModels,track:null},
  probabilityDefinition:'نسبة أعضاء AIFS الـ٥١ التي يتجاوز مجموعها اليومي المقدر ٠٫١ ملم؛ تقسيم منتصف الليل تقديري. لا تساوي أعلى احتمال ساعي في البطاقة الحالية.',
  sources:['Open-Meteo AWS Open Data — CC BY 4.0','ECMWF AIFS ENS processed by dynamical.org — CC BY 4.0 / ECMWF Terms'],
  limitations:['تبدأ الفترة غدًا؛ لا تُقارن بمجموع أسبوع يبدأ اليوم.','آخر يوم للألماني ناقص ٩ ساعات.','لا تصحيح ارتفاع أو استيفاء مكاني.','الحرارة والرياح من عينات أصلية؛ اختلافها لا يثبت تحسن الدقة أو تراجعها.']};
}
export function openDataFreshness(bundle,now=Date.now()){
 const maximumAge=6*3600000;
 const ages=Object.fromEntries(Object.entries(bundle.generatedAt).map(([k,t])=>[k,now-Date.parse(t)]));
 const state=Object.fromEntries(Object.entries(ages).map(([k,v])=>[k,Number.isFinite(v)&&v>=0&&v<=maximumAge?'within-review-window':'stale']));
 return {maximumAgeHours:6,agesMilliseconds:ages,state,fresh:Object.values(state).every(v=>v==='within-review-window'),generatedAt:bundle.generatedAt,readAt:new Date(now).toISOString()};
}
export function openDataGateway(request,bundle,now=Date.now()){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json; charset=utf-8'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 if(request.method!=='GET')return reply({error:'method_not_allowed'},405);
 const url=new URL(request.url),kind=url.searchParams.get('kind')||'status';
 if([...url.searchParams.keys()].some(k=>k!=='kind'))return reply({error:'invalid_query'},400);
 if(kind==='current')return reply({error:'not_a_current_weather_adapter',missing:OPEN_DATA_FIELDS.filter(f=>['missing','blocked'].includes(f.status)),readyForSite:false},409);
 if(!['status','models','dust','map','all'].includes(kind))return reply({error:'invalid_kind'},400);
 if(!bundle)return reply({error:'open_data_not_built'},503);
 const freshness=openDataFreshness(bundle,now),meta={experimental:true,readyForSite:false,staticSnapshot:true,freshness,usableForPublicForecast:false};
 if(kind==='all')return reply({...bundle,...meta});
 if(kind==='models')return reply({...meta,period:bundle.period,dates:bundle.dates,points:bundle.points,models:bundle.models,probabilityDefinition:bundle.probabilityDefinition});
 if(kind==='dust')return reply({...meta,dust:bundle.dust});
 if(kind==='map')return reply({...meta,map:bundle.map});
 return reply({...meta,period:bundle.period,fields:bundle.fields,sources:bundle.sources,limitations:bundle.limitations});
}
