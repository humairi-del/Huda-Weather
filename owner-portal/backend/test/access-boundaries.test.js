import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('unauthenticated owner API requests never reach D1',async()=>{
 let calls=0;
 const env={DB:{prepare(){calls++;throw Error('unexpected database access')}},STAGING_HOST:'owner-dev.hada-weather.com'};
 for(const path of ['/api/me','/api/overview','/api/audit','/api/entries/site:draft']){
  const response=await worker.fetch(new Request('https://owner-dev.hada-weather.com'+path),env);
  assert.equal(response.status,401,path);
 }
 assert.equal(calls,0);
});

test('foreign origin is denied before owner data is read',async()=>{
 const env={DB:{prepare(){throw Error('unexpected database access')}},STAGING_HOST:'owner-dev.hada-weather.com'};
 const response=await worker.fetch(new Request('https://owner-dev.hada-weather.com/api/overview',{headers:{origin:'https://untrusted.example'}}),env);
 assert.equal(response.status,403);
});

test('production host cannot call the staging API',async()=>{
 const response=await worker.fetch(new Request('https://hada-weather.com/api/me'),{DB:{},STAGING_HOST:'owner-dev.hada-weather.com'});
 assert.equal(response.status,403);
});
