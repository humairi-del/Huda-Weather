import postgres from "postgres";
import base from "./index.js";

const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const json=(body,status=200)=>Response.json(body,{status,headers});
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function sha256(v){return hex(await crypto.subtle.digest("SHA-256",enc.encode(v)))}

const ownerHtml=`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>راصد هدى الذكي — لوحة المالك</title><style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#07111f;color:#eef5ff}main{max-width:1100px;margin:auto;padding:20px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px}.brand{font-size:24px;font-weight:800}.muted{color:#9fb0c5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:16px 0}.card{background:#0d1b2e;border:1px solid #20344f;border-radius:16px;padding:16px}.ok{color:#6ee7a8}.bad{color:#ff9a9a}button,input,textarea{font:inherit;border-radius:10px;border:1px solid #304a6b;padding:10px;background:#101f34;color:#fff}button{cursor:pointer;background:#183c68}button.danger{background:#67252b}button.good{background:#176044}input,textarea{width:100%;margin:6px 0}textarea{min-height:100px}.row{display:flex;gap:8px;flex-wrap:wrap}.row>*{flex:1}.hidden{display:none}pre{white-space:pre-wrap;word-break:break-word;background:#081321;padding:10px;border-radius:10px;max-height:280px;overflow:auto}h2{font-size:18px;margin:0 0 10px}.pill{display:inline-block;padding:4px 9px;border-radius:999px;background:#142b48}.item{padding:9px 0;border-top:1px solid #20344f}small{color:#9fb0c5}</style></head><body><main>
<div class="top"><div><div class="brand">🌦️ راصد هدى الذكي</div><div class="muted">لوحة المالك — هدى، حبان، شبوة</div></div><button id="logout" class="hidden">تسجيل الخروج</button></div>
<section id="login" class="card" style="max-width:460px;margin:30px auto"><h2>دخول المالك</h2><form id="loginForm" action="/owner-login" method="post"><input id="email" name="email" type="email" autocomplete="username" placeholder="البريد الإلكتروني" required><input id="password" name="password" type="password" autocomplete="current-password" placeholder="كلمة المرور" required><button id="loginBtn" type="submit">دخول</button></form><p id="loginMsg" class="bad"></p></section>
<section id="app" class="hidden">
<div class="grid"><div class="card"><h2>حالة الراصد</h2><div id="health">جارٍ الفحص…</div></div><div class="card"><h2>الذكاء الاصطناعي</h2><div id="ai">جارٍ الفحص…</div><div class="row" style="margin-top:10px"><button id="aiOn" class="good">تشغيل</button><button id="aiOff" class="danger">إيقاف</button></div></div><div class="card"><h2>التحليل الحالي</h2><div id="analysis">جارٍ التحميل…</div></div></div>
<div class="grid"><div class="card"><h2>الموديلات الخمسة</h2><div id="models">جارٍ التحميل…</div><button id="refresh">تحديث الموديلات</button> <button id="analyze">إعادة التحليل</button></div><div class="card"><h2>العاصفة الرملية</h2><div id="dust">جارٍ الفحص…</div></div><div class="card"><h2>بحر العرب</h2><div id="sea">جارٍ الفحص…</div></div></div>
<div class="grid"><div class="card"><h2>المعلّمون</h2><div id="teachers"></div><input id="teacherEmail" placeholder="بريد المعلّم"><input id="teacherPassword" type="password" placeholder="كلمة مرور قوية (12 حرفًا فأكثر)"><button id="addTeacher">إضافة معلّم</button></div><div class="card"><h2>المعرفة بانتظار المراجعة</h2><div id="pending">جارٍ التحميل…</div></div></div>
<div class="card"><h2>سجل الإدارة</h2><div id="audit">جارٍ التحميل…</div></div><p class="muted">راصد هدى — لوحة إدارة خاصة بالمالك.</p>
</section></main><script>
let token=sessionStorage.getItem("rasid_owner_token")||"";const $=id=>document.getElementById(id);
async function req(path,opt={}){opt.headers={...(opt.headers||{}),...(token?{Authorization:"Bearer "+token}:{})};if(opt.body&&!opt.headers["Content-Type"])opt.headers["Content-Type"]="application/json";const r=await fetch(path,opt);let d={};try{d=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(d.detail||"تعذر تنفيذ الطلب"),{status:r.status});return d}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
async function load(){
 try{const me=await req("/auth/me");if(me.role!=="owner")throw Error("غير مصرح");$("login").classList.add("hidden");$("app").classList.remove("hidden");$("logout").classList.remove("hidden")}catch{token="";sessionStorage.removeItem("rasid_owner_token");$("login").classList.remove("hidden");$("app").classList.add("hidden");return}
 const jobs=[
  req("/health").then(d=>$("health").innerHTML='<span class="ok">● يعمل</span><br><small>'+esc(d.environment)+'</small>'),
  req("/ai/status").then(d=>$("ai").innerHTML='<span class="'+(d.enabled?"ok":"muted")+'">'+(d.enabled?"مفعّل":"مغلق")+'</span><br><small>حد الزائر: '+esc(d.visitor_daily_limit)+' يوميًا</small>'),
  req("/weather/analysis/latest").then(d=>{const a=d.analysis||d;$("analysis").innerHTML='<b>'+esc(a.confidence||"—")+'</b><br>'+esc(a.summary||"لا يوجد تحليل")}),
  req("/weather/models/latest").then(d=>{const a=d.models||[];$("models").innerHTML=a.map(x=>'<div class="item"><b>'+esc(x.model)+'</b> — '+esc(x.points_count??x.points??"")+'</div>').join("")||"لا توجد بيانات"}),
  req("/weather/dust").then(d=>$("dust").textContent=(d.classification||d.level||d.status||"ok")),
  req("/weather/arabian-sea").then(d=>$("sea").innerHTML='النقاط المفحوصة: <b>'+esc(d.points_checked||d.points?.length||0)+'</b><br><small>'+esc(d.classification||"")+'</small>'),
  req("/admin/teachers").then(d=>$("teachers").innerHTML=(d.teachers||[]).map(x=>'<div class="item">'+esc(x.email)+' — '+(x.active?"نشط":"موقوف")+'</div>').join("")||"لا يوجد معلّمون"),
  req("/admin/knowledge/pending").then(d=>$("pending").innerHTML=(d.items||[]).map(x=>'<div class="item"><b>'+esc(x.subject)+'</b><br>'+esc(x.statement)+'<div class="row"><button onclick="review(\''+x.id+'\',\'approved\')">اعتماد</button><button class="danger" onclick="review(\''+x.id+'\',\'rejected\')">رفض</button></div></div>').join("")||"لا توجد عناصر معلقة"),
  req("/admin/audit").then(d=>$("audit").innerHTML=(d.events||[]).slice(0,30).map(x=>'<div class="item"><b>'+esc(x.action)+'</b> <small>'+esc(x.created_at)+'</small></div>').join("")||"لا يوجد سجل")
 ];await Promise.allSettled(jobs)
}
$("loginForm").onsubmit=async(e)=>{e.preventDefault();$("loginBtn").disabled=true;$("loginMsg").textContent="جارٍ تسجيل الدخول…";try{const d=await req("/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value.trim(),password:$("password").value})});token=d.access_token;sessionStorage.setItem("rasid_owner_token",token);$("loginMsg").textContent="تم تسجيل الدخول";await load()}catch(err){$("loginMsg").textContent=err.message||"تعذر تسجيل الدخول"}finally{$("loginBtn").disabled=false}};
$("logout").onclick=async()=>{try{await req("/auth/logout",{method:"POST"})}catch{}token="";sessionStorage.removeItem("rasid_owner_token");location.reload()};
$("aiOn").onclick=()=>setAI(true);$("aiOff").onclick=()=>setAI(false);async function setAI(enabled){if(!confirm(enabled?"تشغيل الذكاء الاصطناعي للزوار؟":"إيقاف الذكاء الاصطناعي؟"))return;await req("/admin/ai/settings",{method:"PATCH",body:JSON.stringify({enabled})});load()}
$("refresh").onclick=async()=>{if(!confirm("تحديث الموديلات الآن؟"))return;$("refresh").disabled=true;try{await req("/admin/weather/refresh",{method:"POST"});alert("تم تحديث الموديلات");load()}catch(e){alert(e.message)}finally{$("refresh").disabled=false}};
$("analyze").onclick=async()=>{try{await req("/admin/weather/analyze",{method:"POST"});alert("تم التحليل");load()}catch(e){alert(e.message)}};
$("addTeacher").onclick=async()=>{try{await req("/admin/teachers",{method:"POST",body:JSON.stringify({email:$("teacherEmail").value,password:$("teacherPassword").value})});$("teacherEmail").value="";$("teacherPassword").value="";load()}catch(e){alert(e.message)}};
window.review=async(id,status)=>{try{await req("/admin/knowledge/"+id+"/review",{method:"PATCH",body:JSON.stringify({status})});load()}catch(e){alert(e.message)}};
if(token)load();
</script></body></html>`;

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==="/"||url.pathname==="/owner")return new Response(ownerHtml,{headers:{"Content-Type":"text/html; charset=UTF-8","Cache-Control":"no-store","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer"}});
  if(url.pathname!=="/ai/chat")return base.fetch(request,env,ctx);
  if(request.method!=="POST")return json({detail:"الطريقة غير مسموحة"},405);
  const sql=postgres(env.HYPERDRIVE.connectionString,{max:1,fetch_types:false,prepare:true});
  try{
   const settings=await sql`SELECT key,value FROM system_settings WHERE key IN ('ai_enabled','visitor_ai_daily_limit')`;
   const s=Object.fromEntries(settings.map(x=>[x.key,x.value]));
   if(s.ai_enabled!=="true")return json({enabled:false,detail:"الذكاء الاصطناعي متوقف حاليًا"},503);
   if(!env.AI)return json({detail:"خدمة الذكاء الاصطناعي غير متاحة"},503);
   let d;try{d=await request.json()}catch{return json({detail:"الطلب غير صالح"},400)}
   const message=String(d?.message||"").trim();
   if(!message||message.length>1200)return json({detail:"اكتب سؤالًا من 1 إلى 1200 حرف"},400);
   const visitorKey=String(request.headers.get("CF-Ray")||request.headers.get("User-Agent")||"visitor").slice(0,200);
   const visitorHash=await sha256(visitorKey);
   const limit=Math.max(1,Math.min(100,Number(s.visitor_ai_daily_limit||10)));
   const usedRows=await sql`SELECT COUNT(*)::int AS n FROM ai_usage WHERE visitor_hash=${visitorHash} AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE+INTERVAL '1 day'`;
   const used=Number(usedRows[0]?.n||0);
   if(used>=limit)return json({detail:"تم الوصول إلى الحد اليومي",limit,remaining:0},429);
   const latest=await sql`SELECT summary,confidence,created_at FROM analysis_runs ORDER BY created_at DESC LIMIT 1`;
   const knowledge=await sql`SELECT subject,statement FROM knowledge_items WHERE status='approved' ORDER BY reviewed_at DESC NULLS LAST,created_at DESC LIMIT 20`;
   const context=[latest[0]?.summary?("آخر تحليل آلي: "+latest[0].summary+" الثقة: "+latest[0].confidence):"لا يوجد تحليل محفوظ.",...knowledge.map(x=>x.subject+": "+x.statement)].join("\n");
   const system="أنت مساعد راصد هدى للطقس في هدى وحبان بشبوة. أجب بالعربية البسيطة وباختصار. اعتمد فقط على بيانات الراصد والمعرفة المعتمدة التالية. لا تخترع توقعات أو نسبًا أو رصدًا غير موجود. إذا لم تكف البيانات فقل ذلك بوضوح. لا تعتبر مؤشرات بحر العرب إعصارًا مؤكدًا. البيانات:\n"+context;
   const out=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{messages:[{role:"system",content:system},{role:"user",content:message}],max_tokens:500,temperature:0.2});
   const answer=String(out?.response||"").trim();
   if(!answer)return json({detail:"لم تُنتج الخدمة إجابة"},502);
   await sql`INSERT INTO ai_usage(id,visitor_hash,created_at) VALUES(${crypto.randomUUID()},${visitorHash},NOW())`;
   return json({status:"ok",answer,limit,remaining:Math.max(0,limit-used-1)});
  }catch{return json({status:"error",detail:"تعذر تشغيل المساعد الآن"},500)}
  finally{try{await sql.end({timeout:1})}catch{}}
 }
};