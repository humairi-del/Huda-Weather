import {boundedJson} from './weather-engine.js';
export const APP='4b60cca8-16ec-432d-88ae-e0bbc22d6558';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function ownerConfigured(env){return env.PUBLIC_NOTIFICATIONS_ENABLED==='1'&&env.PUBLIC_SCHEDULE_ENABLED==='1'&&env.ONESIGNAL_APP_ID===APP&&!!env.ONESIGNAL_REST_API_KEY&&!!env.PUBLIC_BULLETINS&&uuid(env.OWNER_PUSH_SUBSCRIPTION_ID)&&uuid(env.OWNER_PUSH_USER_ID)&&env.OWNER_PUSH_APP_ID===APP;}
export async function verifyOwner(env,fetcher=fetch){
 if(!ownerConfigured(env))return false;
 try{const response=await fetcher('https://api.onesignal.com/apps/'+APP+'/users/by/onesignal_id/'+env.OWNER_PUSH_USER_ID,{headers:{Authorization:'Key '+env.ONESIGNAL_REST_API_KEY},redirect:'manual',signal:AbortSignal.timeout(8000)});const user=await boundedJson(response,128000);
 return user.identity?.onesignal_id===env.OWNER_PUSH_USER_ID&&Array.isArray(user.subscriptions)&&user.subscriptions.some(s=>s.id===env.OWNER_PUSH_SUBSCRIPTION_ID&&s.enabled===true&&/Push$/.test(s.type||'')&&typeof s.token==='string'&&s.token.length>0);
 }catch{return false;}
}
export async function eventId(key,owner){const b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('hada-owner-v2:'+APP+':'+owner+':'+key)));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const s=Array.from(b.slice(0,16),x=>x.toString(16).padStart(2,'0')).join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);}
export function ownedPayload(env,content,id){
 if(!ownerConfigured(env)||!uuid(id))throw Error('owner_configuration_missing');
 return {app_id:APP,target_channel:'push',include_subscription_ids:[env.OWNER_PUSH_SUBSCRIPTION_ID],headings:{ar:content.title,en:content.title},contents:{ar:content.text,en:content.text},url:content.url,ttl:content.ttl,idempotency_key:id};
}
export async function deliverOwned(env,key,content,fetcher=fetch,verify=verifyOwner){
 // Isolated preview cannot contact OneSignal, even if a request supplies fake settings.
 if(env.NOTIFICATION_MODE!=='live')return {status:'simulation_only'};
 if(!ownerConfigured(env))return {status:'owner_configuration_missing'};
 if(!await verify(env,fetcher))return {status:'owner_verification_failed'};
 const stored=await env.PUBLIC_BULLETINS.get(key,{type:'json'});if(stored?.notificationId)return {status:'already_sent'};
 const id=await eventId(key,env.OWNER_PUSH_SUBSCRIPTION_ID),payload=ownedPayload(env,content,id);
 // A deterministic provider idempotency key also covers concurrent invocations and lost responses.
 await env.PUBLIC_BULLETINS.put(key,JSON.stringify({idempotencyKey:id}),{expirationTtl:604800});
 try{const r=await boundedJson(await fetcher('https://api.onesignal.com/notifications',{method:'POST',headers:{Authorization:'Key '+env.ONESIGNAL_REST_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'manual',signal:AbortSignal.timeout(10000)}),128000);
 if(!uuid(r.id))return {status:'not_accepted'};await env.PUBLIC_BULLETINS.put(key,JSON.stringify({notificationId:r.id,idempotencyKey:id}),{expirationTtl:604800});return {status:'accepted'};
 }catch{return {status:'delivery_unavailable'};}
}
