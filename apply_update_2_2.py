from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new,label):
    global s
    c=s.count(old)
    if c!=1:
        raise SystemExit(f'{label}: expected 1 match, found {c}')
    s=s.replace(old,new,1)

# CSS: header star + clickable observer + dust/notification helpers
rep('.date{margin-top:8px;color:#d7e7f7;font-size:14px;line-height:1.8}',
    '.date{margin-top:8px;color:#d7e7f7;font-size:14px;line-height:1.8}\n.header-star{margin-top:5px;color:#e3bd61;font-size:13px;line-height:1.7}',
    'date css')
rep('.observer-item{background:#081725;border-radius:12px;padding:12px;text-align:center}',
    '.observer-item{background:#081725;border-radius:12px;padding:12px;text-align:center}\n.observer-item.clickable{cursor:pointer;border:1px solid transparent}\n.observer-item.clickable:active{border-color:#35c6d0}\n.dust-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:12px}\n.dust-item{background:#081725;border-radius:12px;padding:12px;line-height:1.7}\n.dust-item span{display:block;color:#91b8d4;font-size:12px;margin-bottom:5px}\n.dust-map{height:430px;margin-top:14px;border-radius:14px;overflow:hidden;border:1px solid #294760}\n.dust-map iframe{width:100%;height:100%;border:0}\n.notification-btn{background:#3d7d63}\n@media(max-width:420px){.dust-grid{grid-template-columns:1fr}.dust-map{height:390px}}',
    'observer css')

# OneSignal SDK in head
rep('<link rel="icon" href="icon.svg" type="image/svg+xml">\n</head>',
    '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>\n</head>',
    'onesignal sdk')

# Header agricultural star line
rep('    <div id="hijriDate"></div>\n  </div>',
    '    <div id="hijriDate"></div>\n    <div id="headerStar" class="header-star">⭐ جاري تحديد النجم الزراعي...</div>\n  </div>',
    'header star')

# Dust card replaces PM10
rep('    <div class="observer-item"><span>🌫️ مؤشر PM10</span><strong id="observerDust">--</strong></div>',
    '    <div class="observer-item clickable" onclick="openDust()"><span>🌫️ الغبار</span><strong id="observerDust">جاري التحديث...</strong><div class="small-note">اضغط للتفاصيل</div></div>',
    'dust card')

# Install + notifications section
rep('  <button class="action-btn install-btn" id="installButton" onclick="installApp()">\n    📱 تثبيت الموقع كتطبيق\n  </button>\n  <div class="small-note" style="text-align:center;margin-top:-3px">📲 اضغط للتثبيت. إذا لم تظهر نافذة التثبيت، اختر من قائمة المتصفح «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».</div>',
    '  <button class="action-btn install-btn" id="installButton" onclick="installApp()">\n    📱 تثبيت الموقع على الهاتف\n  </button>\n  <div class="small-note" style="text-align:center;margin-top:-3px">استخدم الموقع كتطبيق وفعّل تنبيهات الطقس 🔔</div>\n  <button class="action-btn notification-btn" id="notificationButton" onclick="openNotificationPrompt()">\n    🔔 تفعيل تنبيهات الطقس\n  </button>',
    'install block')

# Weather alerts: concise only
rep('  <div class="status-box" id="weatherAlerts">جاري فحص التوقعات القادمة...</div>\n  <div class="small-note">🔴 «يحدث الآن» لا يُستخدم هنا إلا مع رصد فعلي مؤكد. تنبيهات هذا القسم مبنية على التوقعات وتظهر بصيغة 🕒 «متوقع». إشعارات الهاتف الخارجية غير مفعلة حاليًا.</div>',
    '  <div class="status-box" id="weatherAlerts">جاري فحص التوقعات القادمة...</div>',
    'alerts note')

# Footer and About
rep('  بيانات الطقس تتحدث تلقائيًا • الإصدار 2.1.1',
    '  بيانات الطقس تُحدّث تلقائيًا • الإصدار 2.2.0',
    'footer version')
rep('<div class="status-box"><strong>طقس هدى وما جاورها</strong><br>موقع محلي مبسط لخدمة هدى وحبان وما جاورهما في محافظة شبوة، ويجمع حالة الطقس والتوقعات وخرائط الطقس وبحر العرب وحساب النجوم ومواقيت الصلاة في مكان واحد.</div>\n      <div class="small-note" style="font-size:13px;margin-top:12px">بيانات الطقس والتوقعات تعتمد على خدمات ونماذج جوية رقمية، وتُعرض بصورة مبسطة للمتابعة. القيم المتوقعة ليست رصدًا ميدانيًا مؤكدًا.</div>\n      <div class="source-note" style="margin-top:14px">الإصدار 2.1.1</div>',
    '<div class="status-box"><strong>طقس هدى وما جاورها</strong><br>موقع محلي لخدمة هدى وما جاورها في مديرية حبان بمحافظة شبوة، يجمع حالة الطقس والتوقعات وخرائط الطقس وبحر العرب وحساب النجوم ومواقيت الصلاة في مكان واحد.</div>\n      <div class="small-note" style="font-size:13px;margin-top:12px">تعتمد بيانات الطقس والتوقعات على مصادر ونماذج جوية رقمية، وتُعرض بصورة مبسطة للمتابعة. التوقعات الجوية قابلة للتغير، ولا تُعد رصدًا ميدانيًا مؤكدًا.</div>\n      <div class="source-note" style="margin-top:14px">الإصدار 2.2.0</div>',
    'about text')

# Add notification + dust modals before map modal
needle='<!-- خريطة هدى -->\n\n<div class="modal" id="mapModal">'
insert='''<!-- تفعيل التنبيهات -->\n<div class="modal" id="notificationModal">\n  <div class="modal-content">\n    <div class="modal-header"><h2>🔔 تنبيهات طقس هدى</h2><button class="close" onclick="closeNotificationPrompt()">×</button></div>\n    <div class="modal-pad">\n      <div class="status-box">فعّل التنبيهات ليصلك إشعار عند وجود تغيرات جوية مهمة يرسلها الموقع.</div>\n      <button class="action-btn notification-btn" style="margin-top:12px" onclick="enableWeatherNotifications()">تفعيل التنبيهات</button>\n      <button class="action-btn" style="margin-top:8px;background:#34475b" onclick="closeNotificationPrompt()">لاحقًا</button>\n      <div class="small-note">قد تظهر نافذة إذن إضافية من المتصفح أو الهاتف، ولغتها يحددها النظام.</div>\n    </div>\n  </div>\n</div>\n\n<!-- تفاصيل الغبار -->\n<div class="modal" id="dustModal">\n  <div class="modal-content">\n    <div class="modal-header"><h2>🌫️ الغبار الصحراوي – هدى</h2><button class="close" onclick="closeDust()">×</button></div>\n    <div class="modal-pad">\n      <div id="dustSummary" class="status-box">جاري تحميل بيانات الغبار...</div>\n      <div id="dustForecast" class="dust-grid"></div>\n      <div class="dust-map">\n        <iframe loading="lazy" src="https://embed.windy.com/embed2.html?lat=14.230586&lon=47.199415&detailLat=14.230586&detailLon=47.199415&width=650&height=450&zoom=6&level=surface&overlay=dust&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"></iframe>\n      </div>\n      <div class="small-note">المصدر: CAMS عبر Open‑Meteo. التصنيف «خفيف/متوسط/كثيف/شديد» تبسيط للغبار الصحراوي المتوقع، وليس رصدًا ميدانيًا مباشرًا.</div>\n    </div>\n  </div>\n</div>\n\n<!-- خريطة هدى -->\n\n<div class="modal" id="mapModal">'''
rep(needle,insert,'modals')

# Weather API cloud layers
rep('cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape,visibility',
    'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape,visibility',
    'cloud layers api')

# Weekly labels and storm potential field
rep('<span>⛈️ عدم الاستقرار</span>\n            <strong>${details.instability}</strong>',
    '<span>⛈️ قابلية العواصف</span>\n            <strong>${details.stormPotential}</strong>',
    'storm label')
rep('      instability:"--",', '      stormPotential:"--",', 'empty storm field')
old_inst='''  let instability="ضعيف";\n\n  if(cape>=1500)\n    instability="مرتفع";\n\n  else if(cape>=700)\n    instability="متوسط إلى مرتفع";\n\n  else if(cape>=300)\n    instability="متوسط";\n\n  const rainChance=\n    data.daily.precipitation_probability_max[dailyIndex] ?? 0;'''
new_inst='''  const rainChance=\n    data.daily.precipitation_probability_max[dailyIndex] ?? 0;\n\n  const thunderExpected=indexes.some(i=>Number(data.hourly.weather_code?.[i] ?? 0)>=95);\n  let stormPotential="منخفضة حاليًا";\n  if(thunderExpected) stormPotential="مرتفعة";\n  else if(cape>=1500 && rainChance>=60) stormPotential="متوسطة إلى مرتفعة";\n  else if(cape>=700 && rainChance>=30) stormPotential="متوسطة";\n  else if(cape>=300 && rainChance>=20) stormPotential="محدودة";'''
rep(old_inst,new_inst,'storm logic')
rep('    instability,\n    note', '    stormPotential,\n    note', 'storm return')

# Observer cloud display and dust loader (separate total/low cloud)
rep('''  const cloud=Number(data.hourly.cloud_cover[i] ?? 0);\n  const visibility=Number(data.hourly.visibility?.[i] ?? 0);''',
    '''  const cloud=Number(data.hourly.cloud_cover[i] ?? 0);\n  const cloudLow=Number(data.hourly.cloud_cover_low?.[i] ?? 0);\n  const cloudMid=Number(data.hourly.cloud_cover_mid?.[i] ?? 0);\n  const cloudHigh=Number(data.hourly.cloud_cover_high?.[i] ?? 0);\n  const visibility=Number(data.hourly.visibility?.[i] ?? 0);''',
    'cloud vars')
rep('''  document.getElementById("observerCloud").textContent=\n    `${Math.round(cloud)}%`;''',
    '''  document.getElementById("observerCloud").textContent=\n    `منخفضة ${Math.round(cloudLow)}% • إجمالي ${Math.round(cloud)}%`;\n  document.getElementById("observerCloud").title=\n    `منخفضة ${Math.round(cloudLow)}% • متوسطة ${Math.round(cloudMid)}% • عالية ${Math.round(cloudHigh)}% • إجمالي ${Math.round(cloud)}%`;''',
    'cloud display')

# Replace dust function with CAMS dust forecast + modal + directional warning
start=s.index('async function loadDust(){')
end=s.index('\n\n/* تنبيهات الطقس داخل الموقع - توقعات فقط */',start)
old=s[start:end]
new='''let dustDataCache=null;\nlet dustWeatherAlert="";\n\nfunction dustLevel(value){\n  const v=Number(value||0);\n  if(v<15) return {label:"لا يوجد غبار مؤثر",rank:0};\n  if(v<40) return {label:"خفيف",rank:1};\n  if(v<80) return {label:"متوسط",rank:2};\n  if(v<150) return {label:"كثيف",rank:3};\n  return {label:"شديد",rank:4};\n}\n\nasync function loadDust(){\n  try{\n    const url=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=dust&hourly=dust&forecast_days=3&timezone=Asia%2FAden`;\n    const response=await fetch(url);\n    if(!response.ok) throw new Error("Dust API error");\n    const data=await response.json();\n    dustDataCache=data;\n    const current=Number(data.current?.dust ?? 0);\n    const level=dustLevel(current);\n    document.getElementById("observerDust").textContent=level.label;\n\n    const times=data.hourly?.time||[], values=data.hourly?.dust||[];\n    const nowIndex=Math.max(0,times.findIndex(t=>t>=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Aden",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"}).format(new Date()).replace(', ','T')+':00'));\n    let peak=-1,peakIndex=-1;\n    for(let i=Math.max(0,nowIndex);i<Math.min(values.length,Math.max(0,nowIndex)+36);i++){\n      const v=Number(values[i]); if(Number.isFinite(v)&&v>peak){peak=v;peakIndex=i;}\n    }\n    const peakLevel=dustLevel(peak);\n    dustWeatherAlert="";\n    if(peakIndex>=0 && peakLevel.rank>=2 && peak>current+15){\n      const hours=Math.max(1,peakIndex-Math.max(0,nowIndex));\n      let dirText="";\n      if(weatherData?.hourly?.time && times[peakIndex]){\n        const wi=weatherData.hourly.time.indexOf(times[peakIndex]);\n        if(wi>=0){const dir=Number(weatherData.hourly.wind_direction_10m?.[wi]);if(Number.isFinite(dir))dirText=` مع رياح ${windDirection(dir)}`;}\n      }\n      dustWeatherAlert=`🕒 🌫️ متوقع ارتفاع الغبار إلى ${peakLevel.label} خلال نحو ${hours} ساعة${dirText}.`;\n    }else if(level.rank>=3){\n      dustWeatherAlert=`🌫️ تشير بيانات CAMS الحالية إلى غبار ${level.label} فوق المنطقة.`;\n    }\n    renderWeatherAlerts();\n    renderDustDetails();\n  }catch(error){\n    console.error(error);\n    document.getElementById("observerDust").textContent="تعذر التحديث";\n  }\n}\n\nfunction renderDustDetails(){\n  if(!dustDataCache) return;\n  const current=Number(dustDataCache.current?.dust ?? 0),level=dustLevel(current);\n  const summary=document.getElementById("dustSummary"),grid=document.getElementById("dustForecast");\n  if(summary) summary.innerHTML=`الحالة النموذجية الحالية: <strong>${level.label}</strong> • ${Math.round(current)} µg/m³${dustWeatherAlert?`<br>${dustWeatherAlert}`:""}`;\n  if(!grid) return;\n  const times=dustDataCache.hourly?.time||[],values=dustDataCache.hourly?.dust||[];\n  const now=Date.now();\n  const rows=[];\n  for(let i=0;i<times.length && rows.length<8;i+=3){\n    const d=new Date(times[i]); if(d.getTime()<now-3600000) continue;\n    const v=Number(values[i]??0),l=dustLevel(v);\n    const time=d.toLocaleString("ar-YE",{timeZone:"Asia/Aden",weekday:"short",hour:"numeric",minute:"2-digit",hour12:true});\n    rows.push(`<div class="dust-item"><span>${time}</span><strong>${l.label}</strong><br>${Math.round(v)} µg/m³</div>`);\n  }\n  grid.innerHTML=rows.join("");\n}\n\nfunction openDust(){document.getElementById("dustModal").style.display="block";document.body.style.overflow="hidden";renderDustDetails();}\nfunction closeDust(){document.getElementById("dustModal").style.display="none";document.body.style.overflow="";}'''
s=s[:start]+new+s[end:]

# Alerts: remove visibility clutter, support dust alert, concise natural state
start=s.index('function showWeatherAlerts(data){')
end=s.index('\n}\n\n/* =========================================================\n   شبكة بحر العرب الموسعة',start)+2
old=s[start:end]
new='''let baseWeatherAlerts=[];\nfunction renderWeatherAlerts(){\n  const box=document.getElementById("weatherAlerts"); if(!box) return;\n  const all=[...baseWeatherAlerts]; if(dustWeatherAlert) all.push(dustWeatherAlert);\n  box.innerHTML=all.length?all.map(x=>`<div style="margin:7px 0">${x}</div>`).join(''):'✅ لا توجد تنبيهات جوية بارزة خلال الـ24 ساعة القادمة.';\n}\nfunction showWeatherAlerts(data){\n  const start=getCurrentHourIndex(data),end=Math.min(start+24,data.hourly.time.length),alerts=[];\n  let maxRain=0,maxGust=0,minTemp=Infinity,maxTemp=-Infinity,thunder=false,northWind=false;\n  for(let i=start;i<end;i++){\n    const rain=Number(data.hourly.precipitation_probability?.[i]??0),gust=Number(data.hourly.wind_gusts_10m?.[i]??0),temp=Number(data.hourly.temperature_2m?.[i]),code=Number(data.hourly.weather_code?.[i]??0),dir=Number(data.hourly.wind_direction_10m?.[i]);\n    maxRain=Math.max(maxRain,rain);maxGust=Math.max(maxGust,gust);if(Number.isFinite(temp)){minTemp=Math.min(minTemp,temp);maxTemp=Math.max(maxTemp,temp)}if(code>=95)thunder=true;if(gust>=35&&Number.isFinite(dir)&&(dir>=315||dir<=45))northWind=true;\n  }\n  if(maxRain>=40)alerts.push(`🕒 🌧️ مطر متوقع: أعلى احتمال خلال 24 ساعة ${Math.round(maxRain)}%`);\n  if(maxGust>=40)alerts.push(`🕒 💨 رياح قوية متوقعة: هبات قد تصل إلى ${Math.round(maxGust)} كم/س${northWind?' • بينها رياح شمالية':''}`);\n  if(Number.isFinite(minTemp)&&minTemp<=15)alerts.push(`🕒 🥶 برودة متوقعة: قد تنخفض الحرارة إلى ${Math.round(minTemp)}°`);\n  if(thunder)alerts.push('🕒 ⛈️ عواصف رعدية أو برق متوقع خلال الساعات القادمة');\n  if(Number.isFinite(maxTemp)&&maxTemp>=40)alerts.push(`🕒 🌡️ حرارة شديدة متوقعة: قد تصل إلى ${Math.round(maxTemp)}°`);\n  baseWeatherAlerts=alerts; renderWeatherAlerts();\n}'''
s=s[:start]+new+s[end:]

# Star header helper added after showCurrentStar
marker='''function renderStars(){\n  const root=document.getElementById("starsList");'''
helper='''function showHeaderStar(){\n  const box=document.getElementById("headerStar"); if(!box) return;\n  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Aden",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());\n  const p={};parts.forEach(x=>p[x.type]=x.value);\n  const today=new Date(Number(p.year),Number(p.month)-1,Number(p.day));\n  let current=null;\n  for(const group of starsData){for(const star of group.stars){const start=parseStarEntryDate(star[1]);if(!start)continue;const end=new Date(start);end.setDate(end.getDate()+12);if(today>=start&&today<=end){current={name:star[0],start};break;}}if(current)break;}\n  if(!current){box.textContent="⭐ النجم الزراعي: خارج نطاق الجدول الحالي";return;}\n  const currentDay=Math.floor((today-current.start)/86400000)+1;\n  const remaining=Math.max(0,13-currentDay);\n  box.textContent=`⭐ النجم الزراعي: ${current.name} • اليوم ${currentDay} من 13 • متبقي ${remaining} أيام`;\n}\n\nfunction renderStars(){\n  const root=document.getElementById("starsList");'''
rep(marker,helper,'header star helper')

# Models: fix 0% date bug, align values to best day, Arabic date
old='''      let bi=0,bp=-1; probs.forEach((v,i)=>{if(Number(v)>bp){bp=Number(v);bi=i}});\n      const rain=Number(sums[bi]||0); const day=daily.time?.[bi]||'--';\n      rainSignals.push(bp);\n      cards.push(`<div class="model-item"><span>${label}</span><strong>أفضل فرصة: ${Math.max(0,Math.round(bp))}%</strong><br>المطر: ${rain.toFixed(1)} ملم<br>اليوم: ${day}<br>الحرارة: ${Math.round(Number(maxs[0]||0))}° / ${Math.round(Number(mins[0]||0))}°<br>الرياح: ${Math.round(Number(winds[0]||0))} كم/س</div>`);'''
new='''      let bi=0,bp=-1; probs.forEach((v,i)=>{if(Number(v)>bp){bp=Number(v);bi=i}});\n      rainSignals.push(bp);\n      if(!Number.isFinite(bp) || bp<=0){\n        cards.push(`<div class="model-item"><span>${label}</span><strong>لا توجد فرصة مطر معتبرة خلال فترة التوقع.</strong><br>الحرارة اليوم: ${Math.round(Number(maxs[0]||0))}° / ${Math.round(Number(mins[0]||0))}°<br>الرياح اليوم: ${Math.round(Number(winds[0]||0))} كم/س</div>`);\n      }else{\n        const rain=Number(sums[bi]||0); const rawDay=daily.time?.[bi]||'--';\n        const day=rawDay==='--'?'--':new Date(rawDay+'T12:00:00').toLocaleDateString('ar-YE',{weekday:'long',day:'numeric',month:'long'});\n        cards.push(`<div class="model-item"><span>${label}</span><strong>أفضل فرصة: ${Math.round(bp)}%</strong><br>المطر: ${rain.toFixed(1)} ملم<br>اليوم: ${day}<br>الحرارة: ${Math.round(Number(maxs[bi]||0))}° / ${Math.round(Number(mins[bi]||0))}°<br>الرياح: ${Math.round(Number(winds[bi]||0))} كم/س</div>`);\n      }'''
rep(old,new,'models logic')

# Arabic quake place helper + use it
needle='''/* الزلازل: أحدث 30 يومًا ضمن 1500 كم من هدى */\nasync function loadQuakes(){'''
helper='''/* الزلازل: أحدث 30 يومًا ضمن 1500 كم من هدى */\nfunction quakePlaceArabic(lat,lon,raw){\n  const text=String(raw||"");\n  if(/Socotra/i.test(text) || (/Yemen/i.test(text)&&lon>=52&&lon<=55.8&&lat>=11&&lat<=14.5)) return "منطقة سقطرى";\n  if(/Somalia/i.test(text)&&lat>=10&&lat<=14.5&&lon>=43&&lon<=52.8) return "خليج عدن – قبالة سواحل الصومال";\n  if(/Gulf of Aden/i.test(text)||(lat>=10&&lat<=15.5&&lon>=43&&lon<=52.8)) return "خليج عدن";\n  if(/Arabian Sea/i.test(text)||(lat>=5&&lat<=24&&lon>52.8&&lon<=72)) return "بحر العرب";\n  if(/Yemen/i.test(text)) return "اليمن";\n  if(/Somalia/i.test(text)) return "الصومال";\n  if(/Oman/i.test(text)) return "عُمان";\n  return "ضمن النطاق الإقليمي حول هدى";\n}\nasync function loadQuakes(){'''
rep(needle,helper,'quake helper')
old='''grid.innerHTML=f.map(q=>{const c=q.geometry?.coordinates||[];const dist=haversine(latitude,longitude,c[1],c[0]);const dt=new Date(q.properties.time).toLocaleString('ar-YE',{timeZone:'Asia/Aden',day:'numeric',month:'numeric',hour:'numeric',minute:'2-digit',hour12:true});return `<div class="quake-item"><span>${dt}</span><strong>قوة ${Number(q.properties.mag).toFixed(1)}</strong><br>${q.properties.place||'--'}<br>يبعد نحو ${Math.round(dist)} كم • العمق ${Math.round(Number(c[2]||0))} كم</div>`}).join('');'''
new='''grid.innerHTML=f.map(q=>{const c=q.geometry?.coordinates||[];const dist=haversine(latitude,longitude,c[1],c[0]);const dt=new Date(q.properties.time).toLocaleString('ar-YE',{timeZone:'Asia/Aden',day:'numeric',month:'numeric',hour:'numeric',minute:'2-digit',hour12:true});const place=quakePlaceArabic(Number(c[1]),Number(c[0]),q.properties.place);return `<div class="quake-item"><span>${dt}</span><strong>قوة ${Number(q.properties.mag).toFixed(1)}</strong><br>${place}<br>يبعد نحو ${Math.round(dist)} كم • العمق ${Math.round(Number(c[2]||0))} كم</div>`}).join('');'''
rep(old,new,'quake render')

# OneSignal setup + Arabic pre-prompt, preserving separate PWA install
needle='''/* تثبيت الموقع كتطبيق */\nwindow.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e});'''
insert='''/* تنبيهات OneSignal */\nlet oneSignalReady=false;\nwindow.OneSignalDeferred=window.OneSignalDeferred||[];\nOneSignalDeferred.push(async function(OneSignal){\n  try{\n    await OneSignal.init({appId:"4b60cca8-16ec-432d-88ae-e0bbc22d6558",serviceWorkerPath:"sw.js",notifyButton:{enable:false}});\n    oneSignalReady=true; updateNotificationButton();\n    OneSignal.Notifications.addEventListener("permissionChange",updateNotificationButton);\n  }catch(e){console.error("OneSignal",e);}\n});\nfunction updateNotificationButton(){\n  const b=document.getElementById("notificationButton"); if(!b)return;\n  OneSignalDeferred.push(function(OneSignal){\n    const granted=OneSignal.Notifications.permission===true;\n    b.textContent=granted?"✅ التنبيهات مفعلة":"🔔 تفعيل تنبيهات الطقس";\n  });\n}\nfunction openNotificationPrompt(){\n  if(document.getElementById("notificationButton")?.textContent.includes("مفعلة"))return;\n  document.getElementById("notificationModal").style.display="block";document.body.style.overflow="hidden";\n}\nfunction closeNotificationPrompt(){document.getElementById("notificationModal").style.display="none";document.body.style.overflow="";}\nfunction enableWeatherNotifications(){\n  OneSignalDeferred.push(async function(OneSignal){\n    try{await OneSignal.Notifications.requestPermission();updateNotificationButton();closeNotificationPrompt();}\n    catch(e){console.error(e);alert("تعذر تفعيل التنبيهات حاليًا. تحقق من سماح الإشعارات في المتصفح.");}\n  });\n}\n\n/* تثبيت الموقع كتطبيق */\nwindow.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e});'''
rep(needle,insert,'onesignal js')

# Close added modals on background click
rep('''    const quakes=document.getElementById("quakesModal");\n    const whatsNew=document.getElementById("whatsNewModal");''',
    '''    const quakes=document.getElementById("quakesModal");\n    const whatsNew=document.getElementById("whatsNewModal");\n    const dust=document.getElementById("dustModal");\n    const notification=document.getElementById("notificationModal");''',
    'modal vars')
rep('''    if(event.target===quakes) closeQuakes();\n    if(event.target===whatsNew) closeWhatsNew();''',
    '''    if(event.target===quakes) closeQuakes();\n    if(event.target===whatsNew) closeWhatsNew();\n    if(event.target===dust) closeDust();\n    if(event.target===notification) closeNotificationPrompt();''',
    'modal closes')

# Startup star line
rep('''loadDate();\nloadWeather();\nloadPrayers();''',
    '''loadDate();\nloadWeather();\nloadPrayers();\nshowHeaderStar();''',
    'startup')

p.write_text(s,encoding='utf-8')

# Integrate OneSignal into the existing service worker to avoid competing root-scope workers.
sw=Path('sw.js')
ws=sw.read_text(encoding='utf-8')
if 'OneSignalSDK.sw.js' not in ws:
    ws='importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");\n'+ws
ws=ws.replace('const CACHE="hada-weather-v2-final";','const CACHE="hada-weather-v2-2-0";')
sw.write_text(ws,encoding='utf-8')

print('update prepared')
