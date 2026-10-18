import {TEST_APP,POINTS,MODELS,LINK,period,consensus,rainAdvisory,cycloneAdvisory} from './hazard-preview-core.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function readJson(url,init={},io=fetch){
 const response=await io(url,{...init,redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(!response.ok||!response.body)throw Error('upstream_unavailable');
 const reader=response.body.getReader(),parts=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>524288)throw Error('upstream_too_large');parts.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
function configured(env){return env.ONESIGNAL_APP_ID===TEST_APP&&!!env.ONESIGNAL_REST_API_KEY&&UUID.test(env.TEST_SUBSCRIPTION_ID||'')&&UUID.test(env.TEST_USER_ID||'')&&!!env.BULLETINS;}
export async function health(env){return {service:'hada-hazard-preview',enabled:env.HAZARD_TEST_ENABLED==='1',configured:configured(env),mode:'owner_test_only',morningScheduleUnchanged:true,lastCheck:await env.BULLETINS?.get('hazard:v1:last-check',{type:'json'})||null};}
async function target(env,io){
 const user=await readJson('https://api.onesignal.com/apps/'+TEST_APP+'/users/by/onesignal_id/'+env.TEST_USER_ID,{headers:{Authorization:'Key '+env.ONESIGNAL_REST_API_KEY}},io);
 const subscription=user.subscriptions?.find(s=>s.id===env.TEST_SUBSCRIPTION_ID&&s.enabled===true&&s.notification_types>=1);
 return {enabled:!!subscription,morning:user.properties?.tags?.hada_daily_bulletin==='1',emergency:user.properties?.tags?.hada_emergency_alerts==='1'};
}
export async function subscriptionStatus(env,subscriptionId,io=fetch){
 const closed={confirmed:false,eligible:false,channels:{morning:false,emergency:false}};
 if(!configured(env)||subscriptionId!==env.TEST_SUBSCRIPTION_ID)return closed;
 try{const p=await target(env,io);const channels={morning:p.enabled&&p.morning&&env.DAILY_ENABLED==='1',emergency:p.enabled&&p.emergency&&env.HAZARD_TEST_ENABLED==='1'};return {confirmed:channels.morning&&channels.emergency,eligible:p.enabled,channels};}catch{return closed;}
}
export async function collectRain(now,io=fetch){
 const p=period(now),query=new URLSearchParams({latitude:POINTS.map(p=>p.lat).join(','),longitude:POINTS.map(p=>p.lon).join(','),daily:'precipitation_sum',timezone:'Asia/Aden',precipitation_unit:'mm',start_date:p.start,end_date:p.dates[6],cell_selection:'nearest'});
 const results=await Promise.allSettled(MODELS.map(async m=>[m,await readJson('https://api.open-meteo.com/v1/'+m+'?'+query,{},io)]));
 if(results.some(r=>r.status!=='fulfilled'))throw Error('rain_source_unavailable');
 return consensus(Object.fromEntries(results.map(r=>r.value)),now);
}
export async function eventUuid(eventKey){const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('hada-hazard:v1:'+TEST_APP+':'+eventKey)));digest[6]=(digest[6]&15)|64;digest[8]=(digest[8]&63)|128;const s=Array.from(digest.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20,32)}`;}
export async function evaluate(now=new Date(),io=fetch){
 const results=await Promise.allSettled([collectRain(now,io),readJson(LINK+'api/official-cyclone',{},io)]);
 const rain=results[0].status==='fulfilled'?rainAdvisory(results[0].value,now):null;
 const cyclone=results[1].status==='fulfilled'?cycloneAdvisory(results[1].value,now):null;
 return {candidate:cyclone||rain,checkedAt:now.getTime(),rainAvailable:results[0].status==='fulfilled',officialAvailable:results[1].status==='fulfilled',coverage:['rain_forecast_huda_habban','official_classified_cyclone_towards_yemen'],notCovered:['observed_floods','dust_storms','all_governorate_locations']};
}
export async function runHazard(env,now=new Date(),io=fetch){
 if(env.HAZARD_TEST_ENABLED!=='1')return {status:'disabled'};
 if(!configured(env))return {status:'configuration_incomplete'};
 const phone=await target(env,io);if(!phone.enabled||!phone.emergency){await env.BULLETINS.put('hazard:v1:last-check',JSON.stringify({status:'owner_not_opted_in',checkedAt:now.getTime()}),{expirationTtl:604800});return {status:'owner_not_opted_in'};}
 const report=await evaluate(now,io),summary={checkedAt:report.checkedAt,rainAvailable:report.rainAvailable,officialAvailable:report.officialAvailable};
 if(!report.candidate){const status=report.rainAvailable&&report.officialAvailable?'no_eligible_advisory':'sources_incomplete';await env.BULLETINS.put('hazard:v1:last-check',JSON.stringify({...summary,status}),{expirationTtl:604800});return {status,...summary};}
 const c=report.candidate,key='hazard:v1:event:'+c.eventKey;
 const previous=await env.BULLETINS.get(key,{type:'json'});
 if(previous?.notificationId)return {status:'already_sent',...summary};
 const idempotencyKey=await eventUuid(c.eventKey);
 // Persist before send; ambiguous network retries retain the identical event UUID.
 await env.BULLETINS.put(key,JSON.stringify({idempotencyKey,kind:c.kind}),{expirationTtl:604800});
 const payload={app_id:TEST_APP,include_subscription_ids:[env.TEST_SUBSCRIPTION_ID],headings:{ar:c.title,en:c.title},contents:{ar:c.text,en:c.text},url:c.url,ttl:3600,idempotency_key:idempotencyKey};
 const sent=await readJson('https://api.onesignal.com/notifications',{method:'POST',headers:{Authorization:'Key '+env.ONESIGNAL_REST_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload)},io);
 if(!UUID.test(sent.id||''))throw Error('send_not_accepted');
 await env.BULLETINS.put(key,JSON.stringify({idempotencyKey,kind:c.kind,notificationId:sent.id}),{expirationTtl:604800});
 await env.BULLETINS.put('hazard:v1:last-check',JSON.stringify({...summary,status:'accepted',kind:c.kind}),{expirationTtl:604800});
 return {status:'accepted',kind:c.kind,...summary};
}
