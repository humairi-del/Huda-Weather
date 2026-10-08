// Staging-only read-only owner draft review. No public write operations.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const select=$('reviewSection'),load=$('reviewLoad'),status=$('reviewStatus'),draft=$('reviewDraft');
const knownPublic={site:{title:'طقس هدى وما جاورها',source:'main/index.html'},prayers:{title:'مواقيت الصلاة',source:'main/base-2.1.1.html و prayer-7day.js'},alerts:{title:'تنبيهات الطقس',source:'main/base-2.1.1.html و patch-2.2.js'},modules:{title:'الأقسام والخدمات',source:'main/index.html و base-2.1.1.html'}};
const publicLabel=$('reviewPublic');
function describePublic(){const record=knownPublic[select.value];publicLabel.textContent='القسم الموجود في الموقع: '+record.title+'؛ الملفات المرجعية: '+record.source+'؛ '+reviewReadiness(select.value);}
select.addEventListener('change',describePublic);describePublic();
const reviewedSnapshot={site:{title:'طقس هدى وما جاورها',sourceRevision:'39206620492782c51313fdee7802b697dad536cc'}};
function showSiteTitleDiff(title){
 if(select.value!=='site')return;
 const current=reviewedSnapshot.site;
 const normalized=title.trim();
 publicLabel.textContent='عنوان الموقع في نسخة main المفحوصة: '+current.title+'؛ النسخة المرجعية: '+current.sourceRevision.slice(0,7)+'؛ عنوان مسودة المالك: '+normalized+'؛ '+(normalized===current.title?'العنوان متطابق':'العنوان مختلف ويحتاج موافقة قبل تطبيقه')+'؛ المقارنة تخص العنوان فقط ولا تمثل تغييرًا منشورًا.';
}
const publicReference={site:{title:'طقس هدى وما جاورها',file:'index.html',sha:'39206620492782c51313fdee7802b697dad536cc'},prayers:{file:'base-2.1.1.html',note:'توجد مواقيت افتراضية ثابتة؛ التحديث النهائي يتطلب فحص prayer-7day.js'},alerts:{file:'patch-2.2.js',note:'تنبيهات الطقس تشمل حسابات آلية؛ لا يجوز استبدالها بمسودة نصية'},modules:{file:'base-2.1.1.html',note:'الأقسام مبنية داخل الصفحة؛ المسودة النصية لا تمثل مفاتيح تشغيل جاهزة'}};
function reviewReadiness(section){
 const reference=publicReference[section];
 return 'مرجع العرض: '+reference.file+'؛ '+(reference.note||'يمكن مقارنة عنوان الموقع مع نسخة main المحددة')+'؛ لا يوجد نشر تلقائي.';
}
const diff=$('reviewDiff'),copy=$('reviewCopyPlan'),planStatus=$('reviewPlanStatus');
let lastPlan='';
function clearPlan(){lastPlan='';copy.disabled=true;diff.textContent='حمّل المسودة لإنشاء تقرير مقارنة.';planStatus.textContent='';}
function makePlan(section,data){
 const baseline=publicReference[section],title=data.payload.title.trim(),body=data.payload.body;
 const changedTitle=section==='site'&&title!==reviewedSnapshot.site.title;
 const lines=[
 'تقرير مراجعة تغيير — بيئة المالك فقط',
 'القسم: '+section,
 'رقم المسودة: '+data.revision,
 'عنوان المسودة: '+title,
 'طول المحتوى: '+body.length+' حرف',
 'مرجع الموقع العام: '+baseline.file,
 'نسخة index.html المرجعية: '+reviewedSnapshot.site.sourceRevision,
 'المقارنة: '+(section==='site'?(changedTitle?'عنوان الموقع مختلف عن المرجع':'عنوان الموقع مطابق للمرجع'):'لا توجد مقارنة قيم تلقائية موثوقة لهذا القسم'),
 'حالة النشر: ممنوع حتى مراجعة ملف الموقع الحالي والتغييرات والموافقة المستقلة',
 'خطة التطبيق: إنشاء فرع نشر منفصل من main الحالي؛ تجهيز فرق محدد للملف؛ مراجعة بشرية؛ اختبارات؛ اعتماد التغيير؛ نشر مراقب',
 'خطة الرجوع: حفظ SHA السابق للفرع العام ونسخة الملفات المتغيرة؛ في حال الفشل إعادة الملفات المعتمدة السابقة عبر تغيير عكسي مُراجع؛ التحقق من صحة الموقع',
 'تحذير: هذا التقرير لا ينفذ نشرًا أو استرجاعًا.'
 ];
 lastPlan=lines.join('\\n');
 diff.textContent=section==='site'?(changedTitle?'اختلاف مؤكد في عنوان الموقع بين المسودة والنسخة المرجعية.':'عنوان الموقع مطابق للنسخة المرجعية.'): 'القسم '+section+' يحتاج محول بيانات منظّم قبل إجراء مقارنة قيم دقيقة.';
 copy.disabled=false;
}
copy.addEventListener('click',async()=>{
 if(!lastPlan)return;
 try{await navigator.clipboard.writeText(lastPlan);planStatus.textContent='تم نسخ تقرير المراجعة وخطة الرجوع. لا يوجد نشر.'}
 catch{planStatus.textContent='تعذر النسخ؛ لا يوجد نشر.'}
});

let serial=0;
select.addEventListener('change',()=>{
 serial++;load.disabled=false;clearPlan();draft.textContent='لم يتم تحميل المسودة.';status.textContent='اختر تحميل بيانات المراجعة.';
});
load.addEventListener('click',async()=>{
 const section=select.value,request=++serial;
 clearPlan();
 load.disabled=true;status.textContent='جاري قراءة المسودة المحفوظة...';
 try{
  const response=await fetch('/api/entries/'+section+':draft',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
  if(request!==serial||section!==select.value)return;
  if(response.status===404){clearPlan();draft.textContent='لا توجد مسودة محفوظة لهذا القسم.';status.textContent='لم يُحفظ محتوى بعد.';return}
  if(!response.ok)throw Error('تعذر قراءة المسودة المحمية: '+response.status);
  const data=await response.json();
  if(!data.payload||typeof data.payload.title!=='string'||typeof data.payload.body!=='string')throw Error('صيغة المسودة غير صالحة');
  draft.textContent=data.payload.title+String.fromCharCode(10,10)+data.payload.body;
  showSiteTitleDiff(data.payload.title);
  makePlan(section,data);
  status.textContent='تمت قراءة المسودة رقم '+data.revision+'. هذه معاينة فقط؛ لم يتم النشر.';
 }catch(error){
  if(request===serial){clearPlan();draft.textContent='تعذر عرض المسودة.';status.textContent=error.message}
 }finally{if(request===serial)load.disabled=false}
});
})();
