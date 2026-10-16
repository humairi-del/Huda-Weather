/* Arabian Sea lifecycle desk, preview only. Latest source fetched on open and every 15 min while visible. */
(function(){
'use strict';
if(location.hostname!=='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev')return;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const date=v=>Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v)):'وقت الإصدار غير ظاهر';
const reportDate=r=>r.issuedAt?date(r.issuedAt):r.date?new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',year:'numeric',month:'long',day:'numeric'}).format(new Date(r.date+'T00:00:00Z')):'غير ظاهر؛ راجعه داخل المصدر';
const link=(text,url)=>{const a=el('a',text,'official-btn cyclone-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};

// A finite, dated editorial bulletin. Source terms do not permit a persistent live mirror.
const seaEdition={runAt:'2026-10-16T00:00:00Z',validAt:'2026-10-20T00:00:00Z',folder:'/sea-charts/2026-10-16/'};
const seaModels=[
 {id:'ecmwf',name:'الأوروبي ECMWF'},
 {id:'gfs',name:'الأمريكي GFS'},
 {id:'cmc',name:'الكندي CMC / GEM'},
 {id:'icon',name:'الألماني ICON'},
 {id:'aifs',name:'الأوروبي بالذكاء الاصطناعي AIFS'}
];
function modelMaps(){
 const box=el('section','','cyclone-panel cyclone-models');box.id='seaModelMaps';box.hidden=true;
 const heading=el('h3','توقعات الموديلات لمسار الحالة'),edition=el('p','نشرة صور محفوظة • إصدار ١٦ أكتوبر ٢٠٢٦ • لا تتحدث تلقائيًا','cyclone-edition');
 const intro=el('p','اختر الموديل لتشاهد صورته مباشرة. الصور تعرض مجموع الأمطار المتوقع من ١٦ إلى ٢٠ أكتوبر، وليس أمطار يوم واحد. اختلاف الألوان يوضح اختلاف التوقعات؛ هذه الخرائط ليست مسارًا رسميًا للحالة.','small-note');
 const label=el('label','اختر الموديل');label.htmlFor='seaModelChoice';const select=el('select');select.id='seaModelChoice';
 for(const m of seaModels){const o=el('option',m.name);o.value=m.id;select.append(o);}
 const tools=el('div','','cyclone-map-tools'),zoom=el('button','تكبير الصورة داخل الموقع'),retry=el('button','إعادة عرض الصورة'),close=el('button','إغلاق صور الموديلات');for(const b of [zoom,retry,close])b.type='button';tools.append(zoom,retry,close);
 const mapTitle=el('h4'),timing=el('p','','small-note'),age=el('p','','cyclone-edition'),view=el('div'),summary=el('p'),status=el('p','','small-note');status.setAttribute('role','status');
 const source=el('p','','small-note');source.append(document.createTextNode('المصدر: '),link('Tropical Tidbits — Levi Cowan','https://www.tropicaltidbits.com/analysis/models/'));
 const dialog=el('dialog','','cyclone-image-dialog'),dialogTitle=el('h3'),dismiss=el('button','إغلاق الصورة المكبّرة'),full=el('img');dismiss.type='button';dismiss.onclick=()=>dialog.close();dialog.append(dismiss,dialogTitle,full);
 let image;
 function render(){
  if(dialog.open)dialog.close();const m=seaModels.find(x=>x.id===select.value)||seaModels[0];mapTitle.textContent='توقعات الموديل '+m.name;
  timing.textContent='تشغيل الموديل: '+date(seaEdition.runAt)+' • نهاية فترة التوقع: '+date(seaEdition.validAt)+' • بتوقيت اليمن';
  const expired=Date.now()>Date.parse(seaEdition.validAt),old=Date.now()-Date.parse(seaEdition.runAt)>36*3600000;
  age.hidden=!old;age.textContent=expired?'انتهت فترة هذه النشرة؛ الصور للأرشيف ولا تمثل التوقع الحالي.':'هذه نشرة سابقة؛ لا تمثل أحدث تشغيل للموديلات.';
  summary.textContent='الألوان تبيّن مجموع المطر المتوقع بالمليمتر خلال الفترة الموضحة. الصورة تشمل بحر العرب والمحيط الهندي؛ توزيع المطر وحده لا يؤكد اتجاه الحالة أو وصول أمطارها إلى شبوة وهدى.';
  view.replaceChildren();status.textContent='جاري تحميل صورة '+m.name+'…';zoom.disabled=true;image=el('img','','cyclone-image');image.id='seaForecastImage';image.alt='توقعات '+m.name+' لمجموع الأمطار من ١٦ إلى ٢٠ أكتوبر ٢٠٢٦';image.decoding='async';
  const current=image;image.onload=()=>{if(image!==current)return;status.textContent='صورة النشرة المحفوظة جاهزة • اختر موديلًا آخر للمقارنة.';zoom.disabled=false;};image.onerror=()=>{if(image!==current)return;status.textContent='تعذر تحميل صورة هذا الموديل. اضغط إعادة عرض الصورة للمحاولة مجددًا.';zoom.disabled=true;};
  image.src=seaEdition.folder+m.id+'.png';view.append(image);image.onclick=()=>{if(!zoom.disabled)zoom.click();};
 }
 zoom.onclick=()=>{const m=seaModels.find(x=>x.id===select.value)||seaModels[0];dialogTitle.textContent='توقعات الموديل '+m.name;full.src=image.src;full.alt=image.alt;dialog.showModal();};
 select.onchange=render;retry.onclick=render;
 box.append(heading,edition,intro,label,select,mapTitle,timing,age,view,status,summary,tools,source,dialog);
 box.open=()=>{box.hidden=false;render();box.scrollIntoView({block:'start',behavior:'smooth'});select.focus({preventScroll:true});};
 box.stop=()=>{if(dialog.open)dialog.close();view.replaceChildren();image=null;};
 close.onclick=()=>{box.hidden=true;box.stop();const b=document.getElementById('seaModelsButton');b?.setAttribute('aria-expanded','false');b?.focus();};return box;
}

function start(){
 const sea=document.querySelector('#seaModal .sea-content');if(!sea)return;
 const desk=el('section','','cyclone-desk');desk.id='cycloneSeason';desk.setAttribute('aria-label','متابعة المنخفضات والأعاصير');
 const title=el('h3','🌀 متابعة المنخفضات والأعاصير'),state=el('h4','جاري التحقق…'),text=el('p'),direction=el('p'),circulation=el('p'),impact=el('p'),status=el('p');status.setAttribute('role','status');
 const picture=el('div'),caption=el('p','','small-note'),details=el('details');details.append(el('summary','المصادر وتفاصيل المتابعة'));const content=el('div');details.append(content);
 const refresh=el('button','تحديث الحالة','action-btn');refresh.type='button';
 const maps=modelMaps(),modelsButton=el('button','🗺️ توقعات الموديلات لمسار الحالة','action-btn');modelsButton.id='seaModelsButton';modelsButton.type='button';modelsButton.setAttribute('aria-expanded','false');modelsButton.setAttribute('aria-controls','seaModelMaps');modelsButton.onclick=()=>{const opening=maps.hidden;modelsButton.setAttribute('aria-expanded',String(opening));if(opening)maps.open();else{maps.hidden=true;maps.stop();}};
 const overview=el('div','','cyclone-panel');overview.append(el('h3','آخر المستجدات'),state,text,el('h4','الموقع والاتجاه المتوقع'),direction,circulation,el('h4','هل تتأثر شبوة وهدى؟'),impact);
 desk.append(title,overview,el('h3','خريطة المتابعة الرسمية'),picture,caption,modelsButton,maps,status,refresh,details);sea.replaceChildren(desk);
 const syncMaps=()=>{if(document.getElementById('seaModal').style.display!=='block'){maps.hidden=true;maps.stop();modelsButton.setAttribute('aria-expanded','false');}};
 new MutationObserver(syncMaps).observe(document.getElementById('seaModal'),{attributes:true,attributeFilter:['style']});
 let busy=false,last=0,modules,objectURL;
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
   const daily=safe.find(x=>x.id==='outlook'),extended=safe.find(x=>x.id==='extended'),track=safe.find(x=>x.id==='track'&&!x.noTrackFile);
   if(!daily)throw Error('daily_missing');
   modules??=Promise.all([import('/cyclone-pdf.mjs'),import('/cyclone-analysis.mjs')]);const [pdfjs,analysis]=await modules;pdfjs.GlobalWorkerOptions.workerSrc='/cyclone-pdf-worker.mjs';
   const results=await Promise.allSettled([documentPdf('outlook',daily,pdfjs,tasks),extended?documentPdf('extended',extended,pdfjs,tasks):Promise.reject(Error('no_extended'))]);
   const dailyPdf=results[0].status==='fulfilled'?results[0].value:null,extendedPdf=results[1].status==='fulfilled'?results[1].value:null;docs=[dailyPdf,extendedPdf].filter(Boolean);
   const texts=await Promise.all(docs.map(read));const dailyText=dailyPdf?texts[0]:'',extendedText=extendedPdf?texts[dailyPdf?1:0]:'';
   if(!dailyText&&!extendedText)throw Error('unreadable');const a=analysis.analyseReports(dailyText,extendedText);
   state.textContent=(daily.stale?'نشرة سابقة — ':'')+a.state;text.textContent=a.detail;direction.textContent=a.direction;circulation.textContent=a.circulationNote||'';impact.textContent=a.impact;
   content.replaceChildren();if(a.nearTerm)content.append(el('p',a.nearTerm));if(a.disagreement)content.append(el('p','الموديلات مختلفة في التشكّل والمسار والشدة؛ اتجاه اليمن أو عُمان في أحد الموديلات لا يثبت وصول الحالة أو أمطارها إلى شبوة.'));
   content.append(el('p','متابعة حتى ١٤ يومًا وفق نشرة الأسبوعين، مع استمرار تحديث الحالة طوال عمرها. الأيام البعيدة أقل ثقة.','small-note'));
   // Visitor summaries remain Arabic; source documents are available through the links below.
   for(const report of safe.filter(x=>['outlook','extended','track'].includes(x.id)&&!x.noTrackFile))content.append(link(report.label+' ↗',report.url));
   content.append(link('المسار التفاعلي الرسمي ↗','https://dss.imd.gov.in/dwr_img/GIS/cyclone.html'));
   let imagePdf,imageReport;
   if(track){try{imagePdf=await documentPdf('track',track,pdfjs,tasks);docs.push(imagePdf);imageReport=track;}catch{}}
   if(!imagePdf){imagePdf=extendedPdf||dailyPdf;imageReport=extendedPdf?extended:daily;}
   picture.replaceChildren();caption.textContent=track&&imageReport===track?'أحدث خريطة للمسار من المصدر الرسمي؛ التوقع قابل للتغير.':'المسار الرسمي غير متاح؛ المعروض خريطة/نشرة توقعات، وليس مسارًا مؤكدًا.';
   caption.textContent+=' • مصدر الصورة: '+imageReport.label+' • تاريخ إصدار الصورة: '+reportDate(imageReport)+(imageReport.stale?' • مصدر الصورة قديم، يلزم تحديثه.':'');
   try{const page=await imagePdf.getPage(1),view=page.getViewport({scale:1.6}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('render');if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(blob);const img=el('img','','cyclone-image');img.alt=imageReport===track?'أحدث المسار الرسمي':imageReport.label+' — ليست مسارًا رسميًا';img.src=objectURL;const anchor=link('تكبير الخريطة ↗',imageReport.url);picture.append(img,anchor);img.onclick=()=>anchor.click();
   }catch{picture.append(el('p','تعذر عرض صورة النشرة. افتح الخريطة من المصدر.','cyclone-image-error'),link('فتح الخريطة ↗',imageReport.url));}
   status.textContent='إصدار النشرة اليومية: '+reportDate(daily)+' • آخر تحقق: '+date(source.checkedAt)+(daily.stale?' • النشرة قديمة، يلزم تحديث المصدر.':'')+(!dailyPdf?' • تعذرت قراءة النشرة اليومية.':'')+(!extendedPdf?' • تعذرت قراءة توقعات الأسبوعين.':'');last=Date.now();
  }catch{if(!last){state.textContent='تعذر التحقق من الحالة الآن';text.textContent='لا تتوفر بيانات حديثة كافية لتحديد التصنيف أو المسار.';direction.textContent='';circulation.textContent='';impact.textContent='';picture.replaceChildren();caption.textContent='';content.replaceChildren(link('فتح المركز الرسمي ↗','https://rsmcnewdelhi.imd.gov.in/'));}status.textContent='فشل التحديث'+(last?'؛ المعروض آخر قراءة ناجحة: '+date(new Date(last).toISOString()):'')+'؛ تعذر الاتصال لا يعني انتهاء الحالة.';}
  finally{busy=false;refresh.disabled=false;void Promise.allSettled(tasks.map(task=>Promise.resolve().then(()=>task.destroy())));}
 }
 refresh.onclick=()=>load(true);window.loadSea=()=>load();window.openSea=function(){document.getElementById('seaModal').style.display='block';document.body.style.overflow='hidden';void load();};
 setInterval(()=>{if(visible())void load();},60000);document.addEventListener('visibilitychange',()=>{if(visible())void load();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
