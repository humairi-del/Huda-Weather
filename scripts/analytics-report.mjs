import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const config=JSON.parse(readFileSync(new URL('../docs/analytics/SOURCES.json',import.meta.url),'utf8'));
const DAY=86400000, OFFSET=config.utcOffsetMinutes*60000;
export function midnightUTC(day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw Error('Invalid calendar date');
  return Date.parse(day+'T00:00:00Z')-OFFSET;
}
export function yemenDay(utc){
  const time=Date.parse(utc);if(!Number.isFinite(time))throw Error('Invalid UTC timestamp');
  return new Date(time+OFFSET).toISOString().slice(0,10);
}
export function windowUTC(from,through,now=Date.now()){
  const start=midnightUTC(from),end=Math.min(midnightUTC(through)+DAY,now);
  if(start>=end||midnightUTC(through)<start||end-start>30*DAY)throw Error('Require a past/current range of at most 30 days');
  return {from:new Date(start).toISOString(),until:new Date(end).toISOString()};
}
export function makeQuery(scope,from,through,now=Date.now()){
  const s=config.scopes[scope];if(!s)throw Error('Unknown analytics scope');
  const w=windowUTC(from,through,now);
  const filter={siteTag:s.siteTag,requestHost:s.host,bot:0,datetime_geq:w.from,datetime_lt:w.until};
  const f=Object.entries(filter).map(([k,v])=>k+':'+JSON.stringify(v)).join(',');
  return {scope,host:s.host,siteTag:s.siteTag,timezone:config.timezone,windowUTC:w,query:`{viewer{accounts(filter:{accountTag:"1a16d4f178bae474099aa23095030294"}){rumPageloadEventsAdaptiveGroups(limit:10000,filter:{${f}},orderBy:[datetimeHour_ASC]){count sum{visits} avg{sampleInterval} dimensions{datetimeHour requestHost siteTag bot}}}}}`};
}
export function dailyReport(input){
  const {scope,from,through,asOf,rum,http}=input,s=config.scopes[scope];
  if(!s)throw Error('Unknown analytics scope');
  const w=windowUTC(from,through,Date.parse(asOf));
  if(!Number.isFinite(Date.parse(asOf)))throw Error('Invalid asOf');
  if(rum?.errors?.length)throw Error('Analytics source returned errors; do not replace with zero');
  const accounts=rum?.data?.viewer?.accounts;
  if(!Array.isArray(accounts)||accounts.length!==1||!Array.isArray(accounts[0].rumPageloadEventsAdaptiveGroups))throw Error('Missing analytics dataset');
  const rows=accounts[0].rumPageloadEventsAdaptiveGroups;
  if(rows.length>=10000)throw Error('Possible truncated result; split the query');
  const byDay=new Map();
  for(const r of rows){
    const d=r.dimensions||{},stamp=Date.parse(d.datetimeHour);
    if(d.requestHost!==s.host||d.siteTag!==s.siteTag||d.bot!==0)throw Error('Mixed scope or bot policy');
    if(!Number.isFinite(stamp)||stamp<Date.parse(w.from)||stamp>=Date.parse(w.until))throw Error('Row outside requested window');
    if(!Number.isFinite(r.count)||r.count<0||!Number.isFinite(r.sum?.visits)||r.sum.visits<0||!Number.isFinite(r.avg?.sampleInterval)||r.avg.sampleInterval<1)throw Error('Missing or invalid measurement');
    const day=yemenDay(d.datetimeHour),a=byDay.get(day)||{pageViews:0,visits:0,sampled:false};
    a.pageViews+=r.count;a.visits+=r.sum.visits;a.sampled ||= r.avg.sampleInterval>1;byDay.set(day,a);
  }
  // HTTP counts must come from a separate, explicitly scoped export. Never infer them from page views.
  if(http!=null&&(http.host!==s.host||http.timezone!==config.timezone||!Array.isArray(http.days)))throw Error('Invalid separate HTTP export');
  const days=[];
  for(let t=midnightUTC(from);t<=midnightUTC(through);t+=DAY){
    const day=yemenDay(new Date(t).toISOString()),a=byDay.get(day),network=http?.days.find(r=>r.day===day);
    if(network&&(!Number.isFinite(network.requests)||network.requests<0))throw Error('Invalid HTTP count');
    days.push({day,visits:a?.visits??null,pageViews:a?.pageViews??null,uniquePeople:null,httpRequests:network?.requests??null,sampled:a?.sampled??null,status:a?'recorded_only_not_guaranteed_complete':'no_records_not_proof_of_zero',partial:t+DAY>Date.parse(w.until)});
  }
  return {scope,host:s.host,timezone:config.timezone,windowUTC:w,botPolicy:'exclude_known_bots',definitions:{visits:'Cloudflare referrer-based visits; not unique people or timed sessions',pageViews:'Provider-owned document pageviews including reload; SPA measurement disabled',httpRequests:'Independent server request metric; never added to visits',uniquePeople:'Unavailable in this dataset'},days};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const result=process.argv[2]==='--query'?makeQuery(process.argv[3],process.argv[4],process.argv[5]):dailyReport(JSON.parse(readFileSync(0,'utf8')));
    console.log(JSON.stringify(result,null,2));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
