import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRelease,verifyRelease,BASELINE} from '../../release-preparation.mjs';
const source='<!DOCTYPE html><html><head><title>طقس هدى وما جاورها</title></head><body>keep</body></html>';
const entry={revision:2,payload:{title:'طقس هدى وما جاورها — جديد',body:'details'}};
test('prepare a single reversible, scoped site title change',()=>{
 const plan=prepareRelease('site',entry,source,{sourceSha:BASELINE.index});
 assert.equal(plan.ready,true);
 assert.equal(plan.changed,true);
 assert.ok(plan.patched.includes('<title>طقس هدى وما جاورها — جديد</title>'));
 assert.equal(plan.patched.replace(plan.after,plan.before),source);
 assert.equal(plan.rollback,source);
 assert.deepEqual(verifyRelease(plan,{section:'site',revision:2,sourceSha:BASELINE.index}),{reviewOnly:true,requiresExplicitApproval:true,changed:true});
});
test('reject HTML injection and changed baseline',()=>{
 const x=prepareRelease('site',{revision:1,payload:{title:'<script>alert(1)</script>',body:''}},source,{sourceSha:BASELINE.index});
 assert.ok(x.after.includes('&lt;script&gt;'));
 assert.ok(!x.after.includes('<script>'));
 assert.throws(()=>prepareRelease('site',entry,source,{sourceSha:'changed'}));
 assert.throws(()=>verifyRelease(x,{section:'site',revision:2,sourceSha:BASELINE.index}));
});
test('reject ambiguous title and unsupported sections',()=>{
 assert.throws(()=>prepareRelease('site',entry,source+source,{sourceSha:BASELINE.index}));
 assert.throws(()=>prepareRelease('unknown',entry,source,{sourceSha:BASELINE.index}));
 for(const section of ['prayers','alerts','modules']){
  const plan=prepareRelease(section,entry,source,{sourceSha:BASELINE.index});
  assert.equal(plan.ready,false);
  assert.equal(plan.patched,undefined);
 }
});
