/* Arabian Sea lifecycle desk, preview only. Latest source fetched on open and every 15 min while visible. */
(function(){
'use strict';
if(location.hostname!=='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev')return;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const date=v=>Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v)):'وقت الإصدار غير ظاهر';
const reportDate=r=>r.issuedAt?date(r.issuedAt):r.date?new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',year:'numeric',month:'long',day:'numeric'}).format(new Date(r.date+'T00:00:00Z')):'غير ظاهر؛ راجعه داخل المصدر';

function start(){
 const sea=document.querySelector('#seaModal .sea-content');if(!sea)return;
 const desk=el('section','','cyclone-desk');desk.id='cycloneSeason';desk.setAttribute('aria-label','متابعة المنخفضات والأعاصير');
 const title=el('h3','متابعة طقس هدى'),state=el('h4','جاري التحقق…'),text=el('p'),direction=el('p'),circulation=el('p'),impact=el('p'),status=el('p');status.setAttribute('role','status');
 const refresh=el('button','تحديث الحالة','action-btn');refresh.type='button';
 const tabs=el('div','','sea-three-choices');tabs.setAttribute('aria-label','خيارات المتابعة');
 const panes=[el('section','','cyclone-panel'),el('section','','cyclone-panel'),el('section','','cyclone-panel')];
 const headings=['حالات بحر العرب','توقعات شبوة حبان هدى','المسارات المتوقعة'];
 const choices=headings.map((label,i)=>{const button=el('button',(i+1)+' · '+label);button.type='button';button.id='seaChoice'+i;button.setAttribute('aria-controls','seaPane'+i);button.onclick=()=>{panes.forEach((p,j)=>{p.hidden=i!==j;choices[j].setAttribute('aria-expanded',String(i===j));});if(i>0)void loadMap();};tabs.append(button);return button;});
 panes.forEach((p,i)=>{p.id='seaPane'+i;p.hidden=i!==0;choices[i].setAttribute('aria-expanded',String(i===0));});
 panes[0].append(el('h3',headings[0]),state,text,direction,circulation,impact,status,refresh);
 const local=el('div'),localPeriod=el('p','','small-note');panes[1].append(el('h3',headings[1]),localPeriod,local,el('p','توقع إرشادي لثلاثة أيام؛ عتق مؤشر محلي لشبوة، وتختلف الأمطار داخل المحافظة.','small-note'));
 const mapStatus=el('p','','small-note'),mapView=el('div'),mapTime=el('p','','small-note'),zoom=el('button','تكبير الخريطة','action-btn'),dialog=el('dialog','','cyclone-image-dialog'),dismiss=el('button','إغلاق الخريطة'),full=el('img');zoom.type=dismiss.type='button';zoom.disabled=true;dismiss.onclick=()=>dialog.close();dialog.append(dismiss,full);
 panes[2].append(el('h3',headings[2]),el('p','خريطة واحدة تجمع توقعات الأمطار. لن نرسم مسارًا للحالة قبل توفر بيانات موثوقة له.','small-note'),mapTime,mapView,mapStatus,zoom,dialog);
 desk.append(title,tabs,...panes);sea.replaceChildren(desk);
 let mapBusy=false,mapLast=0,mapURL,mapModule,mapData;
 async function loadMap(){
  if(mapBusy)return;
  if(mapLast&&Date.now()-mapLast<300000)return;
  mapBusy=true;mapStatus.textContent='جاري تحميل خريطة طقس هدى…';
  try{
   const r=await fetch('/api/sea-map',{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('unavailable');const s=await r.json();
   mapModule??=import('/sea-map-browser.mjs');const render=await mapModule;const svg=render.renderMap(s);
   const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));if(mapURL)URL.revokeObjectURL(mapURL);mapURL=url;mapData=s;
   const image=el('img','','cyclone-image');image.id='seaForecastImage';image.alt='خريطة طقس هدى المجمعة للأمطار مع حدود محافظات اليمن';image.src=url;image.onclick=()=>zoom.click();mapView.replaceChildren(image);zoom.disabled=false;full.src=url;full.alt=image.alt;
   const stale=Date.now()-Date.parse(s.fetchedAt)>9*3600000,expired=Date.now()>Date.parse(s.period.endAt);
   mapTime.textContent='الفترة: '+date(s.period.startAt)+' إلى '+date(s.period.endAt)+' • بتوقيت اليمن';
   mapStatus.textContent=(expired?'انتهت فترة هذه الخريطة؛ لا تمثل التوقع الحالي. ':stale?'تأخر التحديث؛ هذه آخر خريطة ناجحة. ':'')+'جمع البيانات: '+date(s.fetchedAt)+' • تحديث مجدول كل ٦ ساعات. التهشير يعني اختلافًا كبيرًا بين الموديلات.';
   localPeriod.textContent=mapTime.textContent+(stale?' • بيانات سابقة، تأخر التحديث.':'');local.replaceChildren();
   if(expired)local.append(el('p','انتهت فترة التوقع؛ ننتظر بيانات جديدة.'));
   else for(const place of s.local){const card=el('div','','sea-local-place');card.append(el('h4',place.name),el('p',render.localSummary(place).text));local.append(card);}
   mapLast=Date.now();
  }catch{mapStatus.textContent=mapData?'تعذر التحديث؛ المعروض آخر خريطة ناجحة، جمع بياناتها: '+date(mapData.fetchedAt):'تعذر جلب الخريطة الآن؛ لا توجد بيانات كافية لرسم توقع موثوق.';if(!mapData)local.replaceChildren(el('p','تعذر جلب التوقع المحلي الآن.'));}
  finally{mapBusy=false;}
 }
 zoom.onclick=()=>{if(mapURL)dialog.showModal();};
 let busy=false,last=0,modules;
 const visible=()=>document.getElementById('seaModal').style.display==='block'&&!document.hidden;
 async function documentPdf(kind,report,pdfjs,tasks){
  const r=await fetch('/api/cyclone-document?kind='+kind,{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok||r.headers.get('X-Hada-Source')!==report.url)throw Error('source_changed');
  const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>4194304)throw Error('pdf_size');
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,maxImageSize:4000000,stopAtErrors:true});tasks.push(task);return task.promise;
 }
 async function read(pdf){if(pdf.numPages>12)throw Error('too_many_pages');let parts=[];for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n);const t=await p.getTextContent();parts.push(t.items.map(i=>i.str).join(' '));}return parts.join(' ');}
 async function load(force=false){if(busy||!force&&Date.now()-last<900000)return;busy=true;refresh.disabled=true;status.textContent='جاري قراءة أحدث النشرات…';
  let docs=[],tasks=[];
  try{
   const r=await fetch('/api/cyclone-sources',{cache:'no-store',signal:AbortSignal.timeout(16000)});if(!r.ok)throw Error('source');const source=await r.json();
   const safe=source.reports.filter(x=>{try{const u=new URL(x.url);return u.protocol==='https:'&&['rsmcnewdelhi.imd.gov.in','dss.imd.gov.in'].includes(u.hostname);}catch{return false;}});
   const daily=safe.find(x=>x.id==='outlook'),extended=safe.find(x=>x.id==='extended');
   if(!daily)throw Error('daily_missing');
   modules??=Promise.all([import('/cyclone-pdf.mjs'),import('/cyclone-analysis.mjs')]);const [pdfjs,analysis]=await modules;pdfjs.GlobalWorkerOptions.workerSrc='/cyclone-pdf-worker.mjs';
   const results=await Promise.allSettled([documentPdf('outlook',daily,pdfjs,tasks),extended?documentPdf('extended',extended,pdfjs,tasks):Promise.reject(Error('no_extended'))]);
   const dailyPdf=results[0].status==='fulfilled'?results[0].value:null,extendedPdf=results[1].status==='fulfilled'?results[1].value:null;docs=[dailyPdf,extendedPdf].filter(Boolean);
   const texts=await Promise.all(docs.map(read));const dailyText=dailyPdf?texts[0]:'',extendedText=extendedPdf?texts[dailyPdf?1:0]:'';
   if(!dailyText&&!extendedText)throw Error('unreadable');const a=analysis.analyseReports(dailyText,extendedText);
   state.textContent=(daily.stale?'نشرة سابقة — ':'')+a.state;text.textContent=a.detail;direction.textContent=a.direction;circulation.textContent=a.circulationNote||'';impact.textContent='';
   status.textContent='إصدار النشرة اليومية: '+reportDate(daily)+' • آخر تحقق: '+date(source.checkedAt)+(daily.stale?' • النشرة قديمة، يلزم تحديث المصدر.':'')+(!dailyPdf?' • تعذرت قراءة النشرة اليومية.':'')+(!extendedPdf?' • تعذرت قراءة توقعات الأسبوعين.':'');last=Date.now();
  }catch{if(!last){state.textContent='تعذر التحقق من الحالة الآن';text.textContent='لا تتوفر بيانات حديثة كافية لتحديد التصنيف أو المسار.';direction.textContent='';circulation.textContent='';impact.textContent='';}status.textContent='فشل التحديث'+(last?'؛ المعروض آخر قراءة ناجحة: '+date(new Date(last).toISOString()):'')+'؛ تعذر الاتصال لا يعني انتهاء الحالة.';}
  finally{busy=false;refresh.disabled=false;void Promise.allSettled(tasks.map(task=>Promise.resolve().then(()=>task.destroy())));}
 }
 refresh.onclick=()=>load(true);window.loadSea=()=>{void load();void loadMap();};window.openSea=function(){document.getElementById('seaModal').style.display='block';document.body.style.overflow='hidden';void load();void loadMap();};
 setInterval(()=>{if(visible()){void load();void loadMap();}},60000);document.addEventListener('visibilitychange',()=>{if(visible()){void load();void loadMap();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
