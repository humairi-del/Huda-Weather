import test from 'node:test';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';
import {handle} from '../preview-handler.mjs';
test('preview blocks writes, service worker and notification endpoints',async()=>{
 for(const path of ['/api/notifications/status','/api/alert-status','/sw.js','/OneSignalSDKWorker.js'])assert.equal((await handle(new Request('https://preview.test'+path),{})).status,404);
 assert.equal((await handle(new Request('https://preview.test/api/hazards',{method:'POST'}),{})).status,405);
});
test('preview injects its marker without altering other markup and streams only allowed fixed-origin reads',async()=>{
 const html='<body><main>existing sections</main></body>',assets={'/index.html':{type:'text/html',base64:gzipSync(html).toString('base64')}};
 const r=await handle(new Request('https://preview.test/'),assets);assert.match(await r.text(),/<main>existing sections<\/main><script src=".\/preview-only.js"><\/script>/);assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
 let args;await handle(new Request('https://preview.test/api/hazards?ignored=1',{headers:{cookie:'private',authorization:'secret'}}),{},async(...x)=>{args=x;return new Response('{}',{headers:{'content-type':'application/json'}});});
 assert.equal(args[0],'https://hada-weather.com/api/hazards');assert.equal(args[1].headers.cookie,undefined);assert.equal(args[1].headers.authorization,undefined);
});
