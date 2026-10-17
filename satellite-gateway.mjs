import {boundedBytes} from './weather-gateway.mjs';
// Latest provider-advertised frame for Shabwa; never label old imagery as live.
// Avoids WebGL and never substitutes forecast wind for an observation.
export function satelliteTime(now=Date.now()){return new Date(Math.floor((now-3*3600000)/3600000)*3600000).toISOString();}
export function satelliteURL(time){return 'https://view.eumetsat.int/geoserver/wms?'+new URLSearchParams({service:'WMS',version:'1.1.1',request:'GetMap',layers:'msg_iodc:ir108',styles:'',srs:'EPSG:4326',bbox:'45,13,49.5,16.8',width:'1000',height:'750',format:'image/png',time});}
export function latestSatelliteTime(xml,now=Date.now()){
 const marker='<Name>msg_iodc:ir108</Name>',start=xml.indexOf(marker);if(start<0)throw Error('satellite_layer');
 const layer=xml.slice(start,xml.indexOf('</Layer>',start));
 const dimension=layer.match(/<(?:Dimension|Extent)\b[^>]*name="time"[^>]*>/i)?.[0];
 const raw=dimension?.match(/default="([^"]+)"/)?.[1],time=Date.parse(raw);
 if(!Number.isFinite(time)||time>now||now-time>90*60000)throw Error('satellite_frame_age');
 return new Date(time).toISOString();
}
export async function satelliteGateway(request,{io=fetch,cache=globalThis.caches?.default,now=Date.now}={}){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const u=new URL(request.url);if(u.search)return Response.json({error:'invalid_query'},{status:400});
 let time;
 try{const c=await io('https://view.eumetsat.int/geoserver/wms?service=WMS&request=GetCapabilities',{signal:AbortSignal.timeout(8000),redirect:'manual'});if(!c.ok)throw Error('capabilities');time=latestSatelliteTime(new TextDecoder().decode(await boundedBytes(c,600000)),now());}catch{return Response.json({error:'satellite_time_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
 const key=new Request(u.origin+'/__satellite-shabwa-v2/'+encodeURIComponent(time));
 const reply=bytes=>new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public,max-age=900','X-Content-Type-Options':'nosniff','X-Hada-Requested-Time':time,'X-Hada-Source':'EUMETSAT Meteosat IODC IR10.8'}});
 try{const saved=await cache?.match(key);if(saved)return reply(await saved.arrayBuffer());}catch{}
 try{
  const r=await io(satelliteURL(time),{signal:AbortSignal.timeout(15000),redirect:'manual'});
  if(!r.ok||!r.headers.get('content-type')?.startsWith('image/png')){await r.body?.cancel();throw Error('satellite_source');}
  const bytes=await boundedBytes(r,2000000),sig=[137,80,78,71,13,10,26,10];
  if(bytes.length<24||!sig.every((v,i)=>bytes[i]===v))throw Error('invalid_png');
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(v.getUint32(16)!==1000||v.getUint32(20)!==750)throw Error('invalid_size');
  try{await cache?.put(key,new Response(bytes,{headers:{'Cache-Control':'public,max-age=3600'}}));}catch{}
  return reply(bytes);
 }catch{return Response.json({error:'satellite_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
