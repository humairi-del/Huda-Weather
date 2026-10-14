import {build,dayKey} from './daily-bulletin-core.mjs';
import calendar from './daily-bulletin-calendar.mjs';
const TEST_APP='9fedd24f-9a4d-4445-9a60-af736cb71c89';
const LINK='https://redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev/?bulletin=today';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function jsonLimited(response){if(!response.ok)throw new Error('upstream_'+response.status);const reader=response.body.getReader(),chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>524288)throw new Error('response_too_large');chunks.push(value);}}finally{await reader.cancel();}const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));}
async function getJson(url,init={},io=fetch){return jsonLimited(await io(url,{...init,signal:AbortSignal.timeout(20000)}));}
export async function forecast(now,io=fetch){const params=new URLSearchParams({latitude:'14.230586',longitude:'47.199415',timezone:'Asia/Aden',forecast_days:'2',hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max'});return build(await getJson('https://api.open-meteo.com/v1/forecast?'+params,{},io),now,calendar);}
export async function dedupKey(date,app){const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('sabah-hada:v1:'+app+':'+date)));digest[6]=(digest[6]&15)|64;digest[8]=(digest[8]&63)|128;const s=Array.from(digest.slice(0,16),x=>x.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
export async function runDaily(env,now=new Date(),io=fetch){
 if(env.DAILY_ENABLED!=='1')return {status:'disabled'};
 if(env.ONESIGNAL_APP_ID!==TEST_APP)return {status:'unapproved_app'};
 if(!env.ONESIGNAL_REST_API_KEY)return {status:'missing_send_secret'};
 if(!env.BULLETINS||!UUID.test(env.TEST_SUBSCRIPTION_ID||'')||!UUID.test(env.TEST_USER_ID||''))return {status:'test_target_missing'};
 const hour=now.getUTCHours(),minute=now.getUTCMinutes();if(hour!==4||minute>30)return {status:'outside_morning_window'};
 const date=dayKey(now),stateKey='daily:'+date,previous=await env.BULLETINS.get(stateKey,{type:'json'});if(previous?.notificationId)return {status:'already_sent'};
 const headers={Authorization:'Key '+env.ONESIGNAL_REST_API_KEY,'Content-Type':'application/json'};
 const user=await getJson(`https://api.onesignal.com/apps/${TEST_APP}/users/by/onesignal_id/${env.TEST_USER_ID}`,{headers},io);
 const target=user.subscriptions?.find(s=>s.id===env.TEST_SUBSCRIPTION_ID&&s.enabled===true&&s.notification_types>=1);
 if(!target||user.properties?.tags?.hada_daily_bulletin!=='1')return {status:'test_phone_not_enrolled'};
 const bulletin=previous?.bulletin||await forecast(now,io);
 if(bulletin.date!==date||!bulletin.complete||bulletin.min===null||bulletin.max===null||bulletin.chance===null||bulletin.gust===null||bulletin.direction==='الاتجاه غير متاح'||bulletin.stars.length!==2||bulletin.stars.some(s=>!s.star))return {status:'incomplete_forecast'};
 const idempotencyKey=previous?.idempotencyKey||await dedupKey(date,TEST_APP);
 await env.BULLETINS.put(stateKey,JSON.stringify({bulletin,idempotencyKey}),{expirationTtl:604800});
 const midnight=Date.parse(date+'T00:00:00+03:00')+86400000;
 const payload={app_id:TEST_APP,include_subscription_ids:[env.TEST_SUBSCRIPTION_ID],headings:{en:bulletin.pushTitle,ar:bulletin.pushTitle},contents:{en:bulletin.pushText,ar:bulletin.pushText},url:LINK,ttl:Math.min(10800,Math.max(60,Math.floor((midnight-now.getTime())/1000))),idempotency_key:idempotencyKey};
 const sent=await getJson('https://api.onesignal.com/notifications',{method:'POST',headers,body:JSON.stringify(payload)},io);
 if(!UUID.test(sent.id||''))return {status:'send_not_accepted'};
 await env.BULLETINS.put(stateKey,JSON.stringify({bulletin,idempotencyKey,notificationId:sent.id}),{expirationTtl:604800});
 return {status:'accepted',date};
}
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':new URL(LINK).origin,'X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env){if(request.method!=='GET')return json({error:'method_not_allowed'},405);const path=new URL(request.url).pathname;
  if(path==='/health')return json({service:'sabah-hada-preview',schedule:'7:00 صباحًا — Asia/Aden',mode:'owner_test_only',enabled:env.DAILY_ENABLED==='1',sendCredentialConfigured:!!env.ONESIGNAL_REST_API_KEY});
  if(path==='/preview'){try{return json({bulletin:await forecast(new Date()),sent:false});}catch{return json({error:'fresh_forecast_unavailable'},503);}}
  if(path==='/today'){const date=dayKey(new Date()),saved=await env.BULLETINS.get('daily:'+date,{type:'json'});return saved?.bulletin?json({bulletin:saved.bulletin}):json({error:'no_saved_bulletin_today'},404);}
  return json({error:'not_found'},404);
 },
 async scheduled(event,env,ctx){try{const result=await runDaily(env,new Date(event.scheduledTime));console.log(JSON.stringify({event:'daily_bulletin',status:result.status,date:result.date}));}catch{console.error(JSON.stringify({event:'daily_bulletin',status:'failed_closed'}));throw new Error('daily_bulletin_failed');}}
};
