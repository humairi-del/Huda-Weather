const test=require('node:test'),assert=require('node:assert/strict');
const {createTask}=require('./preview-recovery.js');
test('failed updates retry with bounded backoff and a success resets the interval',async()=>{
 let at=0,ok=false,calls=0;const t=createTask(async()=>{calls++;return ok;},{now:()=>at});
 await t.tick();assert.equal(calls,0);at=60000;await t.tick();assert.equal(t.state().next,120000);
 at=120000;await t.tick();assert.equal(t.state().next,240000);at=240000;ok=true;await t.tick();assert.equal(t.state().next,1140000);assert.equal(t.state().failures,0);
});
test('offline or hidden sections and fresh data cannot cause background requests',async()=>{
 let allowed=false,fresh=false,calls=0;const t=createTask(async()=>{calls++;return true;},{now:()=>600000,allowed:()=>allowed,fresh:()=>fresh});
 await t.tick(true);assert.equal(calls,0);allowed=true;fresh=true;await t.tick();assert.equal(calls,0);await t.tick(true);assert.equal(calls,1);
});
test('overlapping events and rapid manual retries never duplicate requests',async()=>{
 let done,calls=0,at=60000;const t=createTask(()=>{calls++;return new Promise(r=>done=r);},{now:()=>at});
 const pending=t.tick(true);await t.tick(true);assert.equal(calls,1);done(true);await pending;await t.tick(true);assert.equal(calls,1);at+=10000;const again=t.tick(true);assert.equal(calls,2);done(true);await again;
});
test('a skipped or already running refresh is never reported as failed',async()=>{
 let at=0,calls=0;const outcomes=[];const t=createTask(async()=>{calls++;return null;},{now:()=>at});t.onResult(ok=>outcomes.push(ok));
 assert.equal(await t.tick(),null);at=60000;assert.equal(await t.tick(true),null);assert.equal(calls,1);assert.equal(t.state().failures,0);assert.deepEqual(outcomes,[]);assert.equal(await t.tick(true),null);assert.equal(calls,1);
});
test('a background success replaces the previous failure status',async()=>{
 let at=0,ok=false;const outcomes=[];const t=createTask(async()=>ok,{now:()=>at});t.onResult(value=>outcomes.push(value));
 at=60000;await t.tick();ok=true;at=120000;await t.tick();assert.deepEqual(outcomes,[false,true]);assert.equal(t.state().failures,0);
});
