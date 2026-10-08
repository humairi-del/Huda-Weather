import { createRemoteJWKSet, jwtVerify } from 'jose';
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});
const allowedSections=new Set(['stars','prayers','alerts','sponsor','rates','modules','site']);
const allowedRoles=new Set(['owner']);
const idPattern=/^[a-z0-9][a-z0-9:_-]{0,119}$/;
function corsReject(request){const origin=request.headers.get('origin');if(!origin)return null;try{return new URL(origin).origin===new URL(request.url).origin?null:json({error:'Cross-origin requests are not supported'},403)}catch{return json({error:'Invalid Origin'},403)}}
async function identity(request,env){
 const token=request.headers.get('cf-access-jwt-assertion');
 if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)throw new Error('unauthorized');
 const team=env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//,'').replace(/\/$/,'');
 if(!/^[a-z0-9.-]+\.cloudflareaccess\.com$/.test(team))throw new Error('config');
 const issuer='https://'+team;
 const jwks=createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs'));
 const {payload}=await jwtVerify(token,jwks,{issuer,audience:env.ACCESS_AUD,algorithms:['RS256']});
 const email=String(payload.email||'').toLowerCase();
 if(!email||!env.OWNER_EMAIL)throw new Error('unauthorized');
 const owner=email===env.OWNER_EMAIL.toLowerCase();
 if(!owner)throw new Error('forbidden');
 return {email,role:'owner'};
}
function authorize(actor,section,method){
 if(!allowedRoles.has(actor.role))return false;
 if(actor.role==='owner')return true;
 return false;
}
async function parsePayload(request,section){
 const size=Number(request.headers.get('content-length')||0);
 if(size>12000)throw new Error('payload');
 const raw=await request.text();
 if(raw.length>12000)throw new Error('payload');
 const obj=JSON.parse(raw);
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('payload');
 if(section==='stars'){
  if(typeof obj.name!=='string'||obj.name.trim().length===0||obj.name.length>100||typeof obj.detail!=='string'||obj.detail.length>5000||typeof obj.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(obj.date)||!Number.isFinite(Date.parse(obj.date+'T00:00:00Z'))||new Date(obj.date+'T00:00:00Z').toISOString().slice(0,10)!==obj.date)throw new Error('payload');
 }
 if(section==='rates'){
  for(const field of ['usdBuy','usdSell','sarBuy','sarSell'])if(typeof obj[field]!=='number'||!Number.isFinite(obj[field])||obj[field]<=0)throw new Error('rates');
  if(obj.usdBuy>obj.usdSell||obj.sarBuy>obj.sarSell)throw new Error('rates');
 }
 return JSON.stringify(obj);
}
export {corsReject,parsePayload};
export default {async fetch(request,env){
 if(!env.DB)return json({error:'Database not configured'},503);
 const url=new URL(request.url);
 if(url.protocol!=='https:'||url.hostname!==(env.STAGING_HOST||'owner-dev.hada-weather.com'))return json({error:'Staging host required'},403);
 if(!url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 const cross=corsReject(request);if(cross)return cross;
 let actor;try{actor=await identity(request,env)}catch{return json({error:'Unauthorized'},401)}
 if(url.pathname==='/api/me'&&request.method==='GET')return json({role:actor.role,email:actor.email});
 const match=/^\/api\/entries\/([a-z0-9:_-]{1,120})$/.exec(url.pathname);
 if(!match)return json({error:'Not found'},404);
 const id=match[1],section=id.split(':')[0];
 if(!idPattern.test(id)||!allowedSections.has(section))return json({error:'Invalid entry'},400);
 if(section==='stars'&&!/^stars:(hassan|mohammed):(spring|summer|autumn|winter):[0-6]$/.test(id))return json({error:'Invalid star entry'},400);
 if(!authorize(actor,section,request.method))return json({error:'Forbidden'},403);
 try{
  if(request.method==='GET'){
   const entry=await env.DB.prepare('SELECT id,section,payload,revision,updated_at FROM content_entries WHERE id=?').bind(id).first();
   return entry?json({...entry,payload:JSON.parse(entry.payload)}):json({error:'Not found'},404);
  }
  if(request.method==='PUT'){
   if(!['application/json'].some(x=>(request.headers.get('content-type')||'').startsWith(x)))return json({error:'JSON required'},415);
   const ifMatch=request.headers.get('if-match');
   if(ifMatch===null||!/^\d+$/.test(ifMatch))return json({error:'If-Match revision required'},428);
   const revision=Number(ifMatch);
   if(!Number.isSafeInteger(revision)||revision<0)return json({error:'If-Match revision required (0 for new)'},428);
   const payload=await parsePayload(request,section);
   const old=await env.DB.prepare('SELECT payload,revision FROM content_entries WHERE id=?').bind(id).first();
   if((old?.revision||0)!==revision)return json({error:'Revision conflict'},409);
   const next=revision+1,now=new Date().toISOString(),eventId=crypto.randomUUID();
   // D1 batch executes in one transaction: content and audit succeed or roll back together.
   // Audit is conditional on the exact newly written row, preventing false audit entries on conflicts.
   const writes=await env.DB.batch([
    env.DB.prepare('INSERT INTO content_entries(id,section,payload,revision,updated_at,updated_by) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE content_entries.revision=?').bind(id,section,payload,next,now,actor.email,revision),
    env.DB.prepare('INSERT INTO audit_events(id,actor,action,entry_id,before_payload,after_payload,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM content_entries WHERE id=? AND revision=? AND payload=? AND updated_at=? AND updated_by=?)').bind(eventId,actor.email,'update',id,old?.payload||null,payload,now,id,next,payload,now,actor.email)
   ]);
   if(!writes[0]?.meta?.changes)return json({error:'Revision conflict'},409);
   if(writes[1]?.meta?.changes!==1)return json({error:'Audit integrity failure'},500);
   return json({ok:true,id,revision:next,updated_at:now});
  }
  return json({error:'Method not allowed'},405,{allow:'GET, PUT'});
 }catch(e){if(['payload','rates'].includes(e.message)||e instanceof SyntaxError)return json({error:'Invalid input'},400);return json({error:'Server error'},500)}
}}};
