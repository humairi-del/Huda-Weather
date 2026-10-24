/* Approved original tables. Update this source only; do not extrapolate annual dates. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HadaStarCalendar=factory();})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const DAY=86400000,months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const thayNames=['الجبهة','الزبرة','الصرفة','العواء','السماك','الغفر','الزبان','لكليل','القلب','الشول','النعيم','البلدة','القويدم','المرزم','سهيل','سعد','ناهز','عُرج','خامس','سادس','سابع','ثريا','براكان','هقاع','هناع','ذراع','نثرة','طرف'];
const qusharNames=['الجبهة','الزبرة','الصرفة','عواء','السماك','القفر','زبان','لكليل','قلب','شول','النعيم','بلدة','قويدم','مرزم','سهيل','سعد','قترة (ناهز)','عرج','خامس','سادس','سابع','الثريا','براكان','هقاع','هناع','ذراع','نثرة','طرف'];
// Independent dates transcribed from each observer's original table. Do not align or shift them.
const thayDates=['2026-01-30','2026-02-12','2026-02-25','2026-03-10','2026-03-23','2026-04-05','2026-04-18','2026-05-01','2026-05-14','2026-05-27','2026-06-09','2026-06-22','2026-07-05','2026-07-18','2026-07-31','2026-08-13','2026-08-26','2026-09-08','2026-09-21','2026-10-04','2026-10-17','2026-10-30','2026-11-12','2026-11-25','2026-12-08','2026-12-21','2027-01-03','2027-01-16'];
const qusharDates=['2026-01-16','2026-01-29','2026-02-11','2026-02-24','2026-03-09','2026-03-22','2026-04-04','2026-04-17','2026-04-30','2026-05-13','2026-05-26','2026-06-08','2026-06-21','2026-07-04','2026-07-17','2026-07-30','2026-08-12','2026-08-25','2026-09-07','2026-09-20','2026-10-03','2026-10-16','2026-10-29','2026-11-11','2026-11-24','2026-12-07','2026-12-20','2027-01-02'];
const observers=[{id:'thay',name:'محمد شمروخ الطهيبي',names:thayNames,dates:thayDates},{id:'qushar',name:'حسن علي قشعر',names:qusharNames,dates:qusharDates}];
function rows(o){return o.names.map((name,i)=>{const start=Date.parse(o.dates[i]+'T00:00:00Z'),end=o.dates[i+1]?Date.parse(o.dates[i+1]+'T00:00:00Z'):start+13*DAY;return {name,start,end,season:['الربيع','الصيف','الخريف','الشتاء'][Math.floor(i/7)]};});}
function current(o,today){const table=rows(o),i=table.findIndex(x=>today>=x.start&&today<x.end);return i<0?null:{...table[i],elapsed:Math.floor((today-table[i].start)/DAY),remaining:Math.ceil((table[i].end-today)/DAY),next:table[i+1]||null};}
function date(t){const d=new Date(t),weekday=new Intl.DateTimeFormat('ar-YE',{weekday:'long',timeZone:'UTC'}).format(d);return `${weekday} ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;}
function today(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return Date.UTC(+p.year,+p.month-1,+p.day);}
return {observers,rows,current,date,today};

});
