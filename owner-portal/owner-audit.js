// Owner-only audit history; read-only and contains no draft contents.
(()=>{
'use strict';
const button=document.getElementById('auditRefresh'),status=document.getElementById('auditStatus'),list=document.getElementById('auditList');
button.addEventListener('click',async()=>{
 button.disabled=true;status.textContent='جارٍ تحميل سجل التعديلات…';list.replaceChildren();
 try{
  const response=await fetch('/api/audit',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'تعذر التحميل');
  if(!Array.isArray(data.events))throw new Error('استجابة غير صالحة');
  for(const event of data.events){
   const item=document.createElement('li');
   const time=Date.parse(event.created_at);
   const when=Number.isFinite(time)?new Date(time).toLocaleString('ar-YE'):'تاريخ غير متاح';
   item.textContent=String(event.entry_id||'تعديل')+' — '+when;
   list.append(item);
  }
  status.textContent=data.events.length?'تم تحميل آخر '+data.events.length+' عملية.':'لا توجد عمليات مسجلة حتى الآن.';
 }catch(error){status.textContent='تعذر عرض السجل: '+error.message}
 finally{button.disabled=false}
});
})();