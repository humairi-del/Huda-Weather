import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherGateway,weatherURL,boundedBytes} from './weather-gateway.mjs';
import {satelliteGateway,satelliteURL,satelliteTime,latestSatelliteTime} from './satellite-gateway.mjs';
const at=Date.parse('2026-10-16T13:50:00Z');
const data={utc_offset_seconds:10800,current:{temperature_2m:28},hourly:{time:Array(24).fill('2026-10-16T12:00')},daily:{time:Array(7).fill('2026-10-16')}};
function cacheStore(){const m=new Map();return {match:async k=>m.get(k.url)?.clone(),put:async(k,r)=>m.set(k.url,r.clone())};}
const req=k=>new Request('https://preview.invalid/api/weather?kind='+k);
test('fixed evaluation gateway rejects arbitrary targets, unknown kinds and writes',async()=>{
 for(const kind of ['current','dust','models','ensemble','clouds','dustForecast','dustWind'])assert.ok(weatherURL(kind).startsWith('https://'));
 assert.equal((await weatherGateway(req('evil'))).status,400);
 assert.equal((await weatherGateway(new Request('https://preview.invalid/api/weather?url=https://evil.invalid'))).status,400);
 assert.equal((await weatherGateway(new Request(req('current'),{method:'POST'}))).status,405);
});
test('live weather is validated and cached once; stale fallback keeps its original timestamp',async()=>{
 const cache=cacheStore();let calls=0;const io=async()=>{calls++;return Response.json(data);};
 const first=await (await weatherGateway(req('current'),{io,cache,now:()=>at})).json();assert.equal(first.current.temperature_2m,28);assert.equal(first._hada.stale,false);
 await weatherGateway(req('current'),{io,cache,now:()=>at+60000});assert.equal(calls,1);
 const broken=async()=>{throw Error('network');};
 const stale=await(await weatherGateway(req('current'),{io:broken,cache,now:()=>at+3600000})).json();assert.equal(stale._hada.stale,true);assert.equal(stale._hada.fetchedAt,first._hada.fetchedAt);
 assert.equal((await weatherGateway(req('current'),{io:broken,cache,now:()=>at+4*3600000})).status,503);
});
test('malformed or oversized responses never become successful weather or cached data',async()=>{
 const cache=cacheStore();assert.equal((await weatherGateway(req('current'),{cache,io:async()=>Response.json({error:true}),now:()=>at})).status,503);
 assert.equal((await weatherGateway(req('current'),{cache,io:async()=>new Response('x'.repeat(1200001)),now:()=>at})).status,503);
 await assert.rejects(()=>boundedBytes(new Response('12345'),4),/source_size/);
});
test('satellite selects one hourly historical frame and rejects non-images and wrong dimensions',async()=>{
 const time=satelliteTime(at);assert.equal(time,'2026-10-16T10:00:00.000Z');const u=new URL(satelliteURL(time));assert.equal(u.searchParams.get('bbox'),'45,13,49.5,16.8');assert.equal(u.searchParams.get('time'),time);
 const request=new Request('https://preview.invalid/api/satellite');
 assert.equal((await satelliteGateway(request,{io:async()=>new Response('<error/>'),now:()=>at})).status,503);
 const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);const v=new DataView(bytes.buffer);v.setUint32(16,1000);v.setUint32(20,750);
 const advertised=new Date(at-30*60000).toISOString();const io=async url=>String(url).includes('GetCapabilities')?new Response('<Layer><Name>msg_iodc:ir108</Name><Dimension name="time" default="'+advertised+'">x</Dimension></Layer>'):new Response(bytes,{headers:{'Content-Type':'image/png'}});
 const r=await satelliteGateway(request,{io,now:()=>at});assert.equal(r.status,200);assert.equal(r.headers.get('x-hada-requested-time'),advertised);
 v.setUint32(16,20);assert.equal((await satelliteGateway(request,{io,now:()=>at})).status,503);
});

test('satellite requires the advertised layer time and rejects stale or future frames',()=>{const xml=t=>'<Layer><Name>msg_iodc:ir108</Name><Dimension name="time" default="'+t+'"></Dimension></Layer>';assert.throws(()=>latestSatelliteTime(xml(new Date(at-2*3600000).toISOString()),at),/frame_age/);assert.throws(()=>latestSatelliteTime(xml(new Date(at+60000).toISOString()),at),/frame_age/);assert.throws(()=>latestSatelliteTime('<Layer/>',at),/layer/);});
