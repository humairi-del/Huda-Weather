import {collect} from './sea-map-core.mjs';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'https://redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev'};
export async function refreshMap(env,collector=collect,startedAt=new Date().toISOString(),trigger='scheduled'){
 await env.SEA_MAP.put('attempt',JSON.stringify({startedAt,trigger,ok:null}));
 try{const result=await collector();await env.SEA_MAP.put('latest',JSON.stringify(result));await env.SEA_MAP.put('attempt',JSON.stringify({startedAt,trigger,ok:true,finishedAt:new Date().toISOString()}));return result;}
 catch(error){await env.SEA_MAP.put('attempt',JSON.stringify({startedAt,trigger,ok:false,finishedAt:new Date().toISOString(),code:String(error.message).slice(0,80)}));throw error;}
}
export default {
 async fetch(request,env){
  if(request.method!=='GET')return new Response('Method not allowed',{status:405});
  const p=new URL(request.url).pathname;
  if(p!=='/data'&&p!=='/health')return new Response('Not found',{status:404});
  const data=await env.SEA_MAP.get('latest');
  const lastAttempt=await env.SEA_MAP.get('attempt','json');
  if(p==='/health'){const s=data?JSON.parse(data):null;return Response.json({ready:!!s,fetchedAt:s?.fetchedAt||null,period:s?.period||null,lastAttempt,refreshHours:6},{headers});}
  return data?Response.json({...JSON.parse(data),refresh:{lastAttempt,refreshHours:6}},{headers}):Response.json({error:'not_ready'},{status:503,headers});
 },
 async scheduled(event,env){await refreshMap(env,collect,new Date(event.scheduledTime).toISOString(),'scheduled');}
};
