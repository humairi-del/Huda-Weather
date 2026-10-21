const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const context={window:{}};vm.runInNewContext(fs.readFileSync('public/rain-language.js','utf8'),context);const f=context.window.HadaRainLanguage;
test('probability never implies intensity',()=>{assert.equal(f.brief(95,3),'فرصة مرتفعة للمطر');assert.equal(f.brief(40,61),'فرصة أمطار خفيفة متفرقة');assert.equal(f.brief(80,65),'أمطار غزيرة محتملة');});
test('missing and out-of-range probabilities stay unavailable',()=>{for(const p of [null,undefined,NaN,-1,101])assert.equal(f.probability(p),'الفرصة غير متاحة');});
test('zero rain probability does not imply clear skies',()=>{assert.equal(f.brief(0,0),'صحو غالبًا');assert.equal(f.brief(0,3),'لا تبرز فرصة مطر');});
