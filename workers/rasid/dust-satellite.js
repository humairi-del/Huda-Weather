// Fixed, public EUMETSAT Dust RGB product; no visitor-controlled upstream URLs.
export const PRODUCT={layer:'mtg_fd:rgb_dust',bounds:[40,10,54,23],width:560,height:520,step:600000,maxAge:3600000};
const endpoint='https://view.eumetsat.int/geoserver/wms';
export function parseDustTimes(xml,now=Date.now()){
 const layer=xml.match(/<Layer\b[^>]*>(?:(?!<Layer\b)[\s\S])*?<Name>mtg_fd:rgb_dust<\/Name>[\s\S]*?<\/Layer>/)?.[0];
 if(!layer)throw Error('missing_product');
 const dimension=layer.match(/<Dimension\b[^>]*name="time"[^>]*>([^<]+)<\/Dimension>/)?.[1];
 const parts=dimension?.trim().split('/'),end=parts?.length===3?Date.parse(parts[1]):NaN,start=parts?.length===3?Date.parse(parts[0]):NaN;
 if(!Number.isFinite(end)||!Number.isFinite(start)||parts[2]!=='PT10M'||end>now+300000||now-end>PRODUCT.maxAge)throw Error('stale_product');
 return Array.from({length:4},(_,i)=>end-(3-i)*PRODUCT.step).filter(t=>t>=start).map(t=>new Date(t).toISOString());
}
export function imageUrl(time){const u=new URL(endpoint);u.search=new URLSearchParams({service:'WMS',version:'1.1.1',request:'GetMap',layers:PRODUCT.layer,styles:'',srs:'EPSG:4326',bbox:PRODUCT.bounds.join(','),width:String(PRODUCT.width),height:String(PRODUCT.height),format:'image/png',time}).toString();return u.href;}
async function readMetadata(request,ctx,fetcher,cache,now){
 const key=new Request(new URL('/api/dust-satellite',request.url));const found=cache&&await cache.match(key);if(found){const data=await found.json();if(data.times?.length&&now-Date.parse(data.times.at(-1))<=PRODUCT.maxAge)return data;}
 const r=await fetcher(endpoint+'?service=WMS&request=GetCapabilities&version=1.3.0',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('metadata_failed');const xml=await r.text();if(xml.length>1500000)throw Error('metadata_large');
 const data={kind:'satellite_rgb',source:'EUMETSAT',product:PRODUCT.layer,attribution:'EUMETSAT, CC BY 4.0 — قص جغرافي',bounds:PRODUCT.bounds,times:parseDustTimes(xml,now),checkedAt:now,stormAtHuda:'unverified',arrivalAt:null};
 if(cache)ctx.waitUntil(cache.put(key,Response.json(data,{headers:{'cache-control':'public, max-age=300'}})));return data;
}
export async function dustSatelliteResponse(request,ctx,fetcher=fetch,cache=globalThis.caches?.default,now=Date.now()){
 const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET'}});
 try{
  const u=new URL(request.url),data=await readMetadata(request,ctx,fetcher,cache,now);
  if(u.pathname==='/api/dust-satellite')return Response.json(data,{headers});
  const time=u.searchParams.get('time');if(!data.times.includes(time))return Response.json({error:'frame_unavailable'},{status:400,headers});
  const key=new Request(new URL('/api/dust-satellite/image?time='+encodeURIComponent(time),request.url));const found=cache&&await cache.match(key);if(found)return found;
  const r=await fetcher(imageUrl(time),{signal:AbortSignal.timeout(15000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/png'))throw Error('image_failed');
  const bytes=await r.arrayBuffer(),signature=[137,80,78,71,13,10,26,10];if(bytes.byteLength>3000000||!signature.every((v,i)=>new Uint8Array(bytes)[i]===v))throw Error('invalid_image');
  const response=new Response(bytes,{headers:{'content-type':'image/png','cache-control':'public, max-age=600','x-content-type-options':'nosniff','x-satellite-time':time}});
  if(cache)ctx.waitUntil(cache.put(key,response.clone()));return response;
 }catch{return Response.json({error:'satellite_unavailable',message:'صور العواصف الرملية غير متاحة بوقت حديث؛ لا يمكن تأكيد الحالة قرب هدى.'},{status:503,headers});}
}
