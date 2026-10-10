(()=>{'use strict';
const LAT=14.230586,LON=47.199415;
const layers=[['الرطوبة','rh'],['الرياح','wind'],['الأمطار','rain']];
function start(){
 const modal=document.getElementById('seaModal'),root=modal?.querySelector('.sea-content');if(!root||document.getElementById('moistWaves72'))return;
 const panel=document.createElement('section');panel.id='moistWaves72';panel.style.cssText='margin:18px 0;border:1px solid #267d9b;border-radius:15px;background:#0b2535;overflow:hidden;color:#e9f8ff';
 panel.innerHTML='<button id="moistToggle" type="button" aria-expanded="false" style="width:100%;padding:17px;border:0;background:#103e51;color:white;text-align:right;font-size:19px;font-weight:bold;cursor:pointer">💧 الموجات الرطبة — متابعة 3 أيام <span style="float:left">⌄</span></button><div id="moistBody" hidden style="padding:14px"><p style="line-height:1.9;color:#bcd8e4;margin-top:0">ملخص الموجات الرطبة وتأثيرها المحتمل خلال 72 ساعة.</p><div id="moistReport" aria-live="polite" style="line-height:2;background:#0a1d2b;border-radius:10px;padding:12px">اضغط لعرض التحليل.</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:13px 0" id="moistLayers"></div><div style="border-radius:12px;overflow:hidden"><iframe id="moistMap" title="خريطة الموجات الرطبة" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:360px;border:0" allowfullscreen></iframe></div><p style="font-size:12px;line-height:1.9;color:#9dc3d0">الخريطة للتوضيح، والتوقعات ليست إنذارًا رسميًا.</p></div>';
 const anchor=root.querySelector('.route');if(anchor)root.insertBefore(panel,anchor);else root.appendChild(panel);
 const body=panel.querySelector('#moistBody'),report=panel.querySelector('#moistReport'),frame=panel.querySelector('#moistMap'),buttons=panel.querySelector('#moistLayers');let loaded=false;let refreshPending=false;let lastUpdate=0;let lastSucceeded=false;
 function map(layer){const u=new URL('https://embed.windy.com/embed2.html');Object.entries({lat:'14',lon:'51',detailLat:'14.23',detailLon:'47.20',zoom:'5',level:'surface',overlay:layer,product:'ecmwf',menu:'',message:'true',marker:'false',calendar:'now',pressure:'false',type:'map',location:'coordinates',detail:'false',metricWind:'km/h',metricTemp:'°C'}).forEach(([k,v])=>u.searchParams.set(k,v));frame.src=u.toString();}
 layers.forEach(([name,layer],i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.style.cssText='border:1px solid #428baa;border-radius:9px;padding:9px 14px;color:white;background:'+(i?'#12354a':'#08779a');b.addEventListener('click',()=>{[...buttons.children].forEach(x=>x.style.background='#12354a');b.style.background='#08779a';map(layer)});buttons.appendChild(b)});
 panel.querySelector('#moistToggle').addEventListener('click',()=>{body.hidden=!body.hidden;panel.querySelector('#moistToggle').setAttribute('aria-expanded',String(!body.hidden));if(!body.hidden&&!loaded){loaded=true;map('rh');refreshPending=true;load().finally(()=>{refreshPending=false})}else if(!body.hidden&&!refreshPending&&(!lastSucceeded||Date.now()-lastUpdate>15*60*1000)){refreshPending=true;load().finally(()=>{refreshPending=false})}});
 async function timedFetch(url){if(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function')return fetch(url,{signal:AbortSignal.timeout(12000)});return fetch(url)}
 async function load(){lastUpdate=Date.now();lastSucceeded=false;report.textContent='🔄 جاري تحليل توقعات الأيام الثلاثة...';try{
 const u=new URL('https://api.open-meteo.com/v1/forecast');Object.entries({latitude:String(LAT),longitude:String(LON),hourly:'precipitation_probability,precipitation',forecast_hours:'72',timezone:'Asia/Aden'}).forEach(([k,v])=>u.searchParams.set(k,v));
 const response=await timedFetch(u);if(!response.ok)throw Error('forecast unavailable');const data=await response.json(),h=data.hourly;if((h?.time?.length||0)<72||!Array.isArray(h.precipitation_probability)||!Array.isArray(h.precipitation))throw Error('empty forecast');

 const line=(label,value)=>{const node=document.createElement('div');node.style.cssText='padding:12px 2px;border-bottom:1px solid #24485a;line-height:1.9';const heading=document.createElement('strong');heading.textContent=label+' : ';node.appendChild(heading);const detail=document.createElement('span');detail.textContent=value;node.appendChild(detail);report.appendChild(node);return detail};
 report.replaceChildren();
 const state=line('💧 الحالة','جاري مقارنة رطوبة بحر العرب والساحل...');
 const arrival=line('📍 حبان وهدى','لم يتأكد اتجاه وصول موجة رطبة أو توقيتها.');
 const validChance=h.precipitation_probability?.slice(0,72)?.filter(x=>Number.isFinite(x)&&x>=0&&x<=100)||[];const maxChance=validChance.length>=60?Math.max(...validChance):null;
 const rain=line('🌧️ الأمطار','جاري تقدير فرص المطر...');
 const rainHours=Array.from({length:72},(_,i)=>({i,p:h.precipitation_probability?.[i],mm:h.precipitation?.[i]}));
 const validRain=rainHours.filter(x=>Number.isFinite(x.p)&&Number.isFinite(x.mm)&&x.p>=0&&x.p<=100&&x.mm>=0);
 if(validRain.length<60){rain.textContent='بيانات المطر غير مكتملة؛ لا يمكن تحديد شدته.'}
 else {const likely=validRain.filter(x=>x.p>=50&&x.mm>=0.2);const peak=likely.length?Math.max(...likely.map(x=>x.mm)):null;
 const intensity=peak===null?'غير محددة':peak>=7.6?'قد تكون غزيرة محليًا':peak>=2.5?'قد تكون متوسطة':'قد تكون خفيفة';
 const first=likely[0],window=first?Math.floor(first.i/24)+1:null;const windowText=window===1?'خلال 24 ساعة':window===2?'خلال 24–48 ساعة':'خلال 48–72 ساعة';
 rain.textContent=first?'توجد إشارة لأمطار '+intensity+' '+windowText+'؛ التوقيت والشدة قابلان للتغير.':maxChance===null?'بيانات المطر غير كافية لتحديد فرصة موثوقة.':maxChance>=35?'توجد فرص مطر، لكن لا تكفي البيانات لتحديد شدة أو وقت هطول مرجح.':'لا تظهر إشارة قوية لأمطار خلال 72 ساعة.';}

 const seaSites=[['غرب بحر العرب',13,53],['قرب سقطرى',12.5,54.5],['ساحل شبوة',14.2,48.6],['حبان وهدى',LAT,LON]];
 async function siteForecast(site){const url=new URL('https://api.open-meteo.com/v1/forecast');Object.entries({latitude:String(site[1]),longitude:String(site[2]),hourly:'relative_humidity_850hPa,wind_speed_850hPa,wind_direction_850hPa',forecast_hours:'72',timezone:'Asia/Aden'}).forEach(([k,v])=>url.searchParams.set(k,v));const response=await timedFetch(url);if(!response.ok)throw Error('marine comparison unavailable');const d=await response.json();return {name:site[0],hourly:d.hourly}};

 try{const sites=await Promise.all(seaSites.map(siteForecast));
 const valid=(v)=>Number.isFinite(v)&&v>=0&&v<=100;
 const hourly=sites.map(x=>x.hourly?.relative_humidity_850hPa||[]);
 if(hourly.some(v=>!Array.isArray(v)||v.length<72)){state.textContent='بيانات الرطوبة البحرية غير مكتملة؛ لا يمكن تحديد مسارها.'}
 else {
 const means=hourly.map(v=>{const good=v.slice(0,72).filter(valid);return good.length>=60?good.reduce((a,b)=>a+b,0)/good.length:null});
 const [sea,island,coast,inland]=means;
 if(means.some(v=>v===null))state.textContent='بيانات الرطوبة غير مكتملة؛ لا يمكن تأكيد وجود موجة رطبة.';
 else if(Math.max(sea,island)>=70){
 state.textContent='رطوبة مرتفعة فوق أجزاء من بحر العرب؛ جهة قدوم موجة محددة غير مؤكدة.';
 const coastH=hourly[2],landH=hourly[3],wind=sites[2].hourly?.wind_direction_850hPa||[],speed=sites[2].hourly?.wind_speed_850hPa||[];
 // Look for a sustained 6-hour high-humidity interval near the coast followed by a sustained inland interval.
 const sustained=(v,i,threshold)=>i>=0&&i+6<=72&&Array.from({length:6},(_,k)=>v[i+k]).every(x=>valid(x)&&x>=threshold);
 let found=null;
 for(let c=0;c<=60&&!found;c++){if(!sustained(coastH,c,70))continue;
 for(let lag=1;lag<=12&&c+lag<=66;lag++){const t=c+lag;if(!sustained(landH,t,65))continue;
 const supporting=Array.from({length:6},(_,k)=>c+k).filter(i=>Number.isFinite(wind[i])&&Number.isFinite(speed[i])&&speed[i]>=10&&wind[i]>=180&&wind[i]<=315).length>=4;
 const coastRise=c>0&&valid(coastH[c-1])&&coastH[c-1]<70;
 const inlandRise=t>0&&valid(landH[t-1])&&landH[t-1]<65;
 if(supporting&&coastRise&&inlandRise){found={t,lag};break}}}
 if(found){const p=found.t<24?'خلال 24 ساعة':found.t<48?'خلال 24–48 ساعة':'خلال 48–72 ساعة';arrival.textContent='مؤشرات محتملة لامتداد الرطوبة من الساحل نحو الداخل '+p+'؛ موعد وصول موجة محددة غير مؤكد.'}
 else if(coast>=70&&inland>=65)arrival.textContent='رطوبة مرتفعة قرب الساحل وهدى، لكن لا توجد إشارة انتقال زمنية كافية لتحديد الوصول.';
 else arrival.textContent='لم تظهر مؤشرات كافية لانتقال رطوبة بحرية إلى حبان وهدى خلال 72 ساعة.';
 }else state.textContent='لا تظهر رطوبة بحرية مرتفعة بصورة مستمرة في نقاط المتابعة خلال 72 ساعة.';
 }

 lastSucceeded=true;
 }catch(err){lastSucceeded=true;state.textContent='تعذرت قراءة رطوبة بحر العرب حاليًا؛ لا يمكن تأكيد موجة أو اتجاهها.';arrival.textContent='تعذر تحديد أي تأثير محتمل على حبان وهدى بسبب نقص البيانات.';console.warn('marine comparison',err)}
 

 }catch(e){report.textContent='تعذر تحديث تحليل الموجات الرطبة الآن. حاول إعادة فتح القسم لاحقًا. لا يعني تعذر البيانات عدم وجود موجة.';console.warn('moist-waves',e)}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();