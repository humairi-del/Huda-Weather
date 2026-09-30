(()=>{
'use strict';

const FIXED_STARS=[
  {season:'الربيع',stars:[['الجبهة','30 يناير 2026'],['الزبرة','12 فبراير 2026'],['الصرفة','25 فبراير 2026'],['العواء','10 مارس 2026'],['السماك','23 مارس 2026'],['الغفر','5 أبريل 2026'],['الزبان','18 أبريل 2026']]},
  {season:'الصيف',stars:[['لكليل','1 مايو 2026'],['القلب','14 مايو 2026'],['الشول','27 مايو 2026'],['النعيم','9 يونيو 2026'],['البلدة','22 يونيو 2026'],['القويدم','5 يوليو 2026'],['المرزم','18 يوليو 2026']]},
  {season:'الخريف',stars:[['سهيل','31 يوليو 2026'],['سعد','13 أغسطس 2026'],['ناهز','26 أغسطس 2026'],['عُرج','8 سبتمبر 2026'],['خامس','21 سبتمبر 2026'],['سادس','4 أكتوبر 2026'],['سابع','17 أكتوبر 2026']]},
  {season:'الشتاء',stars:[['ثريا','30 أكتوبر 2026'],['بركان','12 نوفمبر 2026'],['هقاع','25 نوفمبر 2026'],['هناع','8 ديسمبر 2026'],['ذراع','21 ديسمبر 2026'],['نثرة','3 يناير 2027'],['طرف','16 يناير 2027']]}
];

const MONTHS={'يناير':0,'فبراير':1,'مارس':2,'أبريل':3,'مايو':4,'يونيو':5,'يوليو':6,'أغسطس':7,'سبتمبر':8,'أكتوبر':9,'نوفمبر':10,'ديسمبر':11};

function parseDate(text){
  const m=String(text||'').trim().match(/(\d+)\s+([^\s]+)\s+(\d{4})/);
  if(!m||MONTHS[m[2]]===undefined)return null;
  return new Date(Number(m[3]),MONTHS[m[2]],Number(m[1]));
}

function todayAden(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p={};parts.forEach(x=>p[x.type]=x.value);
  return new Date(Number(p.year),Number(p.month)-1,Number(p.day));
}

function currentInfo(){
  const today=todayAden();
  for(const group of FIXED_STARS){
    for(const star of group.stars){
      const start=parseDate(star[1]);
      if(!start)continue;
      const end=new Date(start);end.setDate(end.getDate()+12);
      if(today>=start&&today<=end){
        const day=Math.floor((today-start)/86400000)+1;
        return {name:star[0],season:group.season,date:star[1],day,remaining:Math.max(0,13-day)};
      }
    }
  }
  return null;
}

function renderCurrent(){
  const box=document.getElementById('currentStarGrid');
  if(!box)return;
  const info=currentInfo();
  if(!info){
    box.innerHTML='<div class="current-star-item" style="grid-column:1/-1"><strong>التاريخ الحالي خارج نطاق جدول هدى 2026–2027.</strong></div>';
    return;
  }
  box.innerHTML=`
    <div class="current-star-item"><span>اسم النجم</span><strong>⭐ ${info.name}</strong></div>
    <div class="current-star-item"><span>الفصل</span><strong>${info.season}</strong></div>
    <div class="current-star-item"><span>تاريخ الدخول</span><strong>${info.date}</strong></div>
    <div class="current-star-item"><span>اليوم الحالي</span><strong>اليوم ${info.day} من النجم</strong></div>
    <div class="current-star-item"><span>الأيام المتبقية</span><strong>${info.remaining} يوم</strong></div>`;
}

function renderList(){
  const root=document.getElementById('starsList');
  if(!root)return;
  const icons={'الربيع':'🌱','الصيف':'☀️','الخريف':'🍂','الشتاء':'❄️'};
  root.innerHTML=FIXED_STARS.map(group=>`
    <section class="season">
      <div class="season-title">${icons[group.season]||'⭐'} ${group.season}</div>
      <div class="stars-grid">
        ${group.stars.map(star=>`<button class="star-item" data-star-name="${star[0]}" data-star-date="${star[1]}"><span class="star-name">${star[0]}</span><span class="star-date">${star[1]}</span></button>`).join('')}
      </div>
    </section>`).join('');
  root.querySelectorAll('.star-item').forEach(btn=>btn.addEventListener('click',()=>window.openStarDetail(btn.dataset.starName,btn.dataset.starDate)));
}

window.openStarDetail=function(name,date){
  const n=document.getElementById('starDetailName'),d=document.getElementById('starDetailDate'),m=document.getElementById('starDetailModal');
  if(n)n.textContent=name;if(d)d.textContent=date;if(m)m.style.display='block';
};

window.openStars=function(){
  renderList();renderCurrent();
  const m=document.getElementById('starsModal');if(m)m.style.display='block';
  document.body.style.overflow='hidden';
};

window.showHeaderStar=function(){
  const box=document.getElementById('headerStar');if(!box)return;
  const info=currentInfo();
  box.textContent=info?`⭐ النجم الزراعي: ${info.name} • اليوم ${info.day} من 13 • متبقي ${info.remaining} أيام`:'⭐ النجم الزراعي: خارج نطاق الجدول الحالي';
};

window.starsData=FIXED_STARS;
window.parseStarEntryDate=parseDate;
window.showHeaderStar();
})();
