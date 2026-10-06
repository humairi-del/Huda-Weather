import postgres from "postgres";
import base from "./index.js";

const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const json=(body,status=200)=>Response.json(body,{status,headers});
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function sha256(v){return hex(await crypto.subtle.digest("SHA-256",enc.encode(v)))}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
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