from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
original=s

def rep(a,b,n=-1):
    global s
    assert a in s, f'missing: {a[:80]}'
    s=s.replace(a,b,n)

rep('🌧️ خريطة الطقس','🗺️ خريطة الطقس')
rep('🌀 بحر العرب والحالات المدارية','🌊 بحر العرب')
rep('🛰️ مقارنة الموديلات','🌦️ توقعات الموديلات')
rep('🌍 متابعة الزلازل','🌍 الزلازل')
rep('📡 الراصد — هدى وحبان','🌤️ الأجواء حاليًا')
rep('<span>🌧️ المطر الآن</span>','<span>🌧️ المطر</span>')
rep('<span>🌫️ الغبار PM10</span>','<span>🌫️ مؤشر PM10</span>')
s=s.replace('🌧️ هطول ملحوظ حاليًا حسب بيانات النموذج.','🕒 هطول متوقع في الساعة الحالية حسب بيانات التوقع، وليس رصدًا ميدانيًا.')
s=s.replace('☁️ فرصة المطر مرتفعة نسبيًا خلال الفترة الحالية.','🕒 فرصة مطر متوقعة مرتفعة نسبيًا خلال الفترة الحالية.')
s=s.replace('☁️ غطاء سحابي كثيف نسبيًا فوق المنطقة.','🕒 غطاء سحابي كثيف متوقع نسبيًا فوق المنطقة.')
s=s.replace('📡 لا تظهر حاليًا إشارة قوية لهطول مباشر على هدى.','🕒 لا تظهر في التوقع الحالي إشارة قوية لهطول على هدى.')
rep('<button class="whats-new-btn" onclick="openWhatsNew()">✨ ما الجديد</button>','<button class="whats-new-btn" onclick="openWhatsNew()">ℹ️ عن الموقع</button>')
start=s.index('<!-- ما الجديد -->')
end=s.index('<!-- حساب النجوم -->',start)
about='''<!-- عن الموقع -->
<div class="modal" id="whatsNewModal">
  <div class="modal-content">
    <div class="modal-header"><h2>ℹ️ عن الموقع</h2><button class="close" onclick="closeWhatsNew()">×</button></div>
    <div class="modal-pad">
      <div class="status-box"><strong>طقس هدى وما جاورها</strong><br>موقع محلي مبسط لخدمة هدى وحبان وما جاورهما في محافظة شبوة، ويجمع حالة الطقس والتوقعات وخرائط الطقس وبحر العرب وحساب النجوم ومواقيت الصلاة في مكان واحد.</div>
      <div class="small-note" style="font-size:13px;margin-top:12px">بيانات الطقس والتوقعات تعتمد على خدمات ونماذج جوية رقمية، وتُعرض بصورة مبسطة للمتابعة. القيم المتوقعة ليست رصدًا ميدانيًا مؤكدًا.</div>
      <div class="source-note" style="margin-top:14px">الإصدار 2.1.1</div>
    </div>
  </div>
</div>

'''
s=s[:start]+about+s[end:]
install='''  <button class="action-btn install-btn" id="installButton" onclick="installApp()">
    📱 تثبيت الموقع كتطبيق
  </button>'''
rep(install,install+'''\n  <div class="small-note" style="text-align:center;margin-top:-3px">📲 اضغط للتثبيت. إذا لم تظهر نافذة التثبيت، اختر من قائمة المتصفح «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».</div>''',1)
alerts='''<!-- تنبيهات الطقس داخل الموقع -->
<section class="card" id="weatherAlertsCard">
  <div class="card-title">🔔 تنبيهات الطقس</div>
  <div class="status-box" id="weatherAlerts">جاري فحص التوقعات القادمة...</div>
  <div class="small-note">🔴 «يحدث الآن» لا يُستخدم هنا إلا مع رصد فعلي مؤكد. تنبيهات هذا القسم مبنية على التوقعات وتظهر بصيغة 🕒 «متوقع». إشعارات الهاتف الخارجية غير مفعلة حاليًا.</div>
</section>

'''
rep('<!-- الساعات -->',alerts+'<!-- الساعات -->',1)
rep('    showObserverWeather(data);','    showObserverWeather(data);\n    showWeatherAlerts(data);',1)
alert_js=r'''/* تنبيهات الطقس داخل الموقع - توقعات فقط */
function showWeatherAlerts(data){
  const box=document.getElementById("weatherAlerts"); if(!box||!data?.hourly)return;
  const start=getCurrentHourIndex(data),end=Math.min(start+24,data.hourly.time.length),alerts=[];
  let maxRain=0,maxGust=0,minTemp=Infinity,maxTemp=-Infinity,minVis=Infinity,thunder=false,northWind=false;
  for(let i=start;i<end;i++){
    const rain=Number(data.hourly.precipitation_probability?.[i]??0),gust=Number(data.hourly.wind_gusts_10m?.[i]??0),temp=Number(data.hourly.temperature_2m?.[i]),vis=Number(data.hourly.visibility?.[i]),code=Number(data.hourly.weather_code?.[i]??0),dir=Number(data.hourly.wind_direction_10m?.[i]);
    maxRain=Math.max(maxRain,rain);maxGust=Math.max(maxGust,gust);if(Number.isFinite(temp)){minTemp=Math.min(minTemp,temp);maxTemp=Math.max(maxTemp,temp)}if(Number.isFinite(vis)&&vis>0)minVis=Math.min(minVis,vis);if(code>=95)thunder=true;if(gust>=35&&Number.isFinite(dir)&&(dir>=315||dir<=45))northWind=true;
  }
  if(maxRain>=40)alerts.push(`🕒 🌧️ مطر متوقع: أعلى احتمال خلال 24 ساعة ${Math.round(maxRain)}%`);
  if(maxGust>=40)alerts.push(`🕒 💨 رياح قوية متوقعة: هبات قد تصل إلى ${Math.round(maxGust)} كم/س${northWind?' • بينها رياح شمالية':''}`);
  if(Number.isFinite(minTemp)&&minTemp<=15)alerts.push(`🕒 🥶 برودة متوقعة: قد تنخفض الحرارة إلى ${Math.round(minTemp)}°`);
  if(thunder)alerts.push('🕒 ⛈️ عواصف رعدية أو برق متوقع خلال الساعات القادمة');
  if(Number.isFinite(maxTemp)&&maxTemp>=40)alerts.push(`🕒 🌡️ حرارة شديدة متوقعة: قد تصل إلى ${Math.round(maxTemp)}°`);
  if(Number.isFinite(minVis)&&minVis<=5000)alerts.push(`🕒 🌫️ تدنٍ في مدى الرؤية متوقع: قد يصل إلى ${(minVis/1000).toFixed(1)} كم`);
  box.innerHTML=alerts.length?alerts.map(x=>`<div style="margin:7px 0">${x}</div>`).join(''):'✅ لا تظهر خلال الساعات الـ24 القادمة تنبيهات جوية بارزة وفق التوقع الحالي.';
}

'''
rep('/* =========================================================\n   شبكة بحر العرب الموسعة',alert_js+'/* =========================================================\n   شبكة بحر العرب الموسعة',1)
s=s.replace('بيانات الطقس والراصد تتحدث تلقائيًا','بيانات الطقس تتحدث تلقائيًا • الإصدار 2.1.1')
for token in ['const PRAYER_TABLE=','const starsData=','seaPoints=[','embed.windy.com','MODEL_LIST','loadQuakes','loadSeaWaves','manifest.webmanifest','sw.js','خامس","21 سبتمبر 2026']:
    assert token in s, token
assert 'ℹ️ عن الموقع' in s and '🔔 تنبيهات الطقس' in s
assert s.count('<script')==s.count('</script>') and s.count('<style')==s.count('</style>')
assert s!=original
p.write_text(s,encoding='utf-8')
print('2.1.1 patch prepared')
