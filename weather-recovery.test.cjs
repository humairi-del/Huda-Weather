const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const page=fs.readFileSync(__dirname+'/preview-redesign.html','utf8');
const loader=page.slice(page.indexOf('async function loadWeather(){'),page.indexOf('\nfunction showWeatherSource(data)'));
function setup(sourceAge){
 const at=Date.parse('2026-10-17T05:00:00Z'),elements={},rendered=[];
 const data={current:{temperature_2m:23},hourly:{time:Array(24).fill('x')},daily:{time:Array(7).fill('2026-10-17')},_hada:{fetchedAt:new Date(at-sourceAge).toISOString()}};
 class Clock extends Date{static now(){return at;}}
 const c={Date:Clock,window:{},console:{error(){}},AbortSignal,fetch:async()=>{throw Error('offline');},localStorage:{getItem:()=>JSON.stringify({at,data})},document:{getElementById:id=>elements[id]??=( {textContent:'',innerHTML:''})}};
 for(const name of ['showCurrentWeather','showHourlyWeather','showWeeklyWeather','showBestRain','showObserverWeather','showWeatherAlerts','showWeatherSource'])c[name]=d=>rendered.push(d);
 vm.createContext(c);vm.runInContext('let weatherData=null;'+loader,c);return {c,elements,rendered,data};
}
test('re-saving an old forecast cannot extend its three-hour fallback lifetime',async()=>{
 const {c,rendered,elements}=setup(4*3600000);assert.equal(await c.loadWeather(),false);assert.equal(rendered.length,0);assert.match(elements.weatherDescription.innerHTML,/تعذر/);assert.equal(c.window.weatherRefreshBusy,false);
});
test('a valid saved forecast retains the source time and remains explicitly stale',async()=>{
 const {c,rendered,data}=setup(3600000);assert.equal(await c.loadWeather(),false);assert.ok(rendered.length>0);assert.equal(rendered[0]._hada.fetchedAt,data._hada.fetchedAt);assert.equal(rendered[0]._hada.stale,true);assert.equal(c.window.weatherRefreshBusy,false);
});
test('weather refresh cannot overlap an existing in-flight request',async()=>{
 const {c,rendered}=setup(3600000);c.window.weatherRefreshBusy=true;assert.equal(await c.loadWeather(),false);assert.equal(rendered.length,0);
});
