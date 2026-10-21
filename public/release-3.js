(()=>{'use strict';
 const wind=document.getElementById('liveWind');
 function formatWind(){if(!wind||wind.querySelector('.wind-unit'))return;const raw=wind.textContent,match=raw.match(/^(.+?)\s+كم\/س$/);if(!match)return;const value=document.createElement('span'),unit=document.createElement('span');value.className='wind-value';value.textContent=match[1];unit.className='wind-unit';unit.textContent='كم/س';wind.replaceChildren(value,unit);}
 if(wind){new MutationObserver(formatWind).observe(wind,{childList:true,characterData:true,subtree:true});formatWind();}
 // Preview stays visibly identified. The release package does not silently
 // configure a production OneSignal app or enrol additional recipients.
 const preview=document.querySelector('.preview');if(preview)preview.textContent=location.hostname==='hada-weather.com'?'طقس هدى وما جاورها • توقعات قابلة للتغيّر':'معاينة preview-v4 • طقس هدى';
 // The rain viewer is independent of the removed model gallery.
 let imageDialog=null,returnFocus=null;
 function openRainMap(svg){
  if(!imageDialog){
   imageDialog=document.createElement('dialog');imageDialog.className='map-image-dialog';imageDialog.setAttribute('aria-labelledby','rainImageTitle');
   const close=document.createElement('button');close.type='button';close.textContent='إغلاق ×';
   const title=document.createElement('h3');title.id='rainImageTitle';title.textContent='خريطة توقعات الأمطار – ٧ أيام';
   const scroll=document.createElement('div');scroll.className='image-scroll';
   imageDialog.append(close,title,scroll);document.body.append(imageDialog);
   close.onclick=()=>imageDialog.close();imageDialog.addEventListener('close',()=>returnFocus?.focus());
   imageDialog.addEventListener('click',e=>{if(e.target===imageDialog)imageDialog.close();});
  }
  returnFocus=document.activeElement;const content=svg.cloneNode(true);content.removeAttribute('aria-labelledby');content.setAttribute('aria-label','خريطة توقعات الأمطار المكبرة');content.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  const scroll=imageDialog.querySelector('.image-scroll');scroll.replaceChildren(content);imageDialog.showModal();scroll.scrollLeft=0;scroll.scrollTop=0;
 }
 const map=document.getElementById('rainAccumulationMap');
 if(map){const button=document.createElement('button');button.type='button';button.className='map-zoom-button';button.textContent='تكبير الخريطة وقراءة الأسماء والأرقام ⤢';map.insertAdjacentElement('afterend',button);const update=()=>{button.disabled=!map.querySelector('svg');};new MutationObserver(update).observe(map,{childList:true});update();button.addEventListener('click',()=>{const svg=map.querySelector('svg');if(svg)openRainMap(svg);});}
})();
