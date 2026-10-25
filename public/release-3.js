(()=>{'use strict';
 const wind=document.getElementById('liveWind');
 function formatWind(){if(!wind||wind.querySelector('.wind-unit'))return;const raw=wind.textContent,match=raw.match(/^(.+?)\s+كم\/س$/);if(!match)return;const value=document.createElement('span'),unit=document.createElement('span');value.className='wind-value';value.textContent=match[1];unit.className='wind-unit';unit.textContent='كم/س';wind.replaceChildren(value,unit);}
 if(wind){new MutationObserver(formatWind).observe(wind,{childList:true,characterData:true,subtree:true});formatWind();}
 // Preview stays visibly identified. The release package does not silently
 // configure a production OneSignal app or enrol additional recipients.
 const preview=document.querySelector('.preview');if(preview)preview.textContent=location.hostname==='hada-weather.com'?'طقس هدى وما جاورها • توقعات قابلة للتغيّر':'معاينة راصد هدى المركزي • الموقع الرسمي دون تغيير';
})();
