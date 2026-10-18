// Forecast advisories for two fixed local points; never infer a cyclone from rain.
export const TEST_APP='9fedd24f-9a4d-4445-9a60-af736cb71c89';
export const POINTS=[{name:'هدى',lat:14.230586,lon:47.199415},{name:'حبان',lat:14.3545083,lon:47.0802023}];
export const MODELS=['ecmwf','gfs','dwd-icon'];
export const LINK='https://redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev/';
export function period(now=new Date()){
 const start=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const zero=Date.parse(start+'T00:00:00Z');
 return {start,dates:Array.from({length:7},(_,i)=>new Date(zero+i*86400000).toISOString().slice(0,10))};
}
export function consensus(models,now=new Date()){
 const {start,dates}=period(now);
 if(Object.keys(models).length!==3||!MODELS.every(m=>Array.isArray(models[m])&&models[m].length===2))throw Error('missing_model');
 for(const model of MODELS)for(let i=0;i<2;i++){
  const row=models[model][i];
  if(!row||!Number.isFinite(row.latitude)||!Number.isFinite(row.longitude)||Math.abs(row.latitude-POINTS[i].lat)>0.5||Math.abs(row.longitude-POINTS[i].lon)>0.5||row.timezone!=='Asia/Aden'||row.daily_units?.precipitation_sum!=='mm'||JSON.stringify(row.daily?.time)!==JSON.stringify(dates)||row.daily?.precipitation_sum?.length!==7||!row.daily.precipitation_sum.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=2000))throw Error('invalid_forecast');
 }
 return {start,dates,checkedAt:now.getTime(),points:POINTS.map((p,i)=>{
  const totals=MODELS.map(m=>models[m][i].daily.precipitation_sum.reduce((a,b)=>a+b,0));
  const daily=dates.map((_,day)=>MODELS.reduce((sum,m)=>sum+models[m][i].daily.precipitation_sum[day],0)/3);
  return {...p,daily,total:daily.reduce((a,b)=>a+b,0),agreement:totals.filter(v=>v>50).length};
 })};
}
export function rainAdvisory(data,now=new Date()){
 const {start,dates}=period(now);
 if(data?.start!==start||JSON.stringify(data.dates)!==JSON.stringify(dates)||!Number.isFinite(data.checkedAt)||Math.abs(now.getTime()-data.checkedAt)>15*60000||data.points?.length!==2)throw Error('stale_consensus');
 const affected=data.points.filter((p,i)=>p.name===POINTS[i].name&&p.lat===POINTS[i].lat&&p.lon===POINTS[i].lon&&Number.isFinite(p.total)&&p.total>50&&p.agreement>=2);
 if(!affected.length)return null;
 const detail=affected.map(p=>p.name+' نحو '+Math.round(p.total)+' ملم').join('، ');
 return {kind:'rain',eventKey:'rain:'+start,title:'🌧️ تنبيه أمطار متوقعة — اختبار طقس هدى',text:'تشير توقعات النماذج الثلاثة خلال ٧ أيام إلى تراكم أمطار: '+detail+'. هذه توقعات قابلة للتغير وليست تأكيدًا لسيول. تابع التحديثات والتحذيرات الرسمية.',url:LINK+'?map=rain#weatherMapHub',date:start};
}
export function cycloneAdvisory(data,now=new Date()){
 let source;try{source=new URL(data?.sourceUrl);}catch{return null;}
 const targets=data?.track?.targets;
 if(data?.schema!=='hada-imd-cyclone-v1'||data.state!=='active'||data.basin!=='Arabian Sea'||!Number.isInteger(data.stage)||data.stage<2||data.stage>4||!Number.isFinite(data.issuedAt)||data.issuedAt>now.getTime()+15*60000||now.getTime()-data.issuedAt>12*3600000||source.origin!=='https://rsmcnewdelhi.imd.gov.in'||!source.pathname.startsWith('/uploads/')||!source.pathname.endsWith('.pdf')||!Array.isArray(targets)||!targets.some(t=>['شبوة','اليمن'].includes(t))||typeof data.category!=='string'||data.category.length>100||!data.category||typeof data.id!=='string'||!data.id||data.id.length>100)return null;
 return {kind:'cyclone',eventKey:'cyclone:'+data.id+':stage:'+data.stage+':'+period(now).start,title:'🟠 متابعة حالة مدارية — اختبار طقس هدى',text:'تذكر نشرة المركز الإقليمي للأعاصير في نيودلهي حالة مصنفة: '+data.category+'، مع اتجاه نحو '+targets.filter(t=>['شبوة','اليمن'].includes(t)).join(' و')+'. تابع النشرة الرسمية؛ لا يثبت هذا وحده وصول الحالة إلى هدى أو حبان.',url:LINK+'?sea=tracking',date:period(now).start,sourceUrl:source.href};
}
