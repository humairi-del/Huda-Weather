(()=>{'use strict';
// The existing map has daily precipitation only, NOT cyclone tracks, pressure
// centres, or storm categories. Never infer a cyclone, motion, or an all-clear
// from rain colours. The orange banner is a local 7-day accumulation advisory.
const THRESHOLD_MM=50,MAX_AGE_MS=90*60*1000,ZONE='Asia/Aden';
const $=id=>document.getElementById(id);
let feedState='loading';
const number=x=>new Intl.NumberFormat('ar-YE',{maximumFractionDigits:1}).format(x);
function inRing(lon,lat,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function inGeometry(lon,lat,g){if(!g)return false;const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polygons.some(poly=>inRing(lon,lat,poly[0])&&!poly.slice(1).some(hole=>inRing(lon,lat,hole)));}
function assess(forecast,now=Date.now()){
 const hub=window.HadaMapHub,expected=hub.period(new Date(now));
 if(!forecast||forecast.units!=='mm'||!Number.isFinite(forecast.fetchedAt)||now-forecast.fetchedAt>MAX_AGE_MS||forecast.fetchedAt-now>300000||forecast.p?.start!==expected.start||forecast.p?.end!==expected.end||forecast.p?.dates?.join(',')!==expected.dates.join(',')||[...(forecast.models||[])].sort().join(',')!=='ecmwf,gfs,icon'||!Array.isArray(forecast.data)||forecast.data.length!==hub.points.length)return {kind:'unavailable'};
 const rows=[];
 for(let i=0;i<forecast.data.length;i++){
  const row=forecast.data[i],point=hub.points[i];
  if(row.lat!==point.lat||row.lon!==point.lon||!Array.isArray(row.daily)||row.daily.length!==7||row.daily.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0))return {kind:'unavailable'};
  rows.push({...point,daily:row.daily,total:row.daily.reduce((a,b)=>a+b,0)});
 }
 const local=rows.filter(row=>inGeometry(row.lon,row.lat,hub.shabwahGeometry));
 if(!local.length||!local.some(row=>row.name==='هدى')||!local.some(row=>row.name==='حبان'))return {kind:'unavailable'};
 const high=local.filter(row=>row.total>THRESHOLD_MM),scope=high.length?high:local;
 const daily=expected.dates.map((_,d)=>Math.max(...scope.map(row=>row.daily[d])));
 const peakValue=Math.max(...daily),peakDay=daily.indexOf(peakValue);
 return {kind:high.length?'rain-watch':'below-threshold',maxTotal:Math.max(...local.map(row=>row.total)),peakDay,peakValue,peakDate:expected.dates[peakDay],huda:local.find(r=>r.name==='هدى').total,habban:local.find(r=>r.name==='حبان').total,period:expected,fetchedAt:forecast.fetchedAt,stormStatus:'unavailable'};
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function dated(day){return new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,weekday:'long',day:'numeric',month:'long'}).format(new Date(day+'T12:00:00+03:00'));}
function line(list,label,body){const li=el('li');li.append(el('strong',label+' '),document.createTextNode(body));list.appendChild(li);}
function render(){
 const root=$('seaLiveBulletin');if(!root)return;
 const opened=new Set([...root.querySelectorAll('details[open]')].map(d=>d.dataset.seaDetail));
 const forecast=window.HadaMapHub?.getForecast(),state=assess(forecast),warning=state.kind==='rain-watch';
 const banner=el('div','⚠️ تتجاوز توقعات المطر ٥٠ ملم خلال أسبوع في بعض المواقع المتابعة بشبوة. تابع التحديثات والتحذيرات الرسمية.','sea-orange-alert');
 banner.hidden=!warning;banner.setAttribute('role','status');banner.setAttribute('aria-atomic','true');
 const card=el('section',undefined,'sea-static-bulletin');card.setAttribute('aria-label','توقعات المطر لهدى وحبان');card.setAttribute('aria-busy',String(state.kind==='unavailable'&&feedState==='loading'));
 card.appendChild(el('h3','توقعات هدى وحبان'));
 if(state.kind==='unavailable'){
  card.appendChild(el('p',feedState==='error'?'تعذر تحديث توقعات المطر مؤقتًا.':'جارٍ تحديث توقعات المطر…'));
 }else{
  card.appendChild(el('p','مجموع المطر المتوقع خلال ٧ أيام','sea-local-note'));
  const totals=el('dl',undefined,'sea-local-totals');
  for(const [label,value]of [['هدى',state.huda],['حبان',state.habban]]){const box=el('div');box.append(el('dt',label),el('dd',number(value)+' ملم'));totals.appendChild(box);}card.appendChild(totals);
  card.appendChild(el('p','هذه توقعات مطر محلية؛ لا تحدد مسار الحالة المدارية.','sea-local-note'));
  card.appendChild(el('p','تحديث التوقعات: '+new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,day:'numeric',month:'long',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(state.fetchedAt)),'sea-summary-time'));
  const details=el('details');details.dataset.seaDetail='local';details.appendChild(el('summary','تفاصيل توقعات المطر'));
  const list=el('ul'),when=state.peakDay===0?'اليوم':state.peakDay===1?'غدًا':`بعد ${number(state.peakDay)} أيام`;
  line(list,'التوقيت في المواقع المتابعة:',state.peakValue>=1?`أعلى كمية يومية متوقعة ${when}، ${dated(state.peakDate)}.`:'لا تبرز كمية يومية تبلغ ١ ملم.');
  line(list,'نطاق التوقيت:','أعلى كمية بين المواقع المتابعة في شبوة، وقد يختلف توقيتها في هدى وحبان.');
  line(list,'إشارة المتابعة:',warning?'يتجاوز المجموع المتوقع ٥٠ ملم في بعض المواقع خلال ٧ أيام.':'لم يتجاوز المجموع المتوقع ٥٠ ملم في المواقع المتابعة خلال ٧ أيام.');
  details.appendChild(list);details.appendChild(el('p','التوقيت يخص المطر وليس وصول حالة مدارية. البيانات من الخريطة المجمعة؛ عدم تجاوز العتبة لا يستبعد أمطارًا أو مخاطر محلية.','sea-feed-note'));card.appendChild(details);
 }
 root.dataset.state=state.kind;root.replaceChildren(window.HadaOfficialCyclone.renderCard(),banner,card);
 for(const detail of root.querySelectorAll('details'))detail.open=opened.has(detail.dataset.seaDetail);
}
function isOpen(){return !!$('seaLiveBulletin')?.isConnected&&$('infoModal')?.style.display==='block';}
function mount(box){const root=el('div',undefined,'sea-live-root');root.id='seaLiveBulletin';root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');box.replaceChildren(root);feedState='loading';render();window.HadaMapHub.ensureForecast();window.HadaOfficialCyclone.refresh();}
window.addEventListener('hada:official-cyclone',render);
window.addEventListener('hada:map-forecast',event=>{feedState=event.detail.state;render();});
setInterval(()=>{if(isOpen()){render();window.HadaMapHub.ensureForecast();}},60000);
window.HadaSeaBulletin={mount,render,assess,inGeometry,isOpen,thresholdMm:THRESHOLD_MM};
})();
