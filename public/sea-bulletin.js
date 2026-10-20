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
 const forecast=window.HadaMapHub?.getForecast(),state=assess(forecast),warning=state.kind==='rain-watch';
 const banner=el('div','⚠️ تنبيه برتقالي: تتجاوز تراكمات الأمطار المتوقعة ٥٠ ملم خلال ٧ أيام في أجزاء من شبوة. يرجى متابعة التحديثات والتحذيرات الرسمية.','sea-orange-alert');
 banner.hidden=!warning;banner.setAttribute('role','status');banner.setAttribute('aria-atomic','true');
 const card=el('section',undefined,'sea-static-bulletin');card.setAttribute('aria-label','ملخص بحر العرب المرتبط بالخريطة');card.setAttribute('aria-busy',String(state.kind==='unavailable'&&feedState==='loading'));
 card.appendChild(el('h3','📊 مستجدات بحر العرب والمنطقة'));
 if(state.kind==='unavailable'){
  card.appendChild(el('p',feedState==='error'?'تعذر تحديث بيانات الخريطة مؤقتًا. أعد فتح النافذة للمحاولة مجددًا.':'جارٍ تحديث بيانات الخريطة المجمعة…'));
  card.appendChild(el('p','لا تتوفر بيانات حديثة مكتملة لتقييم توقعات الأمطار الآن.','sea-feed-note'));
 }else{
  const list=el('ul');
  line(list,'الحالة المتوقعة:',warning?'تراكمات أمطار مرتفعة في بعض نقاط شبوة الممثلة على الخريطة.':'لا تظهر تراكمات تتجاوز ٥٠ ملم في نقاط شبوة الممثلة خلال الأيام السبعة القادمة.');
  line(list,'هدى وحبان:',`المجموع المتوقع خلال ٧ أيام: هدى ${number(state.huda)} ملم، وحبان ${number(state.habban)} ملم.`);
  const when=state.peakDay===0?'اليوم':state.peakDay===1?'غدًا':`بعد ${number(state.peakDay)} أيام`;
  line(list,'التوقيت:',state.peakValue>=1?`أعلى كمية يومية في ${warning?'النقاط ذات التراكم المرتفع':'النقاط الممثلة'} متوقعة ${when}، ${dated(state.peakDate)}. هذا توقيت للمطر وليس موعد وصول حالة مدارية.`:'لا تبرز كمية يومية تبلغ ١ ملم في النقاط الممثلة. التوقعات قابلة للتغير.');
  card.appendChild(list);
  card.appendChild(el('p','تعتمد النشرة على نفس بيانات الخريطة المجمعة. عدم تجاوز العتبة لا يستبعد أمطارًا أو مخاطر محلية.','sea-feed-note'));
  card.appendChild(el('p','تحديث الخريطة: '+new Intl.DateTimeFormat('ar-YE',{timeZone:ZONE,day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(state.fetchedAt)),'sea-feed-updated'));
 }
 card.appendChild(el('p','تقديرات المطر المحلية مستقلة عن التصنيف الرسمي المعروض أعلاه.','sea-feed-note'));
 root.dataset.state=state.kind;root.replaceChildren(window.HadaOfficialCyclone.renderCard(),banner,card);
 
}
function isOpen(){return !!$('seaLiveBulletin')?.isConnected&&$('infoModal')?.style.display==='block';}
function mount(box){const root=el('div',undefined,'sea-live-root');root.id='seaLiveBulletin';root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');box.replaceChildren(root);feedState='loading';render();window.HadaMapHub.ensureForecast();window.HadaOfficialCyclone.refresh();}
window.addEventListener('hada:official-cyclone',render);
window.addEventListener('hada:map-forecast',event=>{feedState=event.detail.state;render();});
setInterval(()=>{if(isOpen()){render();window.HadaMapHub.ensureForecast();}},60000);
window.HadaSeaBulletin={mount,render,assess,inGeometry,isOpen,thresholdMm:THRESHOLD_MM};
})();
