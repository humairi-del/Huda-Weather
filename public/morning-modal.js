// Preserve existing notification deep links without adding a bulky page section.
(()=>{'use strict';
 if(new URLSearchParams(location.search).get('bulletin')!=='today')return;
 const modal=document.createElement('div');modal.className='modal';modal.style.display='flex';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','morningTitle');
 const box=document.createElement('div');box.className='modal-box';
 const bar=document.createElement('div');bar.className='modal-bar';
 const title=document.createElement('h2');title.id='morningTitle';title.textContent='☀️ صباح هدى';
 const close=document.createElement('button');close.type='button';close.className='close';close.textContent='×';close.setAttribute('aria-label','إغلاق نشرة صباح هدى');
 const content=document.createElement('div');content.setAttribute('aria-live','polite');content.textContent='جارٍ تجهيز نشرة اليوم…';
 bar.append(title,close);box.append(bar,content);modal.append(box);document.body.append(modal);
 const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';close.focus();
 const abort=new AbortController();let timer;
 function shut(){abort.abort();clearTimeout(timer);modal.remove();document.removeEventListener('keydown',key);document.body.style.overflow=previousOverflow;previousFocus?.focus();}
 function key(e){if(e.key==='Escape')shut();if(e.key==='Tab'){const controls=[...box.querySelectorAll('button,a[href]')];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 close.onclick=shut;modal.onclick=e=>{if(e.target===modal)shut();};document.addEventListener('keydown',key);
 const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
 async function load(){
  content.replaceChildren(text('p','جارٍ تجهيز نشرة اليوم…'));timer=setTimeout(()=>abort.abort(),18000);
  try{
   await window.HadaLiveWeather.refresh();
   const data=window.HadaLiveWeather.getData();if(!data)throw Error('forecast');
   const b=window.HadaDailyBulletin.build(data,new Date(),window.HadaStarCalendar);
   if(abort.signal.aborted)return;
   content.replaceChildren(text('p',new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',weekday:'long',day:'numeric',month:'long'}).format(new Date())),text('h3','توقعات هدى اليوم'));
   const units=(v,u)=>v===null?'غير متاح':Math.round(v)+u;
   content.append(text('p','الحرارة '+units(b.min,'°')+' – '+units(b.max,'°')+' · احتمال المطر '+units(b.chance,'٪')));
   for(const p of b.periods){const section=document.createElement('article');section.className='install-step';section.style.marginBottom='12px';section.append(text('h3',p.name),text('p',p.description+' · '+(p.temp?Math.round(p.temp.min)+'° – '+Math.round(p.temp.max)+'°':'الحرارة غير متاحة')));content.append(section);}
   for(const s of b.stars)content.append(text('p',s.name+' · '+(s.star?s.star+' · المتبقي '+window.HadaDailyBulletin.formatDays(s.remaining):'غير متاح')));
   for(const notice of b.notices)content.append(text('p',notice));
   if(!b.complete)content.append(text('p','بعض ساعات اليوم غير متاحة؛ النشرة غير مكتملة.'));
   content.append(text('small','المصدر: Open-Meteo · التوقعات قابلة للتغير.'));
  }catch{if(modal.isConnected&&!abort.signal.aborted)content.replaceChildren(text('p','تعذر تحميل النشرة الآن. أغلق النافذة وتابع توقعات الصفحة، ثم حاول لاحقًا.'));else if(modal.isConnected)content.replaceChildren(text('p','تأخر تحميل النشرة. أغلق النافذة وتابع توقعات الصفحة.'));}
  finally{clearTimeout(timer);}
 }
 load();
})();
