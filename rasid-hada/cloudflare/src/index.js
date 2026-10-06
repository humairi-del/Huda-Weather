import postgres from "postgres";

const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const json=(body,status=200)=>Response.json(body,{status,headers});
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const randomHex=n=>{const b=new Uint8Array(n);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,"0")).join("")};
async function sha256(v){return hex(await crypto.subtle.digest("SHA-256",enc.encode(v)))}
async function passwordHash(password,pepper,salt=randomHex(16)){
 if(!pepper)throw new Error("AUTH_PEPPER missing");
 const key=await crypto.subtle.importKey("raw",enc.encode(pepper),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=await crypto.subtle.sign("HMAC",key,enc.encode(salt+"\0"+password));
 return `hmac_sha256$${salt}$${hex(mac)}`;
}
async function passwordOk(password,stored,pepper){
 const p=stored.split("$");if(p.length!==3||p[0]!=="hmac_sha256"||!pepper)return false;
 const expected=await passwordHash(password,pepper,p[1]);
 const a=enc.encode(expected),b=enc.encode(stored);if(a.length!==b.length)return false;
 let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0;
}
async function body(request){try{return await request.json()}catch{return null}}
async function auth(request,sql,role){
 const h=request.headers.get("Authorization")||""; if(!h.startsWith("Bearer "))return null;
 const hash=await sha256(h.slice(7));
 const rows=await sql`SELECT u.id,u.email,u.role,u.active FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=${hash} AND s.expires_at>NOW() AND u.active=TRUE`;
 const u=rows[0]; if(!u||(role&&u.role!==role))return null; return u;
}
async function authAny(request,sql,roles){
 const u=await auth(request,sql); return u&&roles.includes(u.role)?u:null;
}
function uuid(){return crypto.randomUUID()}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==="/health")return json({status:"ok",service:"rasid-hada",environment:"production"});
 const sql=postgres(env.HYPERDRIVE.connectionString,{max:1,fetch_types:false,prepare:true});
 try{
  if(url.pathname==="/health/db"){
   const r=await sql`SELECT version FROM schema_migrations WHERE version='003_weather_intelligence'`;
   const ready=r?.[0]?.version==="003_weather_intelligence";
   return json({status:ready?"ok":"error",database:ready?"connected":"unavailable",schema:ready?"ready":"unavailable"},ready?200:503);
  }
  if(url.pathname==="/admin/weather/refresh"&&request.method==="POST"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const configs=[
    ["ECMWF","ecmwf_ifs025"],["AIFS","ecmwf_aifs025_single"],["GFS","gfs_global"],["ICON","icon_global"],["CMC","gem_global"]
   ];
   const vars="temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,cape";
   const saved=[];
   for(const [model,apiModel] of configs){
    const api=new URL("https://api.open-meteo.com/v1/forecast");
    api.search=new URLSearchParams({latitude:"14.212599",longitude:"47.161149",hourly:vars,forecast_days:"2",timezone:"Asia/Aden",models:apiModel}).toString();
    const res=await fetch(api,{headers:{"User-Agent":"Rasid-Hada/1.0"}});
    if(!res.ok){saved.push({model,status:"source_error",http:res.status});continue}
    const d=await res.json(),h=d.hourly;if(!h?.time?.length){saved.push({model,status:"empty"});continue}
    const runId=uuid(),runTime=new Date().toISOString();
    await sql`INSERT INTO weather_model_runs(id,model,run_time,source) VALUES(${runId},${model},${runTime},${"Open-Meteo/"+apiModel})`;
    let n=0;
    for(let i=0;i<h.time.length;i++){
     const target=new Date(h.time[i]+"+03:00").toISOString();
     const rain=Number.isFinite(h.precipitation?.[i])?h.precipitation[i]:null;
     const cape=Number.isFinite(h.cape?.[i])?h.cape[i]:null;
     const risk=cape>=2000?"high":cape>=1000?"moderate":cape>=300?"low":"none";
     await sql`INSERT INTO weather_forecast_points(id,run_id,target_time,latitude,longitude,rain_mm,temperature_c,humidity_pct,wind_kph,wind_direction_deg,severe_risk,raw_summary) VALUES(${uuid()},${runId},${target},14.212599,47.161149,${rain},${h.temperature_2m?.[i]??null},${h.relative_humidity_2m?.[i]??null},${h.wind_speed_10m?.[i]??null},${h.wind_direction_10m?.[i]??null},${risk},${cape==null?null:"CAPE="+cape})`;
     n++;
    }
    saved.push({model,status:"ok",points:n});
   }
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'refresh_weather','weather','hada',${JSON.stringify(saved)})`;
   return json({status:"ok",location:"هدى - حبان - شبوة",horizon_hours:48,models:saved});
  }
  if(url.pathname==="/admin/weather/analyze"&&request.method==="POST"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const rows=await sql`SELECT r.model,p.target_time,p.rain_mm,p.wind_kph,p.severe_risk FROM weather_model_runs r JOIN weather_forecast_points p ON p.run_id=r.id WHERE r.id IN (SELECT DISTINCT ON (model) id FROM weather_model_runs ORDER BY model,run_time DESC) AND p.target_time>=NOW() AND p.target_time<NOW()+INTERVAL '48 hours' ORDER BY p.target_time,r.model`;
   if(!rows.length)return json({detail:"لا توجد بيانات موديلات"},409);
   const skillRows=await sql`SELECT model,COUNT(*)::int AS samples,AVG(absolute_error)::float AS mae FROM weather_verifications WHERE verified_at>=NOW()-INTERVAL '90 days' AND absolute_error IS NOT NULL GROUP BY model`;
   const skill={};for(const s of skillRows){const n=Number(s.samples),mae=Number(s.mae);skill[s.model]={samples:n,mae,weight:n>=5?Math.max(.35,Math.min(1.65,1.35/(1+mae))):1}}
   const weight=m=>skill[m]?.weight||1;
   const byTime=new Map();for(const x of rows){const k=new Date(x.target_time).toISOString();if(!byTime.has(k))byTime.set(k,[]);byTime.get(k).push(x)}
   let best=null;
   for(const [time,xs] of byTime){
    const wet=xs.filter(x=>Number(x.rain_mm||0)>=0.1),weightedAgree=wet.reduce((a,x)=>a+weight(x.model),0),totalWeight=xs.reduce((a,x)=>a+weight(x.model),0);
    const weightedRain=xs.reduce((a,x)=>a+Number(x.rain_mm||0)*weight(x.model),0)/Math.max(totalWeight,.01);
    const score=weightedAgree*100+weightedRain;
    if(!best||score>best.score)best={time,xs,wet,score,weightedAgree,totalWeight,weightedRain};
   }
   const agree=best.wet.length,ratio=best.weightedAgree/Math.max(best.totalWeight,.01);
   const confidence=ratio>=.72?"high":ratio>=.52?"medium":ratio>=.32?"low":"unknown";
   const wetModels=best.wet.map(x=>x.model);
   const summary=agree?(`أفضل فرصة خلال 48 ساعة قرب ${best.time}: اتفاق مرجح ${Math.round(ratio*100)}% (${agree} من ${best.xs.length} موديلات)، ومتوسط مطر مرجح ${best.weightedRain.toFixed(2)} مم.`):"لا يظهر اتفاق معتبر على هطول خلال 48 ساعة.";
   const previous=await sql`SELECT summary,best_model,confidence FROM analysis_runs ORDER BY created_at DESC LIMIT 1`;
   const material=!previous.length||previous[0].confidence!==confidence||previous[0].summary!==summary;
   const id=uuid(),startTime=new Date().toISOString(),endTime=new Date(Date.now()+48*3600000).toISOString();
   const ranked=Object.entries(skill).filter(([,v])=>v.samples>=5).sort((a,b)=>b[1].weight-a[1].weight);
   const bestModel=ranked[0]?.[0]||null;
   await sql`INSERT INTO analysis_runs(id,horizon_start,horizon_end,latitude,longitude,summary,best_model,confidence,material_change) VALUES(${id},${startTime},${endTime},14.212599,47.161149,${summary},${bestModel},${confidence},${material})`;
   if(material&&ratio>=.52)await sql`INSERT INTO weather_alerts(id,analysis_id,alert_type,severity,title,message,starts_at,ends_at) VALUES(${uuid()},${id},'rain_change',${ratio>=.72?'warning':'watch'},'تغير ملموس في فرص المطر',${summary},${best.time},${new Date(new Date(best.time).getTime()+3600000).toISOString()})`;
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'analyze_weather','analysis_run',${id},${JSON.stringify({agree,ratio,wetModels,bestModel,confidence,material,skill})})`;
   return json({status:"ok",analysis:{id,summary,best_time:best.time,agree,total_models:best.xs.length,weighted_agreement:Math.round(ratio*100),wet_models:wetModels,best_model:bestModel,confidence,material_change:material,model_skill:skill}});
  }
  if(url.pathname==="/admin/weather/verify-rain"&&request.method==="POST"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const d=await body(request),observed=Number(d?.rain_observed_mm),at=new Date(d?.forecast_time||"");
   if(!Number.isFinite(observed)||observed<0||Number.isNaN(at.getTime()))return json({detail:"بيانات التحقق غير صالحة"},400);
   const nearest=await sql`SELECT DISTINCT ON (r.model) r.model,p.target_time,p.rain_mm FROM weather_model_runs r JOIN weather_forecast_points p ON p.run_id=r.id WHERE p.target_time BETWEEN ${new Date(at.getTime()-30*60000).toISOString()} AND ${new Date(at.getTime()+30*60000).toISOString()} ORDER BY r.model,r.run_time DESC`;
   if(!nearest.length)return json({detail:"لا توجد توقعات محفوظة لهذا التوقيت"},404);
   for(const x of nearest){const forecast=Number(x.rain_mm||0);await sql`INSERT INTO weather_verifications(id,model,forecast_time,rain_forecast_mm,rain_observed_mm,absolute_error,notes) VALUES(${uuid()},${x.model},${x.target_time},${forecast},${observed},${Math.abs(forecast-observed)},${String(d?.notes||"").slice(0,1000)||null})`}
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'verify_rain','weather','hada',${JSON.stringify({forecast_time:at.toISOString(),observed,models:nearest.length})})`;
   return json({status:"ok",verified_models:nearest.length});
  }
  if(url.pathname==="/weather/analysis/latest"&&request.method==="GET"){
   const a=await sql`SELECT id,created_at,horizon_start,horizon_end,latitude,longitude,summary,best_model,confidence,material_change FROM analysis_runs ORDER BY created_at DESC LIMIT 1`;
   if(!a.length)return json({status:"empty",detail:"لا يوجد تحليل جوي محفوظ بعد"});
   const models=await sql`SELECT DISTINCT ON (r.model) r.model,r.run_time,r.fetched_at,r.source FROM weather_model_runs r ORDER BY r.model,r.run_time DESC`;
   const alerts=await sql`SELECT id,alert_type,severity,title,message,starts_at,ends_at,created_at FROM weather_alerts WHERE active=TRUE ORDER BY created_at DESC LIMIT 20`;
   return json({status:"ok",location:{name:"هدى - حبان - شبوة",latitude:14.212599,longitude:47.161149,timezone:"Asia/Aden"},analysis:a[0],models,alerts});
  }
  if(url.pathname==="/weather/models/latest"&&request.method==="GET"){
   const rows=await sql`SELECT r.model,r.run_time,r.fetched_at,r.source,p.target_time,p.rain_mm,p.rain_probability,p.temperature_c,p.humidity_pct,p.wind_kph,p.wind_direction_deg,p.thunder_probability,p.severe_risk FROM weather_model_runs r JOIN weather_forecast_points p ON p.run_id=r.id WHERE r.id IN (SELECT DISTINCT ON (model) id FROM weather_model_runs ORDER BY model,run_time DESC) AND p.target_time>=NOW() AND p.target_time<NOW()+INTERVAL '48 hours' ORDER BY p.target_time,r.model`;
   return json({status:"ok",horizon_hours:48,location:{name:"هدى - حبان - شبوة",latitude:14.212599,longitude:47.161149},points:rows});
  }
  if(url.pathname==="/ai/status"&&request.method==="GET"){
   const s=await sql`SELECT key,value FROM system_settings WHERE key IN ('ai_enabled','visitor_ai_daily_limit')`;
   const m=Object.fromEntries(s.map(x=>[x.key,x.value]));
   return json({enabled:m.ai_enabled==="true",visitor_daily_limit:Number(m.visitor_ai_daily_limit||10)});
  }
  if(url.pathname==="/admin/ai/settings"&&request.method==="PATCH"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const d=await body(request);if(typeof d?.enabled!=="boolean")return json({detail:"بيانات غير صالحة"},400);
   await sql`INSERT INTO system_settings(key,value,updated_at) VALUES('ai_enabled',${d.enabled?'true':'false'},NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`;
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'set_ai_enabled','system','ai',${d.enabled?'enabled':'disabled'})`;
   return json({status:"ok",enabled:d.enabled});
  }
  if(url.pathname==="/auth/login"&&request.method==="POST"){
   const d=await body(request); if(!d?.email||typeof d.password!=="string")return json({detail:"بيانات الدخول غير صحيحة"},401);
   const rows=await sql`SELECT id,email,password_hash,role,active FROM users WHERE lower(email)=lower(${String(d.email)}) LIMIT 1`; const u=rows[0];
   if(!u||!u.active||!(await passwordOk(d.password,u.password_hash,env.AUTH_PEPPER)))return json({detail:"بيانات الدخول غير صحيحة"},401);
   const token=randomHex(32),hash=await sha256(token);
   await sql`INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(${hash},${u.id},NOW()+INTERVAL '12 hours')`;
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'login','user',${u.id},'')`;
   return json({access_token:token,token_type:"bearer",expires_in:43200});
  }
  if(url.pathname==="/auth/me"&&request.method==="GET"){
   const u=await auth(request,sql);return u?json({id:u.id,email:u.email,role:u.role}):json({detail:"جلسة غير صالحة"},401);
  }
  if(url.pathname==="/auth/logout"&&request.method==="POST"){
   const h=request.headers.get("Authorization")||"";if(h.startsWith("Bearer "))await sql`DELETE FROM auth_sessions WHERE token_hash=${await sha256(h.slice(7))}`;return json({status:"ok"});
  }
  if(url.pathname==="/admin/teachers"&&request.method==="GET"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const rows=await sql`SELECT id,email,active,created_at FROM users WHERE role='teacher' ORDER BY created_at`;return json({teachers:rows});
  }
  if(url.pathname==="/admin/teachers"&&request.method==="POST"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const d=await body(request);if(!d?.email||typeof d.password!=="string"||d.password.length<12)return json({detail:"بيانات غير صالحة"},400);
   const c=await sql`SELECT COUNT(*)::int AS n FROM users WHERE role='teacher'`;if(c[0].n>=5)return json({detail:"تم الوصول إلى الحد الأقصى: خمسة معلّمين"},409);
   const exists=await sql`SELECT 1 FROM users WHERE lower(email)=lower(${String(d.email)})`;if(exists.length)return json({detail:"الحساب موجود"},409);
   const id=uuid(),ph=await passwordHash(d.password,env.AUTH_PEPPER);
   await sql`INSERT INTO users(id,email,password_hash,role,active) VALUES(${id},${String(d.email)},${ph},'teacher',TRUE)`;
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'create_teacher','user',${id},'')`;
   return json({id,email:String(d.email),role:"teacher"},201);
  }
  if(url.pathname==="/knowledge"&&request.method==="GET"){
   const rows=await sql`SELECT id,subject,statement,source_note,created_at,reviewed_at FROM knowledge_items WHERE status='approved' ORDER BY reviewed_at DESC NULLS LAST,created_at DESC LIMIT 200`;
   return json({items:rows});
  }
  if(url.pathname==="/knowledge/submissions"&&request.method==="POST"){
   const u=await authAny(request,sql,["owner","teacher"]);if(!u)return json({detail:"غير مصرح"},403);
   const d=await body(request);
   const subject=String(d?.subject||"").trim(),statement=String(d?.statement||"").trim(),source=String(d?.source_note||"").trim();
   if(!subject||subject.length>200||!statement||statement.length>10000||source.length>1000)return json({detail:"بيانات غير صالحة"},400);
   const id=uuid();
   await sql`INSERT INTO knowledge_items(id,subject,statement,source_note,status,submitted_by) VALUES(${id},${subject},${statement},${source||null},'pending',${u.id})`;
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'submit_knowledge','knowledge_item',${id},'pending')`;
   return json({id,status:"pending"},201);
  }
  if(url.pathname==="/admin/knowledge/pending"&&request.method==="GET"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const rows=await sql`SELECT k.id,k.subject,k.statement,k.source_note,k.created_at,u.email AS submitted_by_email FROM knowledge_items k JOIN users u ON u.id=k.submitted_by WHERE k.status='pending' ORDER BY k.created_at`;
   return json({items:rows});
  }
  const review=url.pathname.match(/^\/admin\/knowledge\/([0-9a-f-]+)\/review$/i);
  if(review&&request.method==="PATCH"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const d=await body(request);if(!["approved","rejected"].includes(d?.status))return json({detail:"الحالة غير صالحة"},400);
   const rows=await sql`UPDATE knowledge_items SET status=${d.status},reviewed_by=${u.id},reviewed_at=NOW() WHERE id=${review[1]} AND status='pending' RETURNING id,status`;
   if(!rows.length)return json({detail:"العنصر غير موجود أو تمت مراجعته سابقًا"},409);
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'review_knowledge','knowledge_item',${review[1]},${d.status})`;
   return json(rows[0]);
  }
  if(url.pathname==="/admin/audit"&&request.method==="GET"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const rows=await sql`SELECT a.id,a.action,a.entity_type,a.entity_id,a.details,a.created_at,u.email AS actor_email FROM audit_log a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200`;
   return json({events:rows});
  }
  const m=url.pathname.match(/^\/admin\/teachers\/([0-9a-f-]+)\/active$/i);
  if(m&&request.method==="PATCH"){
   const u=await auth(request,sql,"owner");if(!u)return json({detail:"غير مصرح"},403);
   const d=await body(request);if(typeof d?.active!=="boolean")return json({detail:"بيانات غير صالحة"},400);
   const rows=await sql`UPDATE users SET active=${d.active} WHERE id=${m[1]} AND role='teacher' RETURNING id,active`;if(!rows.length)return json({detail:"المعلّم غير موجود"},404);
   await sql`DELETE FROM auth_sessions WHERE user_id=${m[1]} AND ${d.active} = FALSE`;
   await sql`INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,details) VALUES(${uuid()},${u.id},'set_teacher_active','user',${m[1]},${d.active?'active':'inactive'})`;
   return json(rows[0]);
  }
  return new Response("Rasid Hada",{status:200,headers:{...headers,"Content-Type":"text/plain; charset=UTF-8"}});
 }catch{return json({status:"error"},500)}finally{try{await sql.end({timeout:1})}catch{}}
}};