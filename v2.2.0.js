/* طقس هدى وما جاورها — تحسينات الإصدار 2.2.0
   هذا الملف يضيف التحسينات المعتمدة دون تغيير جدول النجوم أو مواقيت الصلاة أو أقسام بحر العرب القائمة.
*/

(function(){
  const APP_VERSION="2.2.0";
  const ONE_SIGNAL_APP_ID="4b60cca8-16ec-432d-88ae-e0bbc22d6558";
  let dustAlertMessage="";
  let oneSignalReady=false;

  function injectStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .star-inline{margin-top:3px;color:#e3bd61;font-size:13px;line-height:1.8;font-weight:bold}
      .observer-item.clickable{cursor:pointer;position:relative}
      .observer-item.clickable::after{content:'اضغط للتفاصيل';display:block;margin-top:5px;color:#6fa7b5;font-size:10px;font-weight:normal}
      .notification-btn{background:#317463!important}
      .dust-timeline{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
      .dust-hour{background:#091d26;border-radius:10px;padding:9px;text-align:center;line-height:1.6}
      .dust-hour span{display:block;color:#91b8d4;font-size:11px}
      .dust-note{color:#9fc3df;font-size:12px;line-height:1.8;margin-top:10px}
      @media(max-width:420px){.dust-timeline{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function updateStaticUi(){
    const install=document.getElementById('installButton');
    if(install) install.textContent='📱 تثبيت الموقع على الهاتف';
    const buttons=install?.parentElement;
    if(buttons){
      let note=buttons.querySelector('.small-note');
      if(note) note.textContent='استخدم الموقع كتطبيق وفعّل تنبيهات الطقس 🔔';
      if(!document.getElementById('notificationButton')){
        const btn=document.createElement('button');
        btn.id='notificationButton';
        btn.className='action-btn notification-btn';
        btn.textContent='🔔 تفعيل تنبيهات الطقس';
        btn.onclick=promptNotifications;
        install.insertAdjacentElement('afterend',btn);
      }
    }

    const alertsCard=document.getElementById('weatherAlertsCard');
    if(alertsCard){
      alertsCard.querySelectorAll('.small-note').forEach(x=>x.remove());
    }

    const about=document.querySelector('#whatsNewModal .modal-pad');
    if(about){
      const status=about.querySelector('.status-box');
      if(status) status.innerHTML='<strong>طقس هدى وما جاورها</strong><br>موقع محلي لخدمة هدى وما جاورها في مديرية حبان بمحافظة شبوة، يجمع حالة الطقس والتوقعات وخرائط الطقس وبحر العرب وحساب النجوم ومواقيت الصلاة في مكان واحد.';
      const note=about.querySelector('.small-note');
      if(note) note.textContent='تعتمد بيانات الطقس والتوقعات على مصادر ونماذج جوية رقمية، وتُعرض بصورة مبسطة للمتابعة. التوقعات الجوية قابلة للتغير، ولا تُعد رصدًا ميدانيًا مؤكدًا.';
      const src=about.querySelector('.source-note');
      if(src) src.textContent='الإصدار '+APP_VERSION;
    }
    const footer=document.querySelector('footer');
    if(footer) footer.textContent='بيانات الطقس تُحدّث تلقائيًا • الإصدار '+APP_VERSION;

    const dustLabel=document.querySelector('#observerDust')?.previousElementSibling;
    if(dustLabel) dustLabel.textContent='🌫️ الغبار الصحراوي';
    const dustItem=document.getElementById('observerDust')?.closest('.observer-item');
    if(dustItem){dustItem.classList.add('clickable');dustItem.onclick=openDustDetails;}

    const cloudLabel=document.querySelector('#observerCloud')?.previousElementSibling;
    if(cloudLabel){
      cloudLabel.textContent='☁️ السحب القريبة';
      cloudLabel.title='السحب المنخفضة والمتوسطة الأقرب لما يظهر بصريًا من سطح الأرض';
    }
  }

  function createDustModal(){
    if(document.getElementById('dustModal')) return;
    const modal=document.createElement('div');
    modal.className='modal'; modal.id='dustModal';
    modal.innerHTML=`<div class="modal-content">
      <div class="modal-header"><h2>🌫️ الغبار الصحراوي – هدى</h2><button class="close" onclick="closeDustDetails()">×</button></div>
      <div class="modal-pad">
        <div class="status-box" id="dustSummary">جاري تحميل بيانات الغبار...</div>
        <div id="dustTimeline" class="dust-timeline"></div>
        <div class="dust-note">المصدر: توقعات الغبار الصحراوي من CAMS عبر Open‑Meteo. التصنيف هنا مبسط لشرح كثافة الغبار، وليس مؤشرًا طبيًا لجودة الهواء.</div>
        <div class="map-wrap" style="height:55vh;min-height:360px;margin-top:12px;border-radius:14px;overflow:hidden">
          <iframe loading="lazy" src="https://embed.windy.com/embed2.html?lat=14.230586&lon=47.199415&detailLat=14.230586&detailLon=47.199415&width=650&height=450&zoom=6&level=surface&overlay=dustmass&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=true&metricWind=km%2Fh&metricTemp=%C2%B0C"></iframe>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal) closeDustDetails();});
  }

  window.openDustDetails=function(){
    createDustModal();
    document.getElementById('dustModal').style.display='block';
    document.body.style.overflow='hidden';
    loadDust(true);
  };
  window.closeDustDetails=function(){
    const m=document.getElementById('dustModal'); if(m)m.style.display='none';
    document.body.style.overflow='';
  };

  function dustLabel(value){
    if(!Number.isFinite(value) || value<10) return 'لا يوجد غبار واضح';
    if(value<50) return 'خفيف';
    if(value<100) return 'متوسط';
    if(value<200) return 'كثيف';
    return 'شديد';
  }

  function dirFromOffset(dLat,dLon){
    const ns=dLat>0?'الشمال':dLat<0?'الجنوب':'';
    const ew=dLon>0?'الشرق':dLon<0?'الغرب':'';
    if(ns&&ew) return `جهة ${ns} ${ew}`;
    if(ns) return `جهة ${ns}`;
    if(ew) return `جهة ${ew}`;
    return 'المناطق المحيطة';
  }

  async function fetchDustPoint(lat,lon){
    const u=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=dust&current=dust&timezone=Asia%2FAden&forecast_days=2`;
    const r=await fetch(u); if(!r.ok) throw new Error('dust'); return r.json();
  }

  window.loadDust=async function(showDetails=false){
    const card=document.getElementById('observerDust');
    try{
      const center=await fetchDustPoint(latitude,longitude);
      const times=center.hourly?.time||[];
      const vals=center.hourly?.dust||[];
      const nowIndex=Math.max(0,times.findIndex(t=>t>=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit'}).format(new Date()).replace(' ','T').slice(0,13)+':00'));
      const current=Number(center.current?.dust ?? vals[nowIndex] ?? 0);
      const end=Math.min(vals.length,nowIndex+19);
      let maxFuture=current,maxIndex=nowIndex;
      for(let i=nowIndex;i<end;i++){const v=Number(vals[i]);if(Number.isFinite(v)&&v>maxFuture){maxFuture=v;maxIndex=i;}}
      if(card) card.textContent=`${dustLabel(current)}${Number.isFinite(current)?` • ${Math.round(current)} µg/m³`:''}`;

      dustAlertMessage='';
      let directionText='';
      if(maxFuture>=50 && maxFuture>=current+20){
        const offsets=[[1.2,0],[-1.2,0],[0,1.2],[0,-1.2],[.9,.9],[.9,-.9],[-.9,.9],[-.9,-.9]];
        const surrounding=await Promise.all(offsets.map(async o=>({o,data:await fetchDustPoint(latitude+o[0],longitude+o[1])})));
        let best=null;
        for(const s of surrounding){
          const arr=s.data.hourly?.dust||[];
          const t=s.data.hourly?.time||[];
          const target=times[maxIndex];
          const idx=t.indexOf(target);
          const v=Number(arr[idx]);
          if(Number.isFinite(v)&&(!best||v>best.v)) best={v,o:s.o};
        }
        if(best) directionText=dirFromOffset(best.o[0],best.o[1]);
        const when=times[maxIndex]?new Date(times[maxIndex]).toLocaleTimeString('ar-YE',{hour:'numeric',minute:'2-digit',hour12:true}):'الساعات القادمة';
        dustAlertMessage=`🕒 🌫️ متوقع ارتفاع الغبار خلال الساعات القادمة${directionText?`، وأعلى كتلة متوقعة من ${directionText}`:''} • الذروة قرابة ${when}`;
      }
      if(weatherData) showWeatherAlerts(weatherData);

      if(showDetails){
        const s=document.getElementById('dustSummary');
        if(s) s.textContent=dustAlertMessage || `✅ حالة الغبار الحالية: ${dustLabel(current)}. لا تظهر إشارة واضحة على موجة غبار قوية قادمة خلال الساعات القريبة.`;
        const tl=document.getElementById('dustTimeline');
        if(tl){
          const picks=[]; for(let i=nowIndex;i<Math.min(vals.length,nowIndex+18);i+=3) picks.push(i);
          tl.innerHTML=picks.map(i=>{const d=new Date(times[i]);const tm=d.toLocaleTimeString('ar-YE',{hour:'numeric',hour12:true});const v=Number(vals[i]||0);return `<div class="dust-hour"><span>${tm}</span><strong>${dustLabel(v)}</strong><br>${Math.round(v)} µg/m³</div>`}).join('');
        }
      }
    }catch(e){
      console.error(e); if(card) card.textContent='تعذر التحديث';
      const s=document.getElementById('dustSummary'); if(s)s.textContent='تعذر تحميل بيانات الغبار حاليًا.';
    }
  };

  function effectiveCloud(data,i){
    const low=Number(data.hourly.cloud_cover_low?.[i]);
    const mid=Number(data.hourly.cloud_cover_mid?.[i]);
    if(Number.isFinite(low)||Number.isFinite(mid)) return Math.max(Number.isFinite(low)?low:0,Number.isFinite(mid)?mid:0);
    return Number(data.hourly.cloud_cover?.[i]??0);
  }

  window.showObserverWeather=function(data){
    const i=getCurrentHourIndex(data);
    const rain=Number(data.hourly.precipitation[i]??0),chance=Number(data.hourly.precipitation_probability[i]??0),cloud=effectiveCloud(data,i),visibility=Number(data.hourly.visibility?.[i]??0);
    document.getElementById('observerRain').textContent=`${rain.toFixed(1)} ملم • ${Math.round(chance)}%`;
    document.getElementById('observerCloud').textContent=`${Math.round(cloud)}%`;
    document.getElementById('observerVisibility').textContent=visibility>0?`${(visibility/1000).toFixed(1)} كم`:'--';
    const gust=Number(data.hourly.wind_gusts_10m?.[i]??0); document.getElementById('observerGust').textContent=`${Math.round(gust)} كم/س`;
    const mins=(data.daily.temperature_2m_min||[]).filter(Number.isFinite); const min7=mins.length?Math.min(...mins):NaN;
    let winter='معتدل'; if(Number.isFinite(min7)&&min7<=8)winter=`برد قوي • أدنى ${Math.round(min7)}°`;else if(Number.isFinite(min7)&&min7<=13)winter=`بارد • أدنى ${Math.round(min7)}°`;else if(Number.isFinite(min7)&&min7<=18)winter=`مائل للبرودة • أدنى ${Math.round(min7)}°`;else if(Number.isFinite(min7))winter=`لا برد قوي • أدنى ${Math.round(min7)}°`;
    document.getElementById('observerWinter').textContent=winter;
    let summary=''; if(rain>=1)summary='🕒 هطول متوقع في الساعة الحالية حسب بيانات التوقع، وليس رصدًا ميدانيًا.';else if(chance>=50)summary='🕒 فرصة مطر متوقعة مرتفعة نسبيًا خلال الفترة الحالية.';else if(cloud>=75)summary='🕒 سحب منخفضة أو متوسطة كثيفة نسبيًا متوقعة فوق المنطقة.';else summary='🕒 لا تظهر في التوقع الحالي إشارة قوية لهطول على هدى.';
    document.getElementById('observerSummary').textContent=summary;
    document.getElementById('observerUpdated').textContent='آخر تحديث: '+new Date().toLocaleTimeString('ar-YE',{timeZone:'Asia/Aden',hour:'numeric',minute:'2-digit',hour12:true});
    loadDust(false);
  };

  window.getDayDetails=function(data,dateString,dailyIndex){
    const indexes=[]; for(let i=0;i<data.hourly.time.length;i++)if(data.hourly.time[i].startsWith(dateString))indexes.push(i);
    if(!indexes.length)return{amount:'0.0',hours:'0',bestHour:'--',humidity:0,cloud:0,wind:0,cape:0,instability:'--',note:'لا توجد بيانات تفصيلية.'};
    const humidity=maxFromIndexes(data.hourly.relative_humidity_2m,indexes),cloud=maxFromIndexes(data.hourly.cloud_cover,indexes),wind=maxFromIndexes(data.hourly.wind_speed_10m,indexes),cape=maxFromIndexes(data.hourly.cape,indexes);
    const amount=Number(data.daily.precipitation_sum[dailyIndex]??0).toFixed(1),hours=Number(data.daily.precipitation_hours[dailyIndex]??0).toFixed(0),bestHour=getBestHourForDay(data,dateString)||'--';
    const rainChance=Number(data.daily.precipitation_probability_max[dailyIndex]??0);
    let maxHourlyRain=0,thunder=false; for(const i of indexes){maxHourlyRain=Math.max(maxHourlyRain,Number(data.hourly.precipitation?.[i]??0));const code=Number(data.hourly.weather_code?.[i]??0);if(code>=95)thunder=true;}
    let storm='منخفضة حاليًا';
    if(thunder || (cape>=1500 && rainChance>=50 && maxHourlyRain>=1)) storm='مرتفعة';
    else if((cape>=700 && rainChance>=30) || (cape>=1200 && rainChance>=20 && maxHourlyRain>0)) storm='متوسطة';
    let note=''; if(rainChance>=70)note='🌧️ فرصة المطر مرتفعة نسبيًا وفق التوقع الحالي. راقب تحديث الساعات لأن التوقيت والكمية قد يتغيران.';else if(rainChance>=40)note='☁️ توجد فرصة متوسطة للمطر، والتفاصيل الساعية ستوضح الفترة الأفضل مع اقتراب الموعد.';else if(rainChance>=20)note='🌤️ توجد إشارة محدودة للمطر، لكنها ليست قوية حاليًا.';else note='☀️ لا تظهر حاليًا إشارة قوية للمطر في هذا اليوم.';
    return{amount,hours,bestHour,humidity:Math.round(humidity),cloud:Math.round(cloud),wind:Math.round(wind),cape:Math.round(cape),instability:storm,note};
  };

  function renameStormLabels(){document.querySelectorAll('.forecast-detail span').forEach(s=>{if(s.textContent.includes('عدم الاستقرار'))s.textContent='⛈️ قابلية العواصف';});}

  window.showWeatherAlerts=function(data){
    const box=document.getElementById('weatherAlerts'); if(!box||!data?.hourly)return;
    const start=getCurrentHourIndex(data),end=Math.min(start+24,data.hourly.time.length),alerts=[];
    let maxRain=0,maxGust=0,minTemp=Infinity,maxTemp=-Infinity,thunder=false,northWind=false;
    for(let i=start;i<end;i++){
      const rain=Number(data.hourly.precipitation_probability?.[i]??0),gust=Number(data.hourly.wind_gusts_10m?.[i]??0),temp=Number(data.hourly.temperature_2m?.[i]),code=Number(data.hourly.weather_code?.[i]??0),dir=Number(data.hourly.wind_direction_10m?.[i]);
      maxRain=Math.max(maxRain,rain);maxGust=Math.max(maxGust,gust);if(Number.isFinite(temp)){minTemp=Math.min(minTemp,temp);maxTemp=Math.max(maxTemp,temp)}if(code>=95)thunder=true;if(gust>=35&&Number.isFinite(dir)&&(dir>=315||dir<=45))northWind=true;
    }
    if(dustAlertMessage)alerts.push(dustAlertMessage);
    if(maxRain>=40)alerts.push(`🕒 🌧️ مطر متوقع: أعلى احتمال خلال 24 ساعة ${Math.round(maxRain)}%`);
    if(maxGust>=40)alerts.push(`🕒 💨 رياح قوية متوقعة: هبات قد تصل إلى ${Math.round(maxGust)} كم/س${northWind?' • بينها رياح شمالية':''}`);
    if(Number.isFinite(minTemp)&&minTemp<=15)alerts.push(`🕒 🥶 برودة متوقعة: قد تنخفض الحرارة إلى ${Math.round(minTemp)}°`);
    if(thunder)alerts.push('🕒 ⛈️ عواصف رعدية أو برق متوقع خلال الساعات القادمة');
    if(Number.isFinite(maxTemp)&&maxTemp>=40)alerts.push(`🕒 🌡️ حرارة شديدة متوقعة: قد تصل إلى ${Math.round(maxTemp)}°`);
    box.innerHTML=alerts.length?alerts.map(x=>`<div style="margin:7px 0">${x}</div>`).join(''):'✅ لا توجد تنبيهات جوية بارزة خلال الـ24 ساعة القادمة.';
  };

  function formatModelDay(day){if(!day||day==='--')return'--';const d=new Date(day+'T12:00:00');return d.toLocaleDateString('ar-YE',{weekday:'long',day:'numeric',month:'long'});}
  window.loadModels=async function(){
    const grid=document.getElementById('modelsGrid'),summary=document.getElementById('modelsSummary');grid.innerHTML='<div class="loading">جاري التحميل...</div>';
    try{
      const models=MODEL_LIST.map(x=>x[1]).join(',');
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&models=${models}&timezone=Asia%2FAden&forecast_days=7`;
      const r=await fetch(url);if(!r.ok)throw new Error('models');const d=await r.json(),daily=d.daily||{},get=(base,model)=>daily[`${base}_${model}`]||[],cards=[],rainSignals=[];
      for(const [label,model] of MODEL_LIST){
        const probs=get('precipitation_probability_max',model),sums=get('precipitation_sum',model),maxs=get('temperature_2m_max',model),mins=get('temperature_2m_min',model),winds=get('wind_speed_10m_max',model);
        let bi=0,bp=-1;probs.forEach((v,i)=>{const n=Number(v);if(Number.isFinite(n)&&n>bp){bp=n;bi=i}});rainSignals.push(bp);
        if(bp<=0){cards.push(`<div class="model-item"><span>${label}</span><strong>لا توجد فرصة مطر معتبرة خلال فترة التوقع.</strong><br>الحرارة اليوم: ${Math.round(Number(maxs[0]||0))}° / ${Math.round(Number(mins[0]||0))}°<br>الرياح اليوم: ${Math.round(Number(winds[0]||0))} كم/س</div>`);continue;}
        const rain=Number(sums[bi]||0),day=daily.time?.[bi]||'--';
        cards.push(`<div class="model-item"><span>${label}</span><strong>أفضل فرصة: ${Math.round(bp)}%</strong><br>المطر: ${rain.toFixed(1)} ملم<br>اليوم: ${formatModelDay(day)}<br>الحرارة: ${Math.round(Number(maxs[bi]||0))}° / ${Math.round(Number(mins[bi]||0))}°<br>الرياح: ${Math.round(Number(winds[bi]||0))} كم/س</div>`);
      }
      grid.innerHTML=cards.join('');const valid=rainSignals.filter(Number.isFinite),high=valid.filter(v=>v>=50).length;
      summary.textContent=high>=3?`🌧️ اتفاق جيد: ${high} من ${valid.length} نماذج تظهر إشارة مطر 50% أو أكثر خلال 7 أيام.`:high>0?`☁️ اتفاق محدود: ${high} من ${valid.length} نماذج تظهر إشارة مطر 50% أو أكثر.`:'☀️ لا يوجد حاليًا اتفاق قوي بين النماذج على فرصة مطر مرتفعة.';modelsLoaded=true;
    }catch(e){console.error(e);summary.textContent='تعذر تحميل مقارنة الموديلات حاليًا.';grid.innerHTML='';}
  };

  function quakeRegion(lat,lon,place=''){
    if(lat>=11&&lat<=13.8&&lon>=52.2&&lon<=55.8)return'سقطرى وما حولها';
    if(lat>=10&&lat<=16&&lon>=43&&lon<52.5)return'خليج عدن';
    if(lat>=5&&lat<=23&&lon>=52.5&&lon<=69)return'بحر العرب';
    if(lat>=12&&lat<=19&&lon>=41.5&&lon<43.8)return'البحر الأحمر وباب المندب';
    if(lat>=12&&lat<=19&&lon>=43.8&&lon<=54.5)return'اليمن';
    if(lat>=0&&lat<12.5&&lon>=42&&lon<52.5)return'الصومال وما حولها';
    if(lat>=16&&lat<=27&&lon>=52&&lon<=60)return'عُمان وما حولها';
    const p=String(place);if(/Socotra|Hadibu|Qalansiyah|Kilmia/i.test(p))return'سقطرى وما حولها';if(/Somalia/i.test(p))return'الصومال وما حولها';if(/Yemen/i.test(p))return'اليمن';if(/Oman/i.test(p))return'عُمان وما حولها';return'المنطقة المحيطة';
  }
  window.loadQuakes=async function(){
    const grid=document.getElementById('quakeGrid'),summary=document.getElementById('quakeSummary');
    try{
      const end=new Date(),start=new Date(Date.now()-30*86400000),iso=x=>x.toISOString().slice(0,10),url=`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${iso(start)}&endtime=${iso(end)}&latitude=${latitude}&longitude=${longitude}&maxradiuskm=1500&minmagnitude=3&orderby=time&limit=8`;
      const r=await fetch(url);if(!r.ok)throw new Error('usgs');const d=await r.json(),f=d.features||[];
      summary.textContent=f.length?`آخر 30 يومًا: ${f.length} من أحدث الزلازل بقوة 3.0 فأعلى ضمن نطاق 1500 كم.`:'لم يسجل الاستعلام زلازل بقوة 3.0 فأعلى ضمن النطاق المحدد خلال 30 يومًا.';
      grid.innerHTML=f.map(q=>{const c=q.geometry?.coordinates||[],dist=haversine(latitude,longitude,c[1],c[0]),dt=new Date(q.properties.time).toLocaleString('ar-YE',{timeZone:'Asia/Aden',day:'numeric',month:'numeric',hour:'numeric',minute:'2-digit',hour12:true}),region=quakeRegion(Number(c[1]),Number(c[0]),q.properties.place);return `<div class="quake-item"><span>${dt}</span><strong>قوة ${Number(q.properties.mag).toFixed(1)}</strong><br>${region}<br>يبعد نحو ${Math.round(dist)} كم • العمق ${Math.round(Number(c[2]||0))} كم</div>`}).join('');quakesLoaded=true;
    }catch(e){console.error(e);summary.textContent='تعذر تحميل رصد الزلازل حاليًا.';grid.innerHTML='';}
  };

  function adenToday(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),p={};parts.forEach(x=>p[x.type]=x.value);return new Date(Number(p.year),Number(p.month)-1,Number(p.day));}
  function currentStarInfo(){
    if(typeof starsData==='undefined')return null;const today=adenToday();
    for(const group of starsData){for(const star of group.stars){const start=parseStarEntryDate(star[1]);if(!start)continue;const end=new Date(start);end.setDate(end.getDate()+12);if(today>=start&&today<=end){const currentDay=Math.floor((today-start)/86400000)+1;return{name:star[0],day:currentDay,remaining:Math.max(0,13-currentDay)};}}}return null;
  }
  function showInlineStar(){
    let el=document.getElementById('currentStarInline');if(!el){el=document.createElement('div');el.id='currentStarInline';el.className='star-inline';document.querySelector('header .date')?.appendChild(el);}const s=currentStarInfo();if(el)el.textContent=s?`⭐ النجم الزراعي: ${s.name} • اليوم ${s.day} من 13 • متبقي ${s.remaining} أيام`:'';
  }

  window.loadWeather=async function(){
    try{
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}`+`&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m`+`&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape,visibility`+`&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max`+`&timezone=Asia%2FAden&forecast_days=7`;
      const response=await fetch(url);if(!response.ok)throw new Error('Weather API error');const data=await response.json();weatherData=data;showCurrentWeather(data);showHourlyWeather(data);showWeeklyWeather(data);renameStormLabels();showBestRain(data);showObserverWeather(data);showWeatherAlerts(data);
    }catch(error){console.error(error);document.getElementById('weatherDescription').innerHTML='<span class="error">تعذر تحميل بيانات الطقس</span>';}
  };

  async function initOneSignal(){
    try{
      if(!document.querySelector('script[data-huda-onesignal]')){
        const s=document.createElement('script');s.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';s.defer=true;s.dataset.hudaOnesignal='1';document.head.appendChild(s);
      }
      window.OneSignalDeferred=window.OneSignalDeferred||[];
      window.OneSignalDeferred.push(async function(OneSignal){
        await OneSignal.init({appId:ONE_SIGNAL_APP_ID,serviceWorkerPath:'push/onesignal/OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/push/onesignal/'},notifyButton:{enable:false},promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:false,text:{actionMessage:'فعّل التنبيهات ليصلك إشعار عند وجود تغيرات جوية مهمة.',acceptButton:'تفعيل التنبيهات',cancelButton:'لاحقًا'}}]}}});
        window.HudaOneSignal=OneSignal;oneSignalReady=true;updateNotificationButton();
        try{OneSignal.Notifications.addEventListener('permissionChange',updateNotificationButton);OneSignal.User.PushSubscription.addEventListener('change',updateNotificationButton);}catch(e){}
      });
    }catch(e){console.error(e);}
  }
  function updateNotificationButton(){
    const b=document.getElementById('notificationButton');if(!b)return;
    try{const O=window.HudaOneSignal;const active=!!(O?.Notifications?.permission)&&!!(O?.User?.PushSubscription?.optedIn);b.textContent=active?'✅ التنبيهات مفعلة':'🔔 تفعيل تنبيهات الطقس';}catch(e){b.textContent='🔔 تفعيل تنبيهات الطقس';}
  }
  window.promptNotifications=async function(){
    const b=document.getElementById('notificationButton');
    if(!oneSignalReady||!window.HudaOneSignal){if(b)b.textContent='جاري تجهيز التنبيهات...';setTimeout(updateNotificationButton,1500);return;}
    try{const O=window.HudaOneSignal;if(O.Notifications.permission&&O.User.PushSubscription.optedIn){if(b)b.textContent='✅ التنبيهات مفعلة';return;}if(O.Slidedown?.promptPush)await O.Slidedown.promptPush();else await O.Notifications.requestPermission();setTimeout(updateNotificationButton,700);}catch(e){console.error(e);if(b)b.textContent='تعذر تفعيل التنبيهات';}
  };

  injectStyles();
  updateStaticUi();
  createDustModal();
  showInlineStar();
  initOneSignal();
  loadWeather();
})();
