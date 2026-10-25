(()=>{'use strict';
const valid=p=>typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=100;
function probability(p){return !valid(p)?'الفرصة غير متاحة':p===0?'لا فرصة واضحة':p<40?'احتمال ضعيف':p<60?'فرصة واردة':'فرصة مرتفعة';}
function brief(p,code){
 if(!valid(p))return 'توقع المطر غير متاح';
 if(p===0)return [0,1].includes(code)?'صحو غالبًا':code===2?'غيوم متفرقة':'لا تبرز فرصة مطر';
 if(p<40)return 'احتمال ضعيف للمطر';
 // Intensity comes from the forecast weather code, never from probability alone.
 if([95,96,99].includes(code))return 'أمطار رعدية محتملة';
 if([65,82].includes(code))return 'أمطار غزيرة محتملة';
 if([63,81].includes(code))return 'أمطار متوسطة محتملة';
 if([51,53,55,56,57,61,80].includes(code))return 'فرصة أمطار خفيفة متفرقة';
 return p>=60?'فرصة مرتفعة للمطر':'فرصة أمطار متفرقة';
}
window.HadaRainLanguage={probability,brief};
})();
