/* Arabian Sea lifecycle desk, preview only. Latest source fetched on open and every 15 min while visible. */
(function(){
'use strict';
if(location.hostname!=='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev')return;
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const date=v=>Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v)):'وقت الإصدار غير ظاهر';
const link=(text,url)=>{const a=el('a',text,'official-btn cyclone-link');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function start(){
 const sea=document.querySelector('#seaModal .sea-content');if(!sea)return;
 const desk=el('section','','cyclone-desk');desk.id='cycloneSeason';desk.setAttribute('aria-label','متابعة المنخفضات والأعاصير');
 const title=el('h3','🌀 متابعة المنخفضات والأعاصير'),state=el('h4','جاري التحقق…'),text=el('p'),direction=el('p'),impact=el('p'),status=el('p');status.setAttribute('role','status');
 const picture=el('div'),caption=el('p','','small-note'),details=el('details');details.append(el('summary','تفاصيل الحالة'));const content=el('div');details.append(content);
 const refresh=el('button','تحديث الحالة','action-btn');refresh.type='button';desk.append(title,state,text,direction,impact,picture,caption,status,refresh,details);sea.replaceChildren(desk);
 let busy=false,last=0,modules,objectURL;
 const visible=()=>document.getElementById('seaModal').style.display==='block'&&!document.hidden;
 async function documentPdf(kind,report,pdfjs){
  const r=await fetch('/api/cyclone-document?kind='+kind,{cache:'no-store',signal:AbortSignal.timeout(25000)});if(!r.ok||r.headers.get('X-Hada-Source')!==report.url)throw Error('source_changed');
  const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>4194304)throw Error('pdf_size');
  return pdfjs.getDocument({data:bytes,isEvalSupported:false,maxImageSize:4000000,stopAtErrors:true}).promise;
 }
 async function read(pdf){if(pdf.numPages>12)throw Error('too_many_pages');let parts=[];for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n);const t=await p.getTextContent();parts.push(t.items.map(i=>i.str).join(' '));}return parts.join(' ');}
 async function load(force=false){if(busy||!force&&Date.now()-last<900000)return;busy=true;refresh.disabled=true;status.textContent='جاري قراءة أحدث النشرات…';
  let docs=[];
  try{
   const r=await fetch('/api/cyclone-sources',{cache:'no-store',signal:AbortSignal.timeout(16000)});if(!r.ok)throw Error('source');const source=await r.json();
   const safe=source.reports.filter(x=>{try{const u=new URL(x.url);return u.protocol==='https:'&&['rsmcnewdelhi.imd.gov.in','dss.imd.gov.in'].includes(u.hostname);}catch{return false;}});
   const daily=safe.find(x=>x.id==='outlook'),extended=safe.find(x=>x.id==='extended'),track=safe.find(x=>x.id==='track'&&!x.noTrackFile);
   if(!daily)throw Error('daily_missing');
   modules??=Promise.all([import('/cyclone-pdf.mjs'),import('/cyclone-analysis.mjs')]);const [pdfjs,analysis]=await modules;pdfjs.GlobalWorkerOptions.workerSrc='/cyclone-pdf-worker.mjs';
   const results=await Promise.allSettled([documentPdf('outlook',daily,pdfjs),extended?documentPdf('extended',extended,pdfjs):Promise.reject(Error('no_extended'))]);
   const dailyPdf=results[0].status==='fulfilled'?results[0].value:null,extendedPdf=results[1].status==='fulfilled'?results[1].value:null;docs=[dailyPdf,extendedPdf].filter(Boolean);
   const texts=await Promise.all(docs.map(read));const dailyText=dailyPdf?texts[0]:'',extendedText=extendedPdf?texts[dailyPdf?1:0]:'';
   if(!dailyText&&!extendedText)throw Error('unreadable');const a=analysis.analyseReports(dailyText,extendedText);
   state.textContent=(daily.stale?'نشرة سابقة — ':'')+a.state;text.textContent=a.detail;direction.textContent=a.direction;impact.textContent=a.impact;
   content.replaceChildren();if(a.nearTerm)content.append(el('p',a.nearTerm));if(a.disagreement)content.append(el('p','الموديلات مختلفة في التشكّل والمسار والشدة؛ اتجاه اليمن أو عُمان في أحد الموديلات لا يثبت وصول الحالة أو أمطارها إلى شبوة.'));
   content.append(el('p','متابعة حتى ١٤ يومًا وفق نشرة الأسبوعين، مع استمرار تحديث الحالة طوال عمرها. الأيام البعيدة أقل ثقة.','small-note'));
   if(a.evidence){const raw=el('details');raw.append(el('summary','النص الأصلي الذي بُني عليه الملخص'),el('p',a.evidence));content.append(raw);}
   for(const report of safe.filter(x=>['outlook','extended','track'].includes(x.id)&&!x.noTrackFile))content.append(link(report.label+' ↗',report.url));
   content.append(link('المسار التفاعلي الرسمي ↗','https://dss.imd.gov.in/dwr_img/GIS/cyclone.html'));
   let imagePdf,imageReport;
   if(track){try{imagePdf=await documentPdf('track',track,pdfjs);docs.push(imagePdf);imageReport=track;}catch{}}
   if(!imagePdf){imagePdf=extendedPdf||dailyPdf;imageReport=extendedPdf?extended:daily;}
   picture.replaceChildren();caption.textContent=track&&imageReport===track?'أحدث خريطة للمسار من المصدر الرسمي؛ التوقع قابل للتغير.':'المسار الرسمي غير متاح؛ المعروض خريطة/نشرة توقعات، وليس مسارًا مؤكدًا.';
   try{const page=await imagePdf.getPage(1),view=page.getViewport({scale:1.6}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('render');if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(blob);const img=el('img','','cyclone-image');img.alt=imageReport===track?'أحدث المسار الرسمي':'أحدث نشرة توقعات الأسبوعين — ليست مسارًا رسميًا';img.src=objectURL;const anchor=link('تكبير الخريطة ↗',imageReport.url);picture.append(img,anchor);img.onclick=()=>anchor.click();
   }catch{picture.append(el('p','تعذر عرض صورة النشرة. افتح الخريطة من المصدر.','cyclone-image-error'),link('فتح الخريطة ↗',imageReport.url));}
   const issued=daily.issuedAt;status.textContent='النشرة: '+(issued?date(issued):daily.date||'راجع تاريخها داخل المصدر')+' • آخر تحقق: '+date(source.checkedAt)+(daily.stale?' • النشرة قديمة، يلزم تحديث المصدر.':'')+(!dailyPdf?' • تعذرت قراءة النشرة اليومية.':'')+(!extendedPdf?' • تعذرت قراءة توقعات الأسبوعين.':'');last=Date.now();
  }catch{if(!last){state.textContent='تعذر التحقق من الحالة الآن';text.textContent='لا تتوفر بيانات حديثة كافية لتحديد التصنيف أو المسار.';direction.textContent='';impact.textContent='';picture.replaceChildren();content.replaceChildren(link('فتح المركز الرسمي ↗','https://rsmcnewdelhi.imd.gov.in/'));}status.textContent='فشل التحديث'+(last?'؛ المعروض آخر قراءة ناجحة: '+date(new Date(last).toISOString()):'')+'؛ تعذر الاتصال لا يعني انتهاء الحالة.';}
  finally{busy=false;refresh.disabled=false;void Promise.allSettled(docs.map(p=>p.destroy()));}
 }
 refresh.onclick=()=>load(true);window.loadSea=()=>load();window.openSea=function(){document.getElementById('seaModal').style.display='block';document.body.style.overflow='hidden';void load();};
 setInterval(()=>{if(visible())void load();},60000);document.addEventListener('visibilitychange',()=>{if(visible())void load();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
