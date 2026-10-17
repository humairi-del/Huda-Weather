const test=require('node:test'),assert=require('node:assert/strict'),alert=require('./wind-alert.js');
const now=Date.parse('2026-10-17T13:50:00+03:00');
test('tomorrow gust is not described as current or tonight wind',()=>{const s=alert({hourly:{time:['2026-10-17T16:00','2026-10-18T12:00'],wind_gusts_10m:[32.4,43.6]}},now);assert.match(s,/غدًا/);assert.match(s,/44/);assert.ok(!s.includes('رياح قوية'));});
test('past peaks, missing gusts and the end of the 24 hour window cannot trigger alerts',()=>{assert.equal(alert({hourly:{time:['2026-10-17T10:00','2026-10-17T16:00','2026-10-18T14:00'],wind_gusts_10m:[70,null,80]}},now),'');});
test('genuine zero and subthreshold values do not trigger gust alert',()=>{assert.equal(alert({hourly:{time:['2026-10-17T16:00'],wind_gusts_10m:[0]}},now),'');});
