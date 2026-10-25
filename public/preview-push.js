// onesignal:managed v1 — retain the existing test app, origin, and worker scope.
(()=>{'use strict';
 const HOST='redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev';
 const production=location.hostname==='hada-weather.com';
 if(!production){const button=document.getElementById('activateUnifiedAlerts'),status=document.getElementById('unifiedAlertsStatus');if(button)button.disabled=true;if(status)status.textContent='معاينة معزولة: لا تُرسل إشعارات حقيقية.';return;}
 if(location.hostname!==HOST&&!production)return;
 const button=document.getElementById('activateUnifiedAlerts');
 const status=document.getElementById('unifiedAlertsStatus');
 if(!button||!status)return;
 const show=(text,state='idle')=>{status.textContent=text;status.dataset.state=state;};
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('Notification' in window)||!('PushManager' in window)){
  show('لتفعيل الإشعارات، افتح الموقع في متصفح مدعوم. على آيفون أضفه إلى الشاشة الرئيسية أولًا.');return;
 }
 button.disabled=true;
 show('جارٍ تجهيز خدمة إشعارات هدى…');
 let loaded=false;
 const timeout=setTimeout(()=>{if(!loaded){button.disabled=true;show('تأخر الاتصال بخدمة الإشعارات. تحقق من الاتصال ثم أعد تحميل الصفحة.','error');}},18000);
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 window.OneSignalDeferred.push(async sdk=>{
  try{
   await sdk.init({appId:production?'4b60cca8-16ec-432d-88ae-e0bbc22d6558':'9fedd24f-9a4d-4445-9a60-af736cb71c89',serviceWorkerPath:production?'sw.js':'OneSignalSDKWorker.js',notifyButton:{enable:false},welcomeNotification:{disable:true},promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:false}]}}});
   const actual=()=>{const s=sdk.User.PushSubscription;return sdk.Notifications.permission===true&&s.optedIn===true&&!!s.token&&typeof s.id==='string'&&!s.id.startsWith('local-');};
   const getStatus=async()=>{
    const tags=await sdk.User.getTags();
    if(!actual()||tags.hada_daily_bulletin!=='1'||tags.hada_emergency_alerts!=='1')return {confirmed:false,subscriptionConfirmed:false,channels:{morning:false,emergency:false}};
    if(production){
     const r=await fetch('./api/notifications/status',{cache:'no-store',signal:AbortSignal.timeout(12000)});
     if(!r.ok)throw Error('sender_unavailable');const result=await r.json();
     const ready=result.ready===true&&result.channels?.morning===true&&result.channels?.emergency===true;
     return {confirmed:ready,subscriptionConfirmed:actual(),deliveryMode:'production-registration',channels:{morning:ready,emergency:ready}};
    }
    const response=await fetch('./api/alert-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscriptionId:sdk.User.PushSubscription.id}),signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw Error('subscription_status_unavailable');
    const result=await response.json();
    return {...result,subscriptionConfirmed:actual()};
   };
   await window.HadaWeatherUI.configureAlerts({sdk,getStatus,subscribe:async({subscriptionId,channels})=>{
    if(!actual()||sdk.User.PushSubscription.id!==subscriptionId||channels?.morning!==true||channels?.emergency!==true)throw Error('subscription_not_ready');
    // Preferences only: the existing scheduler retains its one-phone allow-list.
    // Tags never add a device to that scheduler or assert emergency delivery.
    await sdk.User.addTags({hada_daily_bulletin:'1',hada_emergency_alerts:'1'});
    localStorage.setItem('hada_alert_preferences_v1',JSON.stringify({version:1,channels:{morning:true,emergency:true},timezone:'Asia/Aden',morningTime:'07:00',serverConfirmed:false,updatedAt:Date.now()}));
    let result;
    for(let attempt=0;attempt<4;attempt++){
     result=await getStatus();
     if(result.confirmed||result.eligible!==true||attempt===3)break;
     await new Promise(resolve=>setTimeout(resolve,750*2**attempt));
    }
    return result;
   }});
   loaded=true;clearTimeout(timeout);
   if(!actual())show('اضغط تفعيل ثم اسمح بالإشعارات.');
  }catch{
   clearTimeout(timeout);button.disabled=true;show('تعذر تجهيز خدمة الإشعارات. تحقق من الإنترنت ثم أعد تحميل الصفحة.','error');
  }
 });
 const script=document.createElement('script');
 script.id='oneSignalPageSdk';script.src='https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';script.defer=true;
 script.onerror=()=>{clearTimeout(timeout);button.disabled=true;show('تعذر تحميل خدمة الإشعارات. أعد المحاولة عند تحسن الاتصال.','error');};
 document.head.appendChild(script);
 document.addEventListener('visibilitychange',()=>{if(!loaded)button.disabled=true;});
})();

