// Read-only owner dashboard; never publishes to the public website.
(()=>{
'use strict';
const button=document.getElementById('overviewRefresh'),status=document.getElementById('overviewStatus'),list=document.getElementById('overviewList');
const labels={stars:'النجوم',site:'معلومات الموقع',prayers:'مواقيت الصلاة',alerts:'تنبيهات الطقس',modules:'الأقسام والخدمات',rates:'أسعار الصرف',sponsor:'الراعي'};
button.addEventListener('click',async()=>{
 button.disabled=true;status.textContent='جارٍ تحميل الملخص…';list.replaceChildren();
 try{
  const response=await fetch('/api/overview',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'تعذر التحميل');
  if(!Array.isArray(data.sections))throw new Error('استجابة غير صالحة');
  for(const item of data.sections){
   if(typeof item.section!=='string'||!Number.isSafeInteger(item.entries)||item.entries<0)continue;
   const li=document.createElement('li');li.textContent=(labels[item.section]||'قسم آخر')+': '+item.entries+' سجل';list.append(li);
  }
  status.textContent=data.sections.length?'تم تحديث الملخص من قاعدة التطوير.':'قاعدة التطوير لا تحتوي على سجلات بعد.';
 }catch(error){status.textContent='تعذر تحميل الملخص: '+error.message}
 finally{button.disabled=false}
});
})();