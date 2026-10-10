(()=>{'use strict';
const LAT=14.230586,LON=47.199415;
const layers=[['الرطوبة','rh'],['الرياح','wind'],['الأمطار','rain']];
function start(){
 const modal=document.getElementById('seaModal'),root=modal?.querySelector('.sea-content');if(!root||document.getElementById('moistWaves72'))return;
 const panel=document.createElement('section');panel.id='moistWaves72';panel.style.cssText='margin:18px 0;border:1px solid #267d9b;border-radius:15px;background:#0b2535;overflow:hidden;color:#e9f8ff';
 panel.innerHTML='<button id="moistToggle" type="button" aria-expanded="false" style="width:100%;padding:17px;border:0;background:#103e51;color:white;text-align:right;font-size:19px;font-weight:bold;cursor:pointer">💧 الموجات الرطبة — متابعة 3 أيام <span style="float:left">⌄</span></button><div id="moistBody" hidden style="padding:14px"><p style="line-height:1.9;color:#bcd8e4;margin-top:0">ملخص الموجات الرطبة وتأثيرها المحتمل خلال 72 ساعة.</p><div id="moistReport" aria-live="polite" style="line-height:2;background:#0a1d2b;border-radius:10px;padding:12px">اضغط لعرض التحليل.</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:13px 0" id="moistLayers"></div><div style="border-radius:12px;overflow:hidden"><iframe id="moistMap" title="خريطة الموجات الرطبة" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:360px;border:0" allowfullscreen></iframe></div><p style="font-size:12px;line-height:1.9;color:#9dc3d0">الخريطة للتوضيح، والتوقعات ليست إنذارًا رسميًا.</p></div>';
 const anchor=root.querySelector('.route');if(anchor)root.insertBefore(panel,anchor);else root.appendChild(panel);
 const body=panel.querySelector('#moistBody'),report=panel.querySelector('#moistReport'),frame=panel.querySelector('#moistMap'),buttons=panel.querySelector('#moistLayers');let loaded=false;let refreshPending=false;
 function map(layer){const u=new URL('https://embed.windy.com/embed2.html');Object.entries({lat:'14',lon:'51',detailLat:'14.23',detailLon:'47.20',zoom:'5',level:'surface',overlay:layer,product:'ecmwf',menu:'',message:'true',marker:'false',calendar:'now',pressure:'false',type:'map',location:'coordinates',detail:'false',metricWind:'km/h',metricTemp:'°C'}).forEach(([k,v])=>u.searchParams.set(k,v));frame.src=u.toString();}
 layers.forEach(([name,layer],i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.style.cssText='border:1px solid #428baa;border-radius:9px;padding:9px 14px;color:white;background:'+(i?'#12354a':'#08779a');b.addEventListener('click',()=>{[...buttons.children].forEach(x=>x.style.background='#12354a');b.style.background='#08779a';map(layer)});buttons.appendChild(b)});
 panel.querySelector('#moistToggle').addEventListener('click',()=>{body.hidden=!body.hidden;panel.querySelector('#moistToggle').setAttribute('aria-expanded',String(!body.hidden));if(!body.hidden&&!loaded){loaded=true;map('rh');load()}else if(!body.hidden&&!refreshPending){refreshPending=true;load().finally(()=>{refreshPending=false})}});
 async function load(){report.textContent='🔄 جاري تحليل توقعات الأيام الثلاثة...';try{
 const u=new URL('https://api.open-meteo.com/v1/forecast');Object.entries({latitude:String(LAT),longitude:String(LON),hourly:'relative_humidity_2m,relative_humidity_850hPa,wind_speed_850hPa,wind_direction_850hPa,cloud_cover,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m',forecast_hours:'72',timezone:'Asia/Aden'}).forEach(([k,v])=>u.searchParams.set(k,v));
 const response=await fetch(u);if(!response.ok)throw Error('forecast unavailable');const data=await response.json(),h=data.hourly;if((h?.time?.length||0)<72)throw Error('empty forecast');
 const dayReports=[0,1,2].map(j=>{const date=h.time[j*24]+' إلى '+h.time[j*24+23];const indices=Array.from({length:24},(_,i)=>j*24+i);const avg=(key)=>{const v=indices.map(i=>h[key]?.[i]).filter(Number.isFinite);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;};const humidity=avg('relative_humidity_2m'),upperHumidity=avg('relative_humidity_850hPa'),upperWind=avg('wind_speed_850hPa'),upperDirection=avg('wind_direction_850hPa'),cloud=avg('cloud_cover'),chance=Math.max(0,...indices.map(i=>Number(h.precipitation_probability?.[i]||0))),rain=indices.reduce((a,i)=>a+Number(h.precipitation?.[i]||0),0);let assessment=chance>=65&&cloud!==null&&cloud>=50?'توجد ظروف أكثر ملاءمة للأمطار':chance>=35?'توجد فرصة مطر تحتاج متابعة':'لا تظهر إشارة قوية لهطول المطر';return {date,humidity,upperHumidity,upperWind,upperDirection,cloud,chance,rain,assessment}});

 const line=(label,value)=>{const node=document.createElement('div');node.style.cssText='padding:12px 2px;border-bottom:1px solid #24485a;line-height:1.9';const heading=document.createElement('strong');heading.textContent=label+' : ';node.appendChild(heading);const detail=document.createElement('span');detail.textContent=value;node.appendChild(detail);report.appendChild(node);return detail};
 report.replaceChildren();
 const state=line('💧 الحالة','جاري مقارنة رطوبة بحر العرب والساحل...');
 const arrival=line('📍 حبان وهدى','لم يتأكد اتجاه وصول موجة رطبة أو توقيتها.');
 const validChance=h.precipitation_probability?.slice(0,72)?.filter(Number.isFinite)||[];const maxChance=validChance.length>=36?Math.max(...validChance):null;
 const rain=line('🌧️ الأمطار',maxChance===null?'بيانات فرص المطر غير مكتملة.':maxChance>=65?'توجد فرص مطر تستحق المتابعة خلال 72 ساعة؛ شدتها غير مؤكدة.':maxChance>=35?'توجد فرص مطر محدودة خلال 72 ساعة؛ شدتها غير مؤكدة.':'لا تظهر فرصة مطر قوية خلال 72 ساعة؛ لا يمكن تحديد الشدة.');

 const seaSites=[['غرب بحر العرب',13,53],['قرب سقطرى',12.5,54.5],['ساحل شبوة',14.2,48.6],['حبان وهدى',LAT,LON]];
 async function siteForecast(site){const url=new URL('https://api.open-meteo.com/v1/forecast');Object.entries({latitude:String(site[1]),longitude:String(site[2]),hourly:'relative_humidity_850hPa,wind_speed_850hPa,wind_direction_850hPa',forecast_hours:'72',timezone:'Asia/Aden'}).forEach(([k,v])=>url.searchParams.set(k,v));const response=await fetch(url);if(!response.ok)throw Error('marine comparison unavailable');const d=await response.json();return {name:site[0],hourly:d.hourly}};

 try{const sites=await Promise.all(seaSites.map(siteForecast));const samples=sites.map(site=>{const values=site.hourly?.relative_humidity_850hPa?.slice(0,72)?.filter(Number.isFinite)||[];return values.length>=48?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null});
 const [sea,island,coast,inland]=samples;
 if([sea,island,coast,inland].some(x=>x===null)){state.textContent='بيانات الرطوبة غير مكتملة؛ لا يمكن تأكيد وجود موجة رطبة.'}
 else if(Math.max(sea,island)>=70){state.textContent='رطوبة مرتفعة فوق أجزاء من بحر العرب؛ اتجاه حركة موجة محددة غير مؤكد.';if(coast>=70&&inland>=65)arrival.textContent='رطوبة مرتفعة أيضًا قرب ساحل شبوة وهدى، لكن لا يمكن تأكيد اتجاه انتقالها أو وقت وصولها.'}
 else state.textContent='لا تظهر مؤشرات قوية لرطوبة بحرية مرتفعة في نقاط المتابعة خلال 72 ساعة.';
 }catch(err){state.textContent='تعذرت قراءة رطوبة بحر العرب حاليًا؛ لا يمكن تأكيد موجة أو اتجاهها.';console.warn('marine comparison',err)}
 

 }catch(e){report.textContent='تعذر تحديث تحليل الموجات الرطبة الآن. حاول إعادة فتح القسم لاحقًا. لا يعني تعذر البيانات عدم وجود موجة.';console.warn('moist-waves',e)}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();