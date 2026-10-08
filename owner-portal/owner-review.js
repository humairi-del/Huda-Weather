// Staging-only read-only owner draft review. No public write operations.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const select=$('reviewSection'),load=$('reviewLoad'),status=$('reviewStatus'),draft=$('reviewDraft');
let serial=0;
select.addEventListener('change',()=>{
 serial++;draft.textContent='لم يتم تحميل المسودة.';status.textContent='اختر تحميل بيانات المراجعة.';
});
load.addEventListener('click',async()=>{
 const section=select.value,request=++serial;
 load.disabled=true;status.textContent='جاري قراءة المسودة المحفوظة...';
 try{
  const response=await fetch('/api/entries/'+section+':draft',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
  if(request!==serial||section!==select.value)return;
  if(response.status===404){draft.textContent='لا توجد مسودة محفوظة لهذا القسم.';status.textContent='لم يُحفظ محتوى بعد.';return}
  if(!response.ok)throw Error('تعذر قراءة المسودة المحمية: '+response.status);
  const data=await response.json();
  if(!data.payload||typeof data.payload.title!=='string'||typeof data.payload.body!=='string')throw Error('صيغة المسودة غير صالحة');
  draft.textContent=data.payload.title+String.fromCharCode(10,10)+data.payload.body;
  status.textContent='تمت قراءة المسودة رقم '+data.revision+'. هذه معاينة فقط؛ لم يتم النشر.';
 }catch(error){
  if(request===serial){draft.textContent='تعذر عرض المسودة.';status.textContent=error.message}
 }finally{load.disabled=false}
});
})();
