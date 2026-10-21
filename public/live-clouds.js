(()=>{'use strict';
const frame=document.getElementById('windyLiveMap'),button=document.getElementById('refreshLiveClouds'),status=document.getElementById('liveCloudRefreshStatus');
if(!frame||!button)return;
function refresh(){frame.src=frame.src;if(status)status.textContent='آخر طلب تحديث: '+new Intl.DateTimeFormat('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit'}).format(new Date());}
button.addEventListener('click',refresh);
setInterval(()=>{if(!document.hidden)refresh();},15*60*1000);
})();
