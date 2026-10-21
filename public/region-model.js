import {shabwahGeometry} from './region-geography.js';
const HOUR=3600000;
export function inGeometry(lon,lat,g=shabwahGeometry){
 const ring=(r)=>{let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 return (g.type==='Polygon'?[g.coordinates]:g.coordinates).some(p=>ring(p[0])&&!p.slice(1).some(ring));
}
export function assessRain(snapshot,now=Date.now()){
 if(!snapshot||snapshot.schema!=='hada-local-consensus-v3'||snapshot.units!=='mm'||!Number.isFinite(snapshot.fetchedAt)||snapshot.fetchedAt>now+300000||now-snapshot.fetchedAt>3*HOUR||!Array.isArray(snapshot.data)||snapshot.data.length!==178)return {state:'unavailable',areas:[],alert:null};
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 if(snapshot.start!==day||snapshot.data.some(r=>!Number.isFinite(r.lat)||!Number.isFinite(r.lon)||!Array.isArray(r.daily)||r.daily.length!==7||r.daily.some(v=>!Number.isFinite(v)||v<0)))return {state:'unavailable',areas:[],alert:null};
 const points=snapshot.data.map(r=>({...r,total:r.daily.reduce((a,b)=>a+b,0)})),region=points.filter(r=>inGeometry(r.lon,r.lat));
 function area(id,name,rows,sampled=false){
  if(!rows.length)return {id,name,available:false};
  // These are Open-Meteo probabilities, never a percentage invented from model agreement.
  const probs=rows.flatMap(r=>Array.isArray(r.probability)?r.probability:[]).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);
  const chance=probs.length?Math.max(...probs):null,total=Math.max(...rows.map(r=>r.total));
  const daily=Array.from({length:7},(_,i)=>Math.max(...rows.map(r=>r.daily[i]))),peak=daily.indexOf(Math.max(...daily));
  return {id,name,available:true,sampled,chance,total,peak,watch:rows.some(r=>r.total>50&&r.agreement>=2),description:total<.1?'لا تظهر أمطار واضحة في الفترة المتاحة':total<10?'تظهر فرص أمطار متفرقة':total<50?'تظهر فرص أمطار تستحق المتابعة':'تراكمات مرتفعة محتملة؛ تابع التنبيهات',coverage:sampled?'نقاط ممثلة داخل المحافظة؛ لا تشمل كل القرى':'توقع عند نقطة الموقع؛ لا يشمل جميع أنحاء المديرية'};
 }
 const areas=[area('shabwa','شبوة',region,true),area('habban','حبان',points.filter(r=>r.name==='حبان')),area('huda','هدى',points.filter(r=>r.name==='هدى'))];
 // All three readers use the same scope and the same rule, including regional alerts.
 const watched=areas.filter(a=>a.watch),alert=watched.length?{kind:'rain',title:'فرص أمطار تستدعي المتابعة',text:'تظهر تراكمات مرتفعة محتملة في '+watched.map(a=>a.name).join('، ')+' خلال ٧ أيام. تابع التحديثات وابتعد عن مجاري الأودية عند هطول المطر.'}:null;
 return {state:'ready',fetchedAt:snapshot.fetchedAt,areas,alert,refreshFailed:snapshot.refreshFailed===true};
}
export function officialAlert(data,now=Date.now()){
 if(data?.state!=='active'||data.stage<2||!Number.isFinite(data.issuedAt)||now-data.issuedAt>12*HOUR||data.issuedAt>now+900000||!data.track?.targets?.some(t=>['اليمن','شبوة'].includes(t)))return null;
 return {kind:'cyclone',title:'متابعة حالة مدارية باتجاه اليمن',text:'تشير النشرة الرسمية إلى '+data.category+' باتجاه اليمن. لا يثبت ذلك وصول الحالة إلى هدى أو حبان.'};
}
