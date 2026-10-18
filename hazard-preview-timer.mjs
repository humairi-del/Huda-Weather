// An independent schedule; there is no HTTP route that can trigger a send.
export default {
 async fetch(request,env){
  if(!['GET','HEAD'].includes(request.method))return Response.json({error:'method_not_allowed'},{status:405});
  if(new URL(request.url).pathname!=='/health')return Response.json({error:'not_found'},{status:404});
  return Response.json({service:'hada-hazard-preview',enabled:env.HAZARDS_ENABLED==='1',senderBound:!!env.HAZARD_SENDER,mode:'owner_test_only',intervalMinutes:15},{headers:{'Cache-Control':'no-store'}});
 },
 async scheduled(event,env,ctx){
  if(env.HAZARDS_ENABLED!=='1')return;
  if(!env.HAZARD_SENDER)throw Error('private_sender_unavailable');
  try{const result=await env.HAZARD_SENDER.checkAndSend();console.log(JSON.stringify({event:'hazard_preview',status:result.status,kind:result.kind,rainAvailable:result.rainAvailable,officialAvailable:result.officialAvailable}));}
  catch{console.error(JSON.stringify({event:'hazard_preview',status:'failed_closed'}));throw Error('hazard_preview_failed');}
 }
};
