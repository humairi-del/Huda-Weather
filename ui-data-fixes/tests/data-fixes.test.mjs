import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const initial=Date.parse('2026-10-19T12:30:00+03:00');
function rain(){const context={window:{},Intl,Date,document:{getElementById:()=>null}};vm.runInNewContext(read('rain-period.js'),context);return context.window.HadaRainPeriod;}
test('keeps the current hour and excludes a finished peak',()=>{
 const h={time:['2026-10-19T11:00','2026-10-19T12:00','2026-10-19T13:00'],precipitation_probability:[100,80,40],precipitation:[5,2,1]};
 const api=rain(),best=api.select(h,initial);assert.equal(best.probability,80);assert.equal(best.current,true);assert.match(api.view(h,initial).note,/تشمل الجزء/);
 assert.equal(api.select(h,Date.parse('2026-10-19T13:00:00+03:00')).probability,40);
});
test('equal probabilities prefer the earliest unfinished hour; missing values remain missing',()=>{
 const h={time:['2026-10-19T13:00','2026-10-19T14:00','2026-10-19T15:00'],precipitation_probability:[null,60,60],precipitation:[1,null,10]};
 const best=rain().select(h,initial);assert.equal(best.start,Date.parse('2026-10-19T14:00:00+03:00'));assert.equal(best.amount,null);assert.match(rain().view(h,initial).note,/كمية المطر غير متاحة/);
});
test('shows full date and 12-hour times across midnight and no invented rain on empty or zero data',()=>{
 const h={time:['2026-10-19T23:00'],precipitation_probability:[70],precipitation:[0.5]};
 const view=rain().view(h,initial);assert.match(view.period,/٢٠ أكتوبر ٢٠٢٦/);assert.match(view.period,/م/);assert.match(view.period,/ص/);
 assert.equal(rain().select({time:['2026-10-19T14:00'],precipitation_probability:[null]},initial),null);
 assert.match(rain().view({time:['2026-10-19T14:00'],precipitation_probability:[0]},initial).note,/لا تظهر فرصة/);
});
function weatherFixture(){
 return {timezone:'Asia/Aden',current_units:{temperature_2m:'°C'},daily_units:{precipitation_sum:'mm'},
 current:{temperature_2m:30,relative_humidity_2m:40,wind_speed_10m:5,wind_direction_10m:270,weather_code:0,time:'2026-10-19T12:30',precipitation:0},
 daily:{time:Array.from({length:7},(_,i)=>'2026-10-'+(19+i)),weather_code:Array(7).fill(0),temperature_2m_max:Array(7).fill(32),temperature_2m_min:Array(7).fill(20),precipitation_probability_max:Array(7).fill(60)},
 hourly:{time:['2026-10-19T12:00','2026-10-19T13:00'],temperature_2m:[30,31],precipitation_probability:[80,40],weather_code:[0,0],uv_index:[3,4],precipitation:[1,0.5]}};
}
function harness(responses,initialNow=initial){
 const clock={value:initialNow},nodes=new Map(),timers=new Map(),intervals=[],calls=[];let seq=0;
 class Element{
  constructor(){this.children=[];this.dataset={};this.hidden=false;this.attributes={};this.value='';this.disabled=false;}
  set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}
  set textContent(v){this.value=String(v);this.children=[];}get textContent(){return this.value+this.children.map(x=>typeof x==='string'?x:x.textContent).join('');}
  replaceChildren(...children){this.value='';this.children=children;}
  append(...children){this.children.push(...children);}appendChild(x){this.children.push(x);return x;}
  setAttribute(k,v){this.attributes[k]=v;}addEventListener(){}
 }
 for(const id of ['liveTemperature','liveCondition','liveRange','liveWeatherIcon','liveHumidity','liveWind','liveRain','liveUv','weather-alert','alert-title','alert-description','current','outlook','bestRainValue','bestRainDay','bestRainNote']){const n=new Element();n.id=id;}
 const timeline=new Element(),week=new Element();
 const document={hidden:false,getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),addEventListener(){},querySelector:s=>s==='.timeline'?timeline:s==='.week'?week:s==='[data-period][aria-selected="true"]'?{dataset:{period:'today'}}:null};
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.value]));}static now(){return clock.value;}}
 const window={HadaOutlookMessages:{today:'',tomorrow:'',week:''},HadaMonitorPanels:{},addEventListener(){},dispatchEvent(){}};
 const context={window,document,Date:ClockDate,Intl,URL,URLSearchParams,AbortController,CustomEvent:class{},console,
 localStorage:{getItem:()=>null,setItem(){}},
 setTimeout:(f,delay)=>{timers.set(++seq,{f,delay});return seq;},clearTimeout:id=>timers.delete(id),setInterval:f=>intervals.push(f),
 fetch:async url=>{calls.push(url);const r=responses.shift();if(r instanceof Error||!r)throw r||Error('offline');return {ok:true,json:async()=>r};}};
 vm.createContext(context);vm.runInContext(read('rain-period.js'),context);vm.runInContext(read('live-weather.js'),context);
 return {window,nodes,clock,timers,intervals,calls,settle:()=>window.HadaLiveWeather.refresh()};
}
test('first failure offers retry in 10 seconds, recovers, and prevents parallel requests',async()=>{
 const h=harness([Error('offline'),weatherFixture()]);await h.settle();assert.equal(h.calls.length,1);assert.match(h.nodes.get('liveWeatherConnection').textContent,/إعادة المحاولة/);
 assert.equal(h.nodes.get('liveTemperature').textContent,'—');assert.ok([...h.timers.values()].some(t=>t.delay===10000));
 h.clock.value+=10000;await Promise.all([h.window.HadaLiveWeather.refresh(),h.window.HadaLiveWeather.refresh()]);assert.equal(h.calls.length,2);
 assert.notEqual(h.nodes.get('liveTemperature').textContent,'—');assert.equal(h.nodes.get('liveWeatherConnection').hidden,true);
});
test('after a failed refresh, expired cached values and every outlook tab are cleared',async()=>{
 const h=harness([weatherFixture(),Error('offline')]);await h.settle();h.clock.value+=16*60000;await h.window.HadaLiveWeather.refresh();
 assert.match(h.nodes.get('liveWeatherConnection').textContent,/محفوظة/);assert.notEqual(h.nodes.get('liveTemperature').textContent,'—');
 h.clock.value=initial+46*60000;await h.window.HadaLiveWeather.refresh();assert.equal(h.nodes.get('liveTemperature').textContent,'—');
 for(const key of ['today','tomorrow','week'])assert.match(h.window.HadaOutlookMessages[key],/غير متاحة/);
 assert.match(h.nodes.get('bestRainDay').textContent,/غير متاحة/);
});
test('today probability includes the current hour and retry delays are bounded',async()=>{
 const h=harness([weatherFixture()]);await h.settle();assert.equal(h.window.HadaLiveWeather.dayChance(weatherFixture(),'2026-10-19',initial),80);
 assert.deepEqual([1,2,3,4,99].map(h.window.HadaLiveWeather.retryDelay),[10000,30000,60000,300000,300000]);
});
test('the minute tick advances the selected hour without fetching another forecast',async()=>{
 const h=harness([weatherFixture()],Date.parse('2026-10-19T12:59:00+03:00'));await h.settle();assert.equal(h.nodes.get('bestRainValue').textContent,'٨٠٪');
 h.clock.value=Date.parse('2026-10-19T13:00:00+03:00');for(const tick of h.intervals)tick();
 assert.equal(h.nodes.get('bestRainValue').textContent,'٤٠٪');assert.equal(h.calls.length,1);
});
