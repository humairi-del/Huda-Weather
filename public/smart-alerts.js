(()=>{'use strict';const box=document.getElementById('smartWeatherAlerts'),C=window.HadaWeatherCore;if(!box||!C)return;let latest=null;
function render(){const result=C.alerts(latest);box.replaceChildren();box.dataset.state=result.items.length?'active':result.complete?'quiet':'partial';const title=document.createElement('p');title.className='alert-strip-title';title.textContent='🔔 تنبيهات الطقس خلال الـ 3 أيام القادمة: '+(result.items.length?'':result.complete?'لا توجد تنبيهات مهمة':'البيانات غير مكتملة');box.appendChild(title);
 if(result.items.length){const list=document.createElement('ul');for(const item of result.items){const li=document.createElement('li'),date=new Intl.DateTimeFormat('ar-YE-u-nu-arab',{timeZone:C.ZONE,weekday:'long',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(C.stamp(item.time)));li.textContent=date+' · '+item.text;list.appendChild(li);}box.appendChild(list);}
 if(result.missing.length&&latest){const note=document.createElement('small');note.textContent='لم تكتمل بيانات '+result.missing.join(' و')+'؛ يتجدد الفحص تلقائيًا.';box.appendChild(note);}}
window.addEventListener('hada:weather',e=>{latest=e.detail;render();});render();
})();
