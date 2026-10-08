// Isolated owner-only drafts: never publishes to the public weather website.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const section=$('settingsSection'),title=$('settingsTitle'),body=$('settingsBody'),status=$('settingsStatus'),load=$('settingsLoad'),save=$('settingsSave');
let revision=null, loadedSection=null, sequence=0, editVersion=0;
const preview=$('settingsPreview');
function renderPreview(){preview.textContent=(title.value.trim()||'بدون عنوان')+'\n\n'+(body.value||'لا يوجد محتوى بعد.')}
for(const field of [title,body])field.addEventListener('input',()=>{editVersion++;renderPreview()});
const report=s=>{status.textContent=s};
const reset=()=>{sequence++;revision=null;loadedSection=null;title.value='';body.value='';renderPreview();report('اختر تحميل المسودة قبل الحفظ.')};
section.addEventListener('change',reset);
async function call(path,options={}){
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{accept:'application/json',...(options.headers||{})}});
 const result=await res.json().catch(()=>({error:'استجابة غير صالحة'}));
 if(!res.ok){const err=new Error(result.error||'فشل الاتصال');err.status=res.status;throw err}
 return result;
}
load.addEventListener('click',async()=>{
 const selected=section.value, request=++sequence, edits=editVersion;load.disabled=true;
 try{
  const data=await call('/api/entries/'+selected+':draft');
  if(request!==sequence||selected!==section.value||edits!==editVersion){report('تغيرت البيانات أثناء التحميل. أعد التحميل بعد حفظ ملاحظاتك.');return}
  title.value=data.payload.title||'';body.value=data.payload.body||'';
  revision=data.revision;loadedSection=selected;renderPreview();report('تم تحميل المسودة. النسخة رقم '+revision);
 }catch(e){
  if(request!==sequence||selected!==section.value||edits!==editVersion)return;
  if(e.status===404){title.value='';body.value='';revision=0;loadedSection=selected;renderPreview();report('لا توجد مسودة سابقة. يمكنك إنشاء مسودة جديدة.')}
  else report('تعذر التحميل: '+e.message);
 }finally{load.disabled=false}
});
save.addEventListener('click',async()=>{
 const selected=section.value;
 if(loadedSection!==selected||revision===null){report('حمّل المسودة أولًا لتجنب الكتابة فوق تعديل آخر.');return}
 if(!title.value.trim()||title.value.length>120||body.value.length>5000){report('العنوان مطلوب، والحد الأقصى للمحتوى 5000 حرف.');return}
 const version=revision,request=++sequence,edits=editVersion;save.disabled=true;
 try{
  const data=await call('/api/entries/'+selected+':draft',{method:'PUT',headers:{'content-type':'application/json','if-match':String(version)},body:JSON.stringify({title:title.value.trim(),body:body.value})});
  if(request!==sequence||selected!==section.value)return;
  revision=data.revision;if(edits!==editVersion){report('تم حفظ النسخة المرسلة، لكنك عدّلت المحتوى أثناء الحفظ؛ راجع التعديلات الجديدة.');return}report('تم حفظ المسودة في قاعدة التطوير. النسخة رقم '+revision+'. لم يتم نشر أي تعديل على الموقع العام.');
 }catch(e){if(e.status===409){revision=null;loadedSection=null}report('تعذر الحفظ: '+e.message+(e.status===409?' — حمّل النسخة الجديدة ثم راجع التعديل.':''))}
 finally{save.disabled=false}
});

const templates={
 site:{title:'معلومات موقع طقس هدى وما جاورها',lines:['نبذة الموقع:','النطاق الجغرافي: هدى — حبان — شبوة','معلومات التواصل:','رقم الإصدار:','ملاحظات الإدارة:']},
 prayers:{title:'مراجعة مواقيت الصلاة — هدى',lines:['تاريخ المراجعة:','مصدر المواقيت:','الشروق:','الغروب:','الفجر:','الظهر:','العصر:','المغرب:','العشاء:','ملاحظات المطابقة مع لوحة الجامع:']},
 alerts:{title:'مراجعة تنبيهات الطقس',lines:['تاريخ المراجعة:','المنطقة: هدى وحبان','نوع التنبيه:','درجة الخطورة:','بداية الحالة:','نهاية الحالة:','المصدر:','ملاحظات:']},
 modules:{title:'تنظيم أقسام الموقع',lines:['الحالة الحالية:','الحالة الجوية:','الساعات القادمة:','توقعات الأيام:','بحر العرب:','الزلازل:','توقعات الموديلات:','حساب النجوم:','ملاحظات التفعيل:']}
};
$('settingsTemplate').addEventListener('click',()=>{
 const template=templates[section.value];
 if(!template)return;
 if((title.value.trim()||body.value.trim())&&!confirm('سيستبدل النموذج النص الموجود في هذا القسم. هل تريد المتابعة؟'))return;
 title.value=template.title;
 body.value=template.lines.join(String.fromCharCode(10));
 editVersion++;
 renderPreview();
 report('تم إدراج نموذج إرشادي قابل للتعديل. لم يُحفظ ولم يُنشر بعد.');
});
renderPreview();
report('هذه مسودات تجريبية لا تظهر على الموقع العام.');
})();