/* متابعة مسار الحالة المدارية - واجهة معلومات مستقلة، دون تعديل المحرك */
(function(){
  'use strict';
  function mount(){
    const modal=document.getElementById('seaModal');
    if(!modal||document.getElementById('hadaTropicalTrack'))return;
    const panel=document.createElement('section');
    panel.id='hadaTropicalTrack';
    panel.setAttribute('dir','rtl');
    panel.style.cssText='margin:16px 10px;padding:16px;border:1px solid #467a91;border-radius:14px;background:#102c3b;color:#f5fbff;line-height:1.9;text-align:right';
    panel.innerHTML='<h3 style="margin:0 0 8px">🌀 متابعة مسار الحالة المدارية</h3>'+
      '<p style="margin:0 0 8px">حالة جنوب غربي بحر العرب التي ظهرت في 18 أكتوبر 2026: آخر وصف موثق هنا هو منطقة ضغط منخفض واضحة المعالم. لا تُعرض هذه المعلومة باعتبارها رصدًا لحظيًا.</p>'+
      '<p style="margin:0 0 8px"><strong>المسار المعلن في نشرة 18 أكتوبر:</strong> حركة أولية شرقًا/شمال شرق، ثم اتجاه متوقع شمال غرب نحو الصومال. هذا توقع قابل للتغير، وليس مسار وصول مؤكد.</p>'+
      '<p style="margin:0 0 8px"><strong>شبوة – حبان – هدى:</strong> لا يوجد في هذه البطاقة تحذير رسمي مؤكد من تأثير مباشر. لا تستنتج أمطارًا أو سيولًا من مسار المركز وحده.</p>'+
      '<p style="margin:0 0 10px;font-size:.9em;color:#b6d6e6">آخر مرجع للحالة: 18 أكتوبر 2026. لم تُربط البطاقة بجلب مباشر؛ راجع المصدر قبل الاعتماد على أي تحديث.</p>'+
      '<a href="https://rsmcnewdelhi.imd.gov.in/" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 12px;border-radius:8px;background:#166080;color:white;text-decoration:none">النشرات الرسمية ومسار الحالة ↗</a>';
    const heading=modal.querySelector('h2');
    if(heading&&heading.parentNode)heading.insertAdjacentElement('afterend',panel);else modal.appendChild(panel);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  new MutationObserver(function(){if(document.getElementById('seaModal')&&!document.getElementById('hadaTropicalTrack'))mount();}).observe(document.documentElement,{childList:true,subtree:true});
})();
