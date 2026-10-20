(()=>{'use strict';
 const labels={ecmwf:'الموديل الأوروبي ECMWF',gfs:'الموديل الأمريكي GFS',icon:'الموديل الألماني ICON',cmc:'الموديل الكندي CMC',aifs:'الموديل الأوروبي بالذكاء الاصطناعي AIFS'};
 function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
 const stamp=v=>new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(v));
 let previous=null,dialog=null,manifest=null,pending=null;
 function viewer(content,title){
  if(!dialog){dialog=el('dialog',undefined,'map-image-dialog');dialog.setAttribute('aria-label','تكبير الخرائط');const close=el('button','إغلاق ×'),heading=el('h3'),scroll=el('div',undefined,'image-scroll');heading.id='mapImageTitle';dialog.setAttribute('aria-labelledby',heading.id);dialog.append(close,heading,scroll);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>previous?.focus());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});}
  previous=document.activeElement;dialog.querySelector('h3').textContent=title;const scroll=dialog.querySelector('.image-scroll');scroll.replaceChildren(content);scroll.scrollLeft=0;scroll.scrollTop=0;dialog.showModal();
 }
 window.HadaImageViewer={open:viewer};
 function imagePath(value){if(typeof value==='string'&&/^\/api\/sea-image\/(ecmwf|gfs|icon|cmc|aifs)\?run=\d{10}&hours=\d{1,3}$/.test(value))return true;return typeof value==='string'&&/^\/sea-charts\/[a-zA-Z0-9_/-]+\.(?:png|jpg|webp)$/.test(value)&&!value.includes('..');}
 function validTrack(row,now=Date.now()){
  const issued=Date.parse(row?.runAt),valid=Date.parse(row?.validAt);let source;try{source=new URL(row.sourcePage);}catch{return false;}
  return !!labels[row?.id]&&row.kind==='verified-track'&&imagePath(row.image)&&Number.isFinite(issued)&&Number.isFinite(valid)&&issued<=now+300000&&now-issued<=36*3600000&&valid>=now&&valid-issued<=14*86400000&&source.protocol==='https:'&&!source.username&&!source.password;
 }
 async function load(){if(manifest&&Date.now()-manifest.checkedAt<15*60000)return manifest;if(pending)return pending;pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch('./api/sea-maps',{signal:controller.signal,cache:'no-cache'});if(!r.ok)throw Error('image_manifest');const d=await r.json();if(d.schema!=='hada-sea-images-v2'||d.kind!=='live-pressure-rainfall'||!Number.isFinite(d.checkedAt)||Date.now()-d.checkedAt>30*60000||!Array.isArray(d.models)||!Array.isArray(d.tracks))throw Error('image_schema');manifest=d;return d;}finally{clearTimeout(timer);pending=null;}})();return pending;}
 function figure(row,track=false,live=false){
  const fig=el('figure'),h=el('h4',labels[row.id]),caption=el('figcaption',`${track?'مسار موثق':live?'الضغط والأمطار':'خريطة أمطار مرجعية'} • تشغيل ${stamp(row.runAt)} • توقع ${stamp(row.validAt)}`),img=el('img'),state=el('p','جارٍ تحميل الصورة…','image-status');
  img.alt=labels[row.id]+' — '+(track?'مسار الحالة الموثق':live?'توقعات الضغط والأمطار':'تراكم الأمطار؛ ليست خريطة لمسار مركز الحالة');img.loading='lazy';img.decoding='async';img.src='.'+row.image;
  img.addEventListener('load',()=>{state.textContent='اضغط الصورة لتكبيرها';});img.addEventListener('error',()=>{img.hidden=true;state.className='image-error';state.textContent='تعذر تحميل الصورة. أعد فتح هذا القسم بعد التحقق من الاتصال.';});
  const zoom=el('button','تكبير الصورة ⤢','map-zoom-button');zoom.type='button';const enlarge=()=>{if(img.complete&&img.naturalWidth){const copy=img.cloneNode();copy.loading='eager';viewer(copy,labels[row.id]);}};zoom.onclick=enlarge;img.onclick=enlarge;
  const source=el('a','المصدر: Tropical Tidbits');source.href=row.sourcePage;source.target='_blank';source.rel='noopener noreferrer';
  if(track)source.textContent='مصدر المسار الموثق';fig.append(h,caption,img,state,zoom,source);return fig;
 }
 function mount(root){
  const details=el('details',undefined,'sea-map-gallery'),summary=el('summary','توقعات الموديلات للحالة — خرائط حية'),content=el('div');details.append(summary,content);root.append(details);
  details.addEventListener('toggle',async()=>{if(!details.open||content.dataset.loaded)return;content.textContent='جارٍ تحميل خرائط الموديلات…';try{const d=await load();content.replaceChildren();const tracks=d.tracks.filter(x=>validTrack(x));if(tracks.length){content.append(el('p','صور المسار الموثقة؛ راجع وقت كل موديل.'));tracks.forEach(x=>content.append(figure(x,true)));}else content.append(el('p','لا تتوفر صور حديثة موثقة لمسار مركز الحالة. خرائط الضغط والأمطار أدناه لا تُعد مسارًا رسميًا للإعصار.','archive-label'));
   content.append(el('p','خرائط الضغط والأمطار من أحدث تشغيل متاح لكل موديل؛ تساعد على متابعة مواضع المنخفض، ولا تمثل مسارًا رسميًا لمركز الحالة.','archive-label'));
   for(const row of d.models){if(labels[row.id]&&Array.isArray(row.frames)&&row.frames.length){const frame=row.frames.find(f=>f.hours===72)||row.frames[0];const fig=figure({...row,...frame},false,true),select=el('select');select.className='model-frame-select';select.setAttribute('aria-label','وقت توقع '+labels[row.id]);for(const f of row.frames){const option=el('option','بعد '+f.hours+' ساعة');option.value=String(f.hours);option.selected=f.hours===frame.hours;select.append(option);}select.addEventListener('change',()=>{const f=row.frames.find(f=>f.hours===Number(select.value));if(!f||!imagePath(f.image))return;const img=fig.querySelector('img');img.hidden=false;img.src='.'+f.image;fig.querySelector('figcaption').textContent='الضغط والأمطار • تشغيل '+stamp(row.runAt)+' • توقع '+stamp(f.validAt);fig.querySelector('.image-status,.image-error').textContent='جارٍ تحميل الصورة…';});fig.insertBefore(select,fig.querySelector('img'));content.append(fig);}}
   for(const id of d.unavailable||[])if(labels[id])content.append(el('p',labels[id]+': تعذر تحديث صور هذا الموديل مؤقتًا.','image-error'));
   content.dataset.loaded='true';
  }catch{content.textContent='تعذر تحميل قائمة الصور. أعد إغلاق القسم وفتحه للمحاولة مجددًا.';}});
 }
 window.HadaSeaMaps={mount,validTrack,imagePath};
})();
