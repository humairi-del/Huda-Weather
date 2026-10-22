(()=>{'use strict';
const C=window.HadaWeatherCore,canvas=document.getElementById('dailyWeatherCanvas'),save=document.getElementById('saveDailyCard'),status=document.getElementById('dailyCardStatus');if(!canvas||!C||!save)return;
const ctx=canvas.getContext('2d');let latest=null,renderedDay='';const green='#153f36',ink='#18352e',muted='#60736a',gold='#bd9456';
function rect(x,y,w,h,fill,r=24){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function text(value,y,size=36,color=ink,weight='normal',x=540,align='center'){ctx.fillStyle=color;ctx.font=weight+' '+size+'px Tahoma, Arial, sans-serif';ctx.direction='rtl';ctx.textAlign=align;ctx.fillText(value,x,y);}
function wrap(value,y,size=36,width=860,lineHeight=55,color=ink){ctx.font=size+'px Tahoma, Arial, sans-serif';const words=value.split(/\s+/);let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>width&&line){text(line,y,size,color);y+=lineHeight;line=word;}else line=next;}if(line)text(line,y,size,color);return y;}
const unit=(n,suffix)=>C.finite(n)?C.number(n,1)+suffix:'غير متاح';
function metric(x,y,title,value){rect(x,y,444,122,'#edf2eb',20);text(title,y+42,30,muted,'normal',x+222);text(value,y+92,38,ink,'bold',x+222);}
function draw(){
 const now=Date.now(),d=C.cardData(latest,window.HadaStarCalendar,now);renderedDay=d.day;canvas.width=1080;canvas.height=1920;ctx.fillStyle='#faf8f1';ctx.fillRect(0,0,1080,1920);
 ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(28,28,1024,1864);rect(48,48,984,295,green,25);
 text('تقويم',103,36,'#e5d8b8');text('طـقـس هـدى',199,84,'#ffffff','bold');text('وما جاورها',248,34,'#e5d8b8');
 text('الموقع الرسمي لـ طقس',294,25,'#ffffff','normal',750);ctx.direction='ltr';ctx.font='25px Arial';ctx.textAlign='center';ctx.fillText('https://hada-weather.com',380,294);
 const time=new Date(now),greg=new Intl.DateTimeFormat('ar-YE-u-nu-arab',{timeZone:C.ZONE,day:'numeric',month:'long',year:'numeric'}).format(time),hijri=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab',{timeZone:C.ZONE,day:'numeric',month:'long',year:'numeric'}).format(time);
 text(C.weekday(d.day),408,46,green,'bold');text(hijri,461,32);text(greg,508,30,muted);
 text('أجواء هدى اليوم',580,31,muted);const code=d.code,emoji=code===null?'':[95,96,99].includes(code)?'⛈️':[51,53,55,61,63,65,80,81,82].includes(code)?'🌧️':code===0?'☀️':'⛅';text(emoji+' '+C.description(code),645,48,green,'bold');
 metric(564,692,'🌡️ الحرارة · العظمى / الصغرى',unit(d.max,'°')+' / '+unit(d.min,'°'));
 metric(72,692,'💧 الرطوبة الآن',unit(d.humidity,'٪'));
 metric(564,838,'💨 اتجاه الرياح الآن',d.direction);
 metric(72,838,'💨 سرعة الرياح الآن',unit(d.wind,' كم/س'));
 rect(72,992,936,89,green,20);text('🌧️ نسبة المطر المتوقعة اليوم: '+unit(d.chance,'٪'),1049,38,'#ffffff','bold');
 rect(72,1106,936,144,'#eee5d3',20);text('أفضل فرصة مطر على هدى خلال الأسبوع',1151,31,green,'bold');text(d.best?C.weekday(d.best.day)+' · '+unit(d.best.chance,'٪'):'البيانات غير مكتملة',1199,37,green,'bold');text(d.best?d.best.description:'تظهر الفرصة بعد تحديث التوقعات',1237,27,muted);
 text('النجوم والمواسم الزراعية',1310,34,green,'bold');
 for(let i=0;i<2;i++){const s=d.stars[i],y=1352+i*110;text(s?.name||'بانتظار الجدول المعتمد',y,30,ink,'bold');text(s?'⭐ '+s.star+'  ·  المنقضي '+C.number(s.elapsed)+'  ·  المتبقي '+C.number(s.remaining)+' يومًا':'الجدول غير متاح',y+44,30,muted);}
 ctx.strokeStyle='#dfd5bf';ctx.beginPath();ctx.moveTo(120,1555);ctx.lineTo(960,1555);ctx.stroke();text('نفحات إيمانية',1611,32,green,'bold');wrap(d.reflection,1670,36,850,52);
 text(d.ramadan?.active?'رمضان مبارك':d.ramadan?'المتبقي لشهر رمضان المبارك: '+C.number(d.ramadan.days)+' يومًا':'عداد رمضان غير متاح',1793,34,green,'bold');text('بحسب التقويم الهجري · التوقعات قابلة للتغيّر',1840,25,muted);text('هدى · حبان · شبوة',1880,25,muted);
 const label=[C.weekday(d.day),greg,hijri,C.description(code),'العظمى '+unit(d.max,'°')+' والصغرى '+unit(d.min,'°'),'فرصة المطر '+unit(d.chance,'٪'),...d.stars.map(s=>s.name+' '+s.star)].join('، ');canvas.setAttribute('aria-label',label);document.getElementById('dailyCardAccessible').textContent=label;
 save.disabled=!d.fresh;status.textContent=d.fresh?'': 'بانتظار بيانات حديثة لحفظ البطاقة.';
}
window.addEventListener('hada:weather',e=>{latest=e.detail;draw();});window.addEventListener('hada:calendar-updated',draw);
setInterval(()=>{if(!document.hidden&&(renderedDay!==C.dayKey()||(latest&&!C.isFresh(latest))))draw();},10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
save.addEventListener('click',async()=>{if(!C.isFresh(latest)){draw();return;}save.disabled=true;status.textContent='جارٍ تجهيز الصورة…';try{await document.fonts.ready;draw();save.disabled=true;const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('png');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Hada-Weather-'+C.dayKey()+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='تم تنزيل البطاقة. تجدها في تنزيلات الجهاز.';}catch{status.textContent='لم يكتمل الحفظ؛ أعد المحاولة.';}finally{save.disabled=!C.isFresh(latest);}});draw();
})();
