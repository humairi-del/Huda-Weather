import core from '../../public/weather-core.js';
import bulletin from '../../public/daily-bulletin.js';
import calendar from '../../public/star-calendar.js';
import {boundedJson,readEngine,enrichEngine} from '../weather-engine.js';
import {config,sourceUrl} from './registry.js';
import {normalise,comparison,dust,attach} from './normalise.js';
export const estimateUnits=url=>{const p=new URL(url).searchParams,n=['current','hourly','daily'].reduce((sum,k)=>sum+(p.get(k)||'').split(',').filter(Boolean).length,0);return Math.max(1,Math.ceil(n/10))*Math.max(1,Math.ceil(Number(p.get('forecast_days')||7)/14));};
export function views(data,now){let morning=null;try{morning=bulletin.build(data,new Date(now),calendar);}catch{}return {asOf:now,currentFresh:core.currentFresh(data,now),nearestRain:core.nearestRain(data,now,config.minimumRainChance),alerts:core.alerts(data,now),card:core.cardData(data,calendar,now),morning};}
// One controller per location coordinator, never module-level request state.
export class Controller {
 constructor(store,fetcher=fetch,clock=Date.now,background=p=>p.catch(()=>{})){this.store=store;this.fetcher=fetcher;this.clock=clock;this.background=background;this.pending=null;this.enriching=null;this.previousPending=null;}
 async request(url,timeout=8000){
  const now=this.clock(),units=estimateUnits(url);if(!this.store.reserve(now,units))throw Error('usage_limit');
  try{return await boundedJson(await this.fetcher(url,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(timeout)}));}catch(e){throw Error(e.message==='usage_limit'?'usage_limit':e.name==='TimeoutError'||e.name==='AbortError'?'source_timeout':/^source_http_/.test(e.message)?e.message:'source_unavailable');}
 }
 async basic(){const started=this.clock();let error;for(const model of [null,'gfs_seamless']){try{return normalise(await this.request(sourceUrl('primary',model),7000),started,this.clock(),model||'best_match');}catch(e){error=e.message;if(error==='usage_limit')break;}}throw Error(error||'source_unavailable');}
 usable(data,now){return core.isFresh(data,now)&&data.engine.centralSchema==='hada-rasid-v1';}
 result(data){const now=this.clock();return {...data,engine:{...data.engine,views:views(data,now),usage:this.store.usage(now),cacheAgeMinutes:Math.max(0,(now-data.engine.fetchedAt)/60000)}};}
 async weather(){
  const now=this.clock(),cached=this.store.get('weather');
  if(this.usable(cached,now)&&now-cached.engine.fetchedAt<config.primaryTtlMs){this.startEnrichment(cached);return this.result(cached);}
  if(this.pending)return this.pending;
  const backoff=this.store.get('backoff');if(backoff?.until>now){if(this.usable(cached,now))return this.result({...cached,engine:{...cached.engine,staleCache:true,refreshError:backoff.reason}});throw Error(backoff.reason);}
  this.pending=(async()=>{try{
   let data=await this.basic();const previous=this.store.get('weather');if(this.usable(previous,this.clock())&&!core.acceptNewer(previous,data))return this.result(previous);
   this.store.set('weather',data);this.store.set('backoff',null);this.startEnrichment(data);return this.result(data);
  }catch(e){this.store.set('backoff',{until:this.clock()+60000,reason:e.message});if(this.usable(cached,this.clock()))return this.result({...cached,engine:{...cached.engine,staleCache:true,refreshError:e.message}});throw e;}finally{this.pending=null;}})();return this.pending;
 }
 startEnrichment(base){if(this.enriching)return;const now=this.clock(),attempt=this.store.get('enrichmentAttempt');if(attempt?.day===core.dayKey(now)&&now-attempt.at<60000)return;
  this.store.set('enrichmentAttempt',{day:core.dayKey(now),at:now});
  this.enriching=this.enrich(base).catch(()=>{}).finally(()=>{this.enriching=null;});this.background(this.enriching);
 }
 async enrich(base){
  const now=this.clock(),day=core.dayKey(now),modelsCached=this.store.get('models'),dustCached=this.store.get('dust');
  const modelsTask=modelsCached?.day===day&&now-modelsCached.at<config.comparisonTtlMs?Promise.resolve(modelsCached.rows):Promise.all(config.comparisonModels.map(async model=>{const at=this.clock();try{const row=comparison(await this.request(sourceUrl('comparison',model)),model,at);row.provenance.fetchedAt=this.clock();return row;}catch(e){return {model,available:false,reason:e.message};}})).then(rows=>{this.store.set('models',{at:this.clock(),day,rows});return rows;});
  const dustFailure=this.store.get('dustError');
  const dustTask=dustFailure&&now-dustFailure.at<600000?Promise.resolve(null):dustCached?.day===day&&now-dustCached.at<config.dustTtlMs?Promise.resolve(dustCached.data):(async()=>{const at=this.clock();try{const data=dust(await this.request(sourceUrl('dust')),at,this.clock());this.store.set('dust',{at:this.clock(),day,data});return data;}catch(e){this.store.set('dustError',{at:this.clock(),reason:e.message});return null;}})();
  const [models,dustData]=await Promise.all([modelsTask,dustTask]);const complete=attach(base,models,dustData),latest=this.store.get('weather');
  if(this.usable(complete,this.clock())&&(!latest||core.acceptNewer(latest,complete)))this.store.set('weather',complete);
 }
 async previous(){const now=this.clock(),cached=this.store.get('previous');if(core.isFresh(cached,now)&&now-cached.engine.fetchedAt<config.primaryTtlMs)return cached;if(this.previousPending)return this.previousPending;
  const backoff=this.store.get('previousBackoff');if(backoff>now)throw Error('previous_cooldown');
  this.previousPending=(async()=>{try{const fetcher=async(u)=>Response.json(await this.request(u));const data=await enrichEngine(await readEngine(now,fetcher),fetcher);this.store.set('previous',data);return data;}catch(e){this.store.set('previousBackoff',this.clock()+60000);throw e;}finally{this.previousPending=null;}})();return this.previousPending;
 }
 status(){const now=this.clock(),d=this.store.get('weather');return {schema:'hada-rasid-status-v1',location:config.id,mode:'isolated_preview',sending:false,updated:d?.engine?.fetchedAt??null,validTime:d?.current?.time??null,issuedAt:null,fresh:this.usable(d,now),models:d?.engine?.models?.map(({model,available,partial,reason})=>({model,available,partial,reason}))??[],usage:this.store.usage(now),dustError:this.store.get('dustError'),limits:config.budget};}
}
