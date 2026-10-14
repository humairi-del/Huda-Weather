const test=require('node:test'),assert=require('node:assert/strict');
const {build,dayKey}=require('./daily-bulletin.js');
const now=new Date('2026-10-14T04:00:00Z');
function data(date='2026-10-14'){const time=Array.from({length:24},(_,i)=>date+'T'+String(i).padStart(2,'0')+':00');return{daily:{time:[date],temperature_2m_min:[18],temperature_2m_max:[31],precipitation_probability_max:[55],precipitation_sum:[2],wind_gusts_10m_max:[46]},hourly:{time,temperature_2m:time.map((_,i)=>18+i/2),precipitation_probability:time.map((_,i)=>i===3?100:i===14?55:0),precipitation:time.map(()=>0),weather_code:time.map(()=>0),wind_speed_10m:time.map(()=>12),wind_gusts_10m:time.map(()=>46)}};}
test('Yemen calendar changes at 9 pm UTC regardless of browser timezone',()=>{assert.equal(dayKey(new Date('2026-10-14T21:01:00Z')),'2026-10-15');});
test('full day groups all 24 hours once and uses today daily values',()=>{const b=build(data(),now);assert.equal(b.complete,true);assert.deepEqual(b.periods.map(p=>p.count),[6,6,3,9]);assert.equal(b.min,18);assert.equal(b.max,31);assert.match(b.pushText,/55٪/);});
test('past rain peak is excluded from upcoming rain window',()=>{assert.equal(build(data(),now).bestRain.hour,14);});
test('outdated forecast cannot be presented as today',()=>{assert.throws(()=>build(data('2026-10-13'),now),/today-unavailable/);});
test('missing values stay missing rather than becoming zero',()=>{const d=data();d.daily.temperature_2m_min=[null];d.daily.precipitation_sum=[null];d.hourly.temperature_2m=Array(24).fill(null);const b=build(d,now);assert.equal(b.min,null);assert.equal(b.rain,null);assert.equal(b.periods[0].temp,null);assert.match(b.pushText,/الحرارة غير متاحة/);});
test('partial forecast is explicitly incomplete',()=>{const d=data();d.hourly.time=d.hourly.time.slice(0,12);assert.equal(build(d,now).complete,false);});
test('thunderstorm forecast generates an explicit watch message',()=>{const d=data();d.hourly.weather_code[15]=95;const b=build(d,now);assert.match(b.periods[1].description,/رعدية/);assert.ok(b.notices.some(s=>s.includes('رعدية')));});
test('late-day bulletin does not reuse next-day weather as today',()=>{const b=build(data(),new Date('2026-10-14T20:59:00Z'));assert.equal(b.bestRain,null);});
