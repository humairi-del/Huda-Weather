(()=>{'use strict';
const section=document.getElementById('sandstorms');if(!section)return;
const status=document.getElementById('dustStatus'),timeLabel=document.getElementById('dustImageTime');let map,overlay,metadata,index=0,pending=false,generation=0,last=0,expires=null;
const stamp=t=>new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(t));
function hide(){generation++;if(overlay&&map)map.removeLayer(overlay);overlay=null;timeLabel.textContent='';}
function fresh(){return metadata&&Date.now()-Date.parse(metadata.times.at(-1))<=3600000;}
function leaflet(){if(window.L)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/leaflet.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
function show(){
 hide();if(!fresh()){status.textContent='الصور قديمة أو غير متاحة؛ لا يمكن تأكيد وجود عاصفة قرب هدى.';return;}
 const token=generation,time=metadata.times[index],b=metadata.bounds;status.textContent='جارٍ تحميل صورة القمر الصناعي…';
 const candidate=L.imageOverlay('/api/dust-satellite/image?time='+encodeURIComponent(time),[[b[1],b[0]],[b[3],b[2]]],{opacity:1,interactive:false,pane:'dustRaster'});overlay=candidate;
 candidate.once('load',()=>{if(token!==generation)return;if(!fresh()){hide();status.textContent='انتهت صلاحية الصور؛ حدّث العرض.';return;}status.textContent='صورة '+(index+1)+' من '+metadata.times.length+' · وصول العاصفة إلى هدى غير مؤكد.';timeLabel.textContent='وقت الصورة: '+stamp(time)+' بتوقيت اليمن';});
 candidate.once('error',()=>{if(token!==generation)return;hide();status.textContent='لم تصل الصورة؛ لا يمكن تأكيد حالة العواصف الرملية.';});candidate.addTo(map);
 clearTimeout(expires);expires=setTimeout(()=>{hide();status.textContent='انتهت صلاحية الصور؛ حدّث العرض.';},Math.max(0,3600001-(Date.now()-Date.parse(metadata.times.at(-1)))));
}
async function refresh(){if(pending||!section.open)return;pending=true;last=Date.now();hide();status.textContent='جارٍ التحقق من صور حديثة…';try{
 const [r]=await Promise.all([fetch('/api/dust-satellite',{cache:'no-store',signal:AbortSignal.timeout(15000)}),leaflet()]);if(!r.ok)throw Error('source');const d=await r.json();if(!Array.isArray(d.times)||!d.times.length||d.times.some(t=>!Number.isFinite(Date.parse(t)))||Date.now()-Date.parse(d.times.at(-1))>3600000)throw Error('stale');metadata=d;index=d.times.length-1;if(!section.open)return;
 if(!map){const b=d.bounds;map=L.map('dustMap',{crs:L.CRS.EPSG4326,zoomSnap:0,scrollWheelZoom:false,maxZoom:9}).fitBounds([[b[1],b[0]],[b[3],b[2]]]);
 map.createPane('dustRaster').style.zIndex='200';
 // Geographic outlines remain legible without loading a second remote basemap.
 fetch('./yemen-monitoring-area.json').then(r=>r.ok?r.json():null).then(area=>{if(area)L.geoJSON(area,{interactive:false,style:{color:'#ffffff',weight:1.5,fillOpacity:0}}).addTo(map);}).catch(()=>{});
 const cfg=window.HadaRasidConfig;if(cfg)L.circleMarker([cfg.latitude,cfg.longitude],{radius:5,color:'#fff',fillColor:'#111',fillOpacity:1}).addTo(map).bindTooltip('هدى · نقطة الطقس المؤقتة',{permanent:true,direction:'top'});
 }map.invalidateSize();show();
 }catch{hide();status.textContent='صور العواصف الرملية غير متاحة بوقت حديث؛ لا يمكن تأكيد الحالة قرب هدى.';}finally{pending=false;}}
section.addEventListener('toggle',()=>{if(section.open){if(!fresh()||Date.now()-last>=600000)refresh();else{map?.invalidateSize();show();}}else{hide();clearTimeout(expires);}});
document.getElementById('dustRefresh').onclick=()=>{if(Date.now()-last>=10000)refresh();};
document.getElementById('dustPrevious').onclick=()=>{if(metadata){index=(index+metadata.times.length-1)%metadata.times.length;show();}};
document.getElementById('dustNext').onclick=()=>{if(metadata){index=(index+1)%metadata.times.length;show();}};
setInterval(()=>{if(section.open&&!document.hidden&&Date.now()-last>=600000)refresh();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&section.open){if(!fresh()||Date.now()-last>=600000)refresh();else show();}});
window.addEventListener('online',()=>{if(section.open)refresh();});
if(section.open)refresh();
})();
