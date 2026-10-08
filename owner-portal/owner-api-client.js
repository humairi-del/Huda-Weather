// Owner portal: explicit remote save/load controls.
// This file is not active on the public weather website.
// Requires same-origin Cloudflare Access protected Worker API.
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const status=document.createElement('p');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 status.style.cssText='padding:12px;border:1px solid #486d83;border-radius:10px';
 const panel=document.createElement('div');
 panel.className='actions';
 const connect=document.createElement('button');connect.textContent='التحقق من دخول المالك';
 const load=document.createElement('button');load.textContent='تحميل بيانات النجم المحفوظة';
 const save=document.createElement('button');save.textContent='حفظ النجم في قاعدة البيانات';
 panel.append(connect,load,save);
 $('stars').append(panel,status);
 let actor=null;
 const revisions=new Map();
 const entryId=()=>['stars',$('observer').value,$('season').value,$('star').value].join(':');
 const say=message=>{status.textContent=message};
 async function api(path,opts={}){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json',...(opts.headers||{})},...opts});
  let result;
  try{result=await response.json()}catch{throw Error('استجابة غير صالحة من الخادم')}
  if(!response.ok){const error=new Error(result.error||'فشل الاتصال');error.code=response.status;throw error}
  return result;
 }
 async function check(){
  try{
   actor=await api('/api/me');
   if(actor.role!=='owner')throw Error('هذا الحساب ليس حساب المالك');
   say('تم التحقق من حساب المالك: '+actor.email);
  }catch(e){actor=null;say('لم ينجح التحقق من الدخول: '+e.message)}
 }
 async function fetchEntry(){
  if(!actor){say('تحقق من حساب المالك أولًا');return}
  const id=entryId();
  try{
   const data=await api('/api/entries/'+id);
   if(id!==entryId()){say('تغير النجم أثناء التحميل، أعد المحاولة');return}
   if(!data.payload||typeof data.payload.date!=='string'||typeof data.payload.detail!=='string')throw Error('بيانات النجم غير مكتملة');
   $('date').value=data.payload.date;
   $('detail').value=data.payload.detail;
   revisions.set(id,data.revision);
   say('تم تحميل البيانات من قاعدة التطوير. النسخة رقم '+data.revision);
  }catch(e){
   if(e.code===404){revisions.set(id,0);say('هذا النجم لم يُحفظ بعد. يمكنك إدخال تفاصيله وحفظه لأول مرة.')}
   else say('تعذر تحميل النجم: '+e.message)
  }
 }
 async function saveEntry(){
  if(!actor){say('تحقق من حساب المالك أولًا');return}
  const id=entryId();
  if(!revisions.has(id)){say('حمّل بيانات هذا النجم أولًا لتجنب الكتابة فوق تعديل آخر');return}
  const date=$('date').value,detail=$('detail').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||detail.length>5000){say('تحقق من التاريخ وطول التفاصيل (5000 حرف كحد أقصى)');return}
  const payload={date,detail,name:$('star').selectedOptions[0]?.textContent||''};
  save.disabled=true;
  try{
   const result=await api('/api/entries/'+id,{method:'PUT',headers:{'content-type':'application/json','if-match':String(revisions.get(id))},body:JSON.stringify(payload)});
   revisions.set(id,result.revision);
   say('تم الحفظ في قاعدة بيانات التطوير. النسخة رقم '+result.revision+'. لا يظهر التعديل في الموقع العام.');
  }catch(e){
   if(e.code===409)revisions.delete(id);
   say('لم يتم الحفظ: '+e.message+(e.code===409?' — أعد تحميل النجم ثم راجع التغييرات':''));
  }finally{save.disabled=false}
 }
 connect.addEventListener('click',check);
 load.addEventListener('click',fetchEntry);
 save.addEventListener('click',saveEntry);
 say('هذه الأدوات لا تعمل إلا بعد نشر واجهة الإدارة والخادم معًا خلف Cloudflare Access.');
})();
