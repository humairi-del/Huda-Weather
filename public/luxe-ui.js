/* Presentation only: native full-size card dialog; no forecast logic or network. */
(()=>{'use strict';
const canvas=document.getElementById('dailyWeatherCanvas'),zoom=document.getElementById('zoomDailyCard');
if(canvas&&zoom){const dialog=document.createElement('dialog');dialog.className='card-zoom-dialog';dialog.setAttribute('aria-labelledby','cardZoomTitle');dialog.innerHTML='<button class="close" type="button" aria-label="إغلاق تكبير البطاقة">×</button><h2 id="cardZoomTitle">تقويم طقس هدى</h2><img alt="بطاقة طقس هدى بالحجم الكامل">';document.body.appendChild(dialog);const image=dialog.querySelector('img'),close=()=>dialog.close();dialog.querySelector('button').onclick=close;dialog.onclick=e=>{if(e.target===dialog)close();};dialog.addEventListener('close',()=>zoom.focus());
function open(){image.src=canvas.toDataURL('image/png');image.alt=canvas.getAttribute('aria-label')||'بطاقة طقس هدى';dialog.showModal();}zoom.onclick=open;canvas.onclick=open;canvas.setAttribute('tabindex','0');canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});}
// Keep observer names readable without altering calendars, calculations or table controls.
for(const id of ['star-thay','star-qushar']){const title=document.querySelector('#'+id+' h2');if(title){const parts=title.innerHTML.split('<br>');if(parts.length===2)title.innerHTML=parts[0]+'<span>'+parts[1]+'</span>';}}
})();
