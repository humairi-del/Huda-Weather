import {collect} from './sea-map-core.mjs';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'https://redesign-hada-2026-10.hada-weather-aifs-preview.pages.dev'};
export default {
 async fetch(request,env){
  if(request.method!=='GET')return new Response('Method not allowed',{status:405});
  const p=new URL(request.url).pathname;
  if(p!=='/data'&&p!=='/health')return new Response('Not found',{status:404});
  const data=await env.SEA_MAP.get('latest');
  if(p==='/health'){const s=data?JSON.parse(data):null;return Response.json({ready:!!s,fetchedAt:s?.fetchedAt||null,period:s?.period||null,lastAttempt:await env.SEA_MAP.get('attempt','json'),refreshHours:6},{headers});}
  return new Response(data||JSON.stringify({error:'not_ready'}),{status:data?200:503,headers});
 },
 async scheduled(event,env){
  const startedAt=new Date(event.scheduledTime).toISOString();
  try{const result=await collect();await env.SEA_MAP.put('latest',JSON.stringify(result));await env.SEA_MAP.put('attempt',JSON.stringify({startedAt,ok:true,finishedAt:new Date().toISOString()}));}
  catch(error){await env.SEA_MAP.put('attempt',JSON.stringify({startedAt,ok:false,code:String(error.message).slice(0,80)}));throw error;}
 }
};
