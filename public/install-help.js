(()=>{'use strict';
 const $=id=>document.getElementById(id),steps=$('installSteps'),title=$('installDeviceTitle'),text=$('installDeviceText'),hint=$('installHint');
 if(!steps||!title||!text)return;
 const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/.test(ua),chrome=/Chrome\//.test(ua)&&!/EdgA|OPR|SamsungBrowser/.test(ua),safari=/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS/.test(ua);
 const standalone=window.matchMedia('(display-mode: standalone)');let installed=standalone.matches||navigator.standalone===true;
 function render(){
  steps.hidden=!!installed;
  if(installed){$('installTitle').textContent='تنبيهات طقس هدى';hint.hidden=true;$('nativeInstall').hidden=true;return;}
  hint.hidden=true;
  if(android&&chrome){title.textContent='أندرويد — Chrome';text.textContent='افتح قائمة ⋮ ثم اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».';}
  else if(ios&&safari){title.textContent='آيفون — Safari';text.textContent='افتح قائمة الصفحة أو زر المزيد (…) ثم «مشاركة» ← «إضافة إلى الشاشة الرئيسية» ← «إضافة». وقد يظهر زر المشاركة مباشرة حسب إصدار Safari.';}
  else if(ios){title.textContent='آيفون';text.textContent='افتح رابط الموقع في Safari، ثم اختر «إضافة إلى الشاشة الرئيسية» من قائمة المشاركة.';}
  else if(android){title.textContent='أندرويد';text.textContent='افتح رابط الموقع في Chrome، ثم قائمة ⋮ ← «إضافة إلى الشاشة الرئيسية».';}
  else{title.textContent='إضافة الموقع';text.textContent='افتح قائمة المتصفح واختر «تثبيت طقس هدى» إن ظهر الخيار.';}
 }
 window.addEventListener('appinstalled',()=>{installed=true;render();});
 standalone.addEventListener?.('change',e=>{installed=e.matches;render();});render();
})();
