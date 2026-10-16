import {boundedBytes} from './weather-gateway.mjs';
// Essential EUMETView imagery: one hourly frame, at least three hours old.
// Avoids WebGL and never substitutes forecast wind for an observation.
export function satelliteTime(now=Date.now()){return new Date(Math.floor((now-3*3600000)/3600000)*3600000).toISOString();}
export function satelliteURL(time){return 'https://view.eumetsat.int/geoserver/wms?'+new URLSearchParams({service:'WMS',version:'1.1.1',request:'GetMap',layers:'msg_iodc:ir108',styles:'',srs:'EPSG:4326',bbox:'40,8,60,23',width:'1000',height:'750',format:'image/png',time});}
export async function satelliteGateway(request,{io=fetch,cache=globalThis.caches?.default,now=Date.now}={}){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const u=new URL(request.url);if(u.search)return Response.json({error:'invalid_query'},{status:400});
 const time=satelliteTime(now()),key=new Request(u.origin+'/__satellite-cache-v1/'+encodeURIComponent(time));
 const reply=bytes=>new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public,max-age=900','X-Content-Type-Options':'nosniff','X-Hada-Requested-Time':time,'X-Hada-Source':'EUMETSAT Meteosat IODC IR10.8'}});
 try{const saved=await cache?.match(key);if(saved)return reply(await saved.arrayBuffer());}catch{}
 try{
  const r=await io(satelliteURL(time),{signal:AbortSignal.timeout(20000),redirect:'manual'});
  if(!r.ok||!r.headers.get('content-type')?.startsWith('image/png')){await r.body?.cancel();throw Error('satellite_source');}
  const bytes=await boundedBytes(r,2000000),sig=[137,80,78,71,13,10,26,10];
  if(bytes.length<24||!sig.every((v,i)=>bytes[i]===v))throw Error('invalid_png');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(v.getUint32(16)!==1000||v.getUint32(20)!==750)throw Error('invalid_size');
  try{await cache?.put(key,new Response(bytes,{headers:{'Cache-Control':'public,max-age=3600'}}));}catch{}
  return reply(bytes);
 }catch{return Response.json({error:'satellite_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
