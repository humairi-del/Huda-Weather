(()=>{'use strict';
const C=window.HadaWeatherCore,canvas=document.getElementById('dailyWeatherCanvas'),save=document.getElementById('saveDailyCard'),status=document.getElementById('dailyCardStatus');if(!canvas||!C||!save)return;
const ctx=canvas.getContext('2d');let latest=null,renderedDay='',midnightTimer=null;
const ink='#f5f6f7',gold='#e8c762',edge='#8c753a',muted='#a4b4bf',blue='#8cd3ec',background='#071b28';
function box(x,y,w,h,fill=background,r=34,stroke=edge,line=3){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}
function text(value,y,size=36,color=ink,weight='bold',x=540,align='center',width=900){ctx.fillStyle=color;ctx.direction='rtl';ctx.textAlign=align;do{ctx.font=weight+' '+size+'px Tajawal, Tahoma, Arial, sans-serif';if(ctx.measureText(value).width<=width||size<=20)break;size--;}while(true);ctx.fillText(value,x,y);}
function line(x1,y,x2,color='#3b3c32'){ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
function wrap(value,y,size=36,width=740,lineHeight=48){ctx.font='bold '+size+'px Tajawal, Tahoma, Arial, sans-serif';let row='';for(const word of value.split(/\s+/)){const next=row?row+' '+word:word;if(ctx.measureText(next).width>width&&row){text(row,y,size);y+=lineHeight;row=word;}else row=next;}if(row)text(row,y,size);}
const unit=(n,suffix)=>C.finite(n)?C.number(n,0)+suffix:'غير متاح';
function row(icon,label,value,y,color=ink,size=38){text(icon,y+4,43,ink,'normal',910);text(label,y,size,gold,'bold',858,'right',340);ctx.font='bold '+size+'px Tajawal, Tahoma, Arial, sans-serif';const offset=ctx.measureText(label).width;text(value,y,size,color,'bold',840-offset,'right',Math.max(240,675-offset));}
function draw(){
 const now=Date.now(),d=C.cardData(latest,window.HadaStarCalendar,now);renderedDay=d.day;canvas.width=1080;canvas.height=1920;
 const shade=ctx.createLinearGradient(0,0,1080,1920);shade.addColorStop(0,'#0b2331');shade.addColorStop(1,'#04131f');ctx.fillStyle=shade;ctx.fillRect(0,0,1080,1920);
 box(26,26,1028,1868,'#071b28',64,edge,6);box(52,52,976,1816,'#071b28',43,'#55513a',3);
 ctx.strokeStyle=gold;ctx.lineWidth=5;for(const [x,y,flipX,flipY] of [[66,66,1,1],[1014,66,-1,1],[66,1854,1,-1],[1014,1854,-1,-1]]){ctx.beginPath();ctx.moveTo(x,y+75*flipY);ctx.lineTo(x,y+22*flipY);ctx.quadraticCurveTo(x,y,x+22*flipX,y);ctx.lineTo(x+115*flipX,y);ctx.stroke();}
 text('تقويم',102,33,gold);text('طقس هدى',211,110);text('وما جاورها',278,58);
 text('الموقع الرسمي لـ طقس هدى',329,29,muted);ctx.direction='ltr';ctx.textAlign='center';ctx.fillStyle=blue;ctx.font='32px Tajawal, Arial, sans-serif';ctx.fillText('https://hada-weather.com',540,373);
 const time=new Date(now),greg=new Intl.DateTimeFormat('ar-YE-u-nu-arab',{timeZone:C.ZONE,day:'numeric',month:'long',year:'numeric'}).format(time),hijri=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab',{timeZone:C.ZONE,day:'numeric',month:'long',year:'numeric'}).format(time);
 box(118,402,844,130,'#040f20',65,'#49402a',2);text(C.weekday(d.day)+' · '+hijri,454,35,gold,'bold',540,'center',780);text(greg+' م',502,34,gold);
 box(118,568,844,512);text('حالة الطقس في هدى اليوم',625,42,gold,'bold',898,'right',675);text(C.weekday(d.day)+':',670,38,gold,'bold',898,'right');const code=d.code,emoji=code===null?'⛅':[95,96,99].includes(code)?'⛈️':[51,53,55,61,63,65,80,81,82].includes(code)?'🌦️':code===0?'☀️':'⛅';text(emoji,656,54,ink,'normal',197);line(154,702,925);
 row(emoji,'الجو:',C.description(code),756);
 text('🌡️',830,44,ink,'normal',910);text('العظمى:',823,35,gold,'bold',852,'right');text(unit(d.max,'°'),823,43,ink,'bold',646);text('|',823,35,muted,'normal',537);text('الصغرى:',823,35,gold,'bold',498,'right');text(unit(d.min,'°'),823,43,blue,'bold',247);
 row('💨','الرياح:',d.direction+' '+unit(d.windMean,' كم/س'),894,ink,34);
 row('💧','الرطوبة:',unit(d.humidityMean,'٪'),963,blue);
 row('🌧️','توقعات المطر اليوم:',unit(d.chance,'٪'),1034,blue,36);
 for(let i=0;i<2;i++){const x=i===0?555:118,s=d.stars[i],center=x+203.5;box(x,1115,407,299);text('حساب النجوم الزراعية',1160,29,gold,'bold',center,'center',360);const name=s?.name||'الجدول غير متاح',parts=name.split(' '),last=parts.pop();text('الراصد '+parts.join(' '),1197,28,muted,'normal',center,'center',356);text(last,1231,28,muted,'normal',center);text('نجم '+(s?.star||'غير متاح'),1291,45,gold,'bold',center,'center',350);line(x+30,1318,x+377);text('المنقضي: '+(s?C.number(s.elapsed):'—')+' أيام',1360,30,ink,'normal',center);text('المتبقي: '+(s?C.number(s.remaining):'—')+' أيام',1397,31,gold,'bold',center);}
 box(118,1452,844,337);text('❖ نفحات إيمانية ❖',1508,35,gold);wrap(d.reflection,1567,36,745,48);
 box(156,1649,768,104,'#040f20',31,'#333429',2);text('🌙',1721,48,gold,'normal',864);text(d.ramadan?.active?'رمضان مبارك':'متبقي على شهر رمضان المبارك',1691,32,blue,'bold',508,'center',600);text(d.ramadan?.active?'تقبّل الله طاعتكم':d.ramadan?C.number(d.ramadan.days)+' يومًا':'العداد غير متاح',1735,35,gold,'bold',508);
 text('الطقس: Open-Meteo · open-meteo.com · CC BY 4.0 · قيم مقربة',1830,21,muted);
 const label=[C.weekday(d.day),hijri,greg,C.description(code),'العظمى '+unit(d.max,'°')+' والصغرى '+unit(d.min,'°'),'الرياح '+d.direction+' '+unit(d.windMean,' كم/س'),'الرطوبة خلال اليوم '+unit(d.humidityMean,'٪'),'توقعات المطر اليوم '+unit(d.chance,'٪'),...d.stars.map(s=>s.name+' '+s.star)].join('، ');canvas.setAttribute('aria-label',label);document.getElementById('dailyCardAccessible').textContent=label;
 clearTimeout(midnightTimer);midnightTimer=setTimeout(()=>{draw();window.HadaLiveWeather?.refresh(true);},Math.max(20,C.stamp(d.day)+12*C.HOUR-now+20));
 save.disabled=!d.fresh;status.textContent=d.fresh?'':'بانتظار بيانات حديثة لحفظ البطاقة.';
}
window.addEventListener('hada:weather',e=>{latest=e.detail;draw();});window.addEventListener('hada:calendar-updated',draw);
setInterval(()=>{if(!document.hidden&&(renderedDay!==C.dayKey()||(latest&&!C.isFresh(latest))))draw();},10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
save.addEventListener('click',async()=>{if(!C.isFresh(latest)){draw();return;}save.disabled=true;status.textContent='جارٍ تجهيز الصورة…';try{await document.fonts.ready;draw();save.disabled=true;const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('png');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Hada-Weather-'+C.dayKey()+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='تم تنزيل البطاقة. تجدها في تنزيلات الجهاز.';}catch{status.textContent='لم يكتمل الحفظ؛ أعد المحاولة.';}finally{save.disabled=!C.isFresh(latest);}});draw();document.fonts.ready.then(draw);
})();
