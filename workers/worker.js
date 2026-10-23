import {publicStatus,runScheduled} from './notifications.js';
// Generated during the build; no separately maintained copies of public files.
var Lg={};var ms=0;
var HADA_INLINE_CSP='';
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/notifications/status'){if(request.method!=='GET')return new Response('Method not allowed',{status:405});return Response.json(await publicStatus(env),{headers:{'cache-control':'no-store'}});}
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const path=url.pathname==='/'?'/index.html':url.pathname,asset=Lg[path];if(!asset)return new Response('Not found',{status:404});
  const bytes=Uint8Array.from(atob(asset.base64),x=>x.charCodeAt(0)),body=asset.gzip?new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')):bytes;
  const headers={'content-type':asset.type,'cache-control':/\.(html|json|js|css)$/.test(path)?'no-cache':'public,max-age=86400','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(),microphone=(),geolocation=()'};
  if(path.endsWith('.html')){headers['x-robots-tag']='noindex,nofollow';headers['content-security-policy']="default-src 'self'; script-src 'self' "+HADA_INLINE_CSP+" https://cdn.onesignal.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org; connect-src 'self' https://api.aladhan.com https://*.onesignal.com https://cdn.onesignal.com; frame-src https://embed.windy.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; worker-src 'self' blob:";}
  return new Response(request.method==='HEAD'?null:body,{headers});
 },
 async scheduled(event,env,ctx){return runScheduled(event,env,ctx);}
};
