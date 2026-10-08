import test from 'node:test';
import assert from 'node:assert/strict';
import {compileTitleProposal,BASELINE_INDEX_SHA} from '../../site-title-release.mjs';
const source='<!doctype html><html><head><title>طقس هدى وما جاورها</title></head><body>unchanged</body></html>';
const args={source,sourceSha:BASELINE_INDEX_SHA,revision:3,title:'طقس هدى الجديد'};
test('proposal updates only title and preserves exact rollback source',()=>{
 const result=compileTitleProposal(args);
 assert.equal(result.updatedSource,source.replace('طقس هدى وما جاورها','طقس هدى الجديد'));
 assert.equal(result.rollbackSource,source);
 assert.equal(result.publishAuthorized,false);
 assert.equal(result.requiresOwnerApproval,true);
 assert.equal(result.requiresFreshShaCheck,true);
 assert.equal(result.draftRevision,3);
});
test('unchanged title has no diff',()=>assert.equal(compileTitleProposal({...args,title:'طقس هدى وما جاورها'}).changed,false));
test('stale source SHA and malformed HTML fail closed',()=>{
 assert.throws(()=>compileTitleProposal({...args,sourceSha:'stale'}));
 assert.throws(()=>compileTitleProposal({...args,source:source+source}));
 assert.throws(()=>compileTitleProposal({...args,source:'no title'}));
});
test('invalid revisions and titles fail closed',()=>{
 for(const revision of [0,-1,1.5,'1'])assert.throws(()=>compileTitleProposal({...args,revision}));
 for(const title of ['', 'x'.repeat(121),'bad\nline'])assert.throws(()=>compileTitleProposal({...args,title}));
});
test('user-supplied markup is escaped, not injected',()=>{
 const result=compileTitleProposal({...args,title:'A & <script>alert(1)</script>'});
 assert.ok(result.after.includes('&lt;script&gt;'));
 assert.ok(!result.after.includes('<script>'));
});
