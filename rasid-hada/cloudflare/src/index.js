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
   const r=await sql`SELECT version FROM schema_migrations WHERE version='002_auth_sessions'`;
   const ready=r?.[0]?.version==="002_auth_sessions";
   return json({status:ready?"ok":"error",database:ready?"connected":"unavailable",schema:ready?"ready":"unavailable"},ready?200:503);
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