import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPNG} from './sea-map-export.mjs';
function platform(fail=''){
 const calls={revoked:[],draw:[],canvas:{}};
 class Image{set src(v){queueMicrotask(()=>{this.naturalWidth=1200;this.naturalHeight=1160;if(fail==='decode')this.onerror();else this.onload();});}}
 const env={Blob,Image,URL:{createObjectURL:()=> 'blob:test-map',revokeObjectURL:u=>calls.revoked.push(u)},document:{createElement:()=>Object.assign(calls.canvas,{getContext:()=>fail==='context'?null:{fillRect(){},drawImage(...args){calls.draw=args;}},toBlob:fn=>fn(fail==='encode'?null:new Blob(['test'],{type:'image/png'}))})}};
 return {env,calls};
}
test('PNG export uses a 2400 x 2320 canvas and releases its temporary SVG',async()=>{const{env,calls}=platform();assert.equal((await mapPNG('<svg></svg>',env)).type,'image/png');assert.equal(calls.canvas.width,2400);assert.equal(calls.canvas.height,2320);assert.equal(calls.draw.at(-2),2400);assert.deepEqual(calls.revoked,['blob:test-map']);});
test('failed decoding or PNG encoding cannot report a successful download or leak URLs',async()=>{for(const failure of ['decode','context','encode']){const{env,calls}=platform(failure);await assert.rejects(()=>mapPNG('<svg></svg>',env));assert.deepEqual(calls.revoked,['blob:test-map']);}});
test('export refuses invalid input before creating an image resource',async()=>{const{env,calls}=platform();await assert.rejects(()=>mapPNG('not a map',env),/invalid_map/);assert.equal(calls.revoked.length,0);});
