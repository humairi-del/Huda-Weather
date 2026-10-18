const ORIGIN='https://hada-weather.com';
const READ_API=new Set(['/api/rain-consensus','/api/official-cyclone','/api/hazards']);
const PREVIEW_SCRIPT=`(()=>{const apply=()=>{const badge=document.querySelector('.preview');if(badge)badge.textContent='معاينة إصلاح البيانات • الموقع العام دون تغيير';const button=document.getElementById('activateUnifiedAlerts');if(button)button.disabled=true;const status=document.getElementById('unifiedAlertsStatus');if(status)status.textContent='هذه معاينة مستقلة؛ الإشعارات لا تُفعّل من هنا.';};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',apply):apply();})();`;
function headers(type){return {'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow','referrer-policy':'strict-origin-when-cross-origin'};}
export async function handle(request,assets,upstream=fetch){
 const url=new URL(request.url),path=url.pathname==='/'?'/index.html':url.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Read-only preview',{status:405,headers:{allow:'GET, HEAD'}});
 if(path==='/preview-only.js')return new Response(request.method==='HEAD'?null:PREVIEW_SCRIPT,{headers:headers('application/javascript; charset=utf-8')});
 if(path==='/robots.txt')return new Response('User-agent: *\nDisallow: /\n',{headers:headers('text/plain')});
 if(assets[path]){
  const asset=assets[path],bytes=Uint8Array.from(atob(asset.base64),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  let body=stream;
  if(path==='/index.html'){
   const html=await new Response(stream).text();
   body=html.replace('</body>','<script src="./preview-only.js"></script></body>');
  }
  return new Response(request.method==='HEAD'?null:body,{headers:headers(asset.type)});
 }
 const staticAsset=path==='/sponsor-albaqira.jpg'||/^\/icons\/[a-zA-Z0-9_-]+\.png$/.test(path);
 if(!READ_API.has(path)&&!staticAsset)return new Response('Not available in this preview',{status:404});
 // Public, fixed-origin GETs only. No cookies, authorization, write APIs,
 // notification endpoints, schedules, or bindings are forwarded.
 try{
  const response=await upstream(ORIGIN+path,{method:request.method,redirect:'manual',signal:AbortSignal.timeout(50000),headers:{accept:READ_API.has(path)?'application/json':'image/*'}});
  if(response.status>=300&&response.status<400)return new Response('Public data redirect blocked',{status:502,headers:headers('text/plain')});
  const type=response.headers.get('content-type')||(staticAsset?'application/octet-stream':'application/json');
  return new Response(response.body,{status:response.status,headers:headers(type)});
 }catch{return new Response('Public data unavailable',{status:503,headers:headers('text/plain')});}
}
