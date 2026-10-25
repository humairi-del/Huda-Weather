import {DurableObject} from 'cloudflare:workers';
import {Controller} from './controller.js';
import {config} from './registry.js';
// The coordination atom is ONE weather point. No users, secrets, notifications or alarms.
export class RasidCoordinator extends DurableObject {
 constructor(ctx,env){super(ctx,env);const sql=ctx.storage.sql;sql.exec('CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const get=key=>{const r=sql.exec('SELECT value FROM state WHERE key=?',key).toArray()[0];return r?JSON.parse(r.value):null;};
  const set=(key,value)=>sql.exec('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',key,JSON.stringify(value));
  const periods=now=>({day:new Intl.DateTimeFormat('en-CA',{timeZone:config.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)),hour:Math.floor(now/3600000),minute:Math.floor(now/60000)});
  const usage=now=>{const p=periods(now),row=get('usage')||{},out={};for(const k of Object.keys(p))out[k]=row[k]?.period===p[k]?row[k].units:0;return out;};
  const store={get,set,usage,reserve:(now,units)=>ctx.storage.transactionSync(()=>{const p=periods(now),u=usage(now);if(Object.keys(p).some(k=>u[k]+units>config.budget[k]))return false;set('usage',Object.fromEntries(Object.keys(p).map(k=>[k,{period:p[k],units:u[k]+units}])));return true;})};
  this.controller=new Controller(store,fetch,Date.now,p=>ctx.waitUntil(p));
 }
 async weather(){return this.controller.weather();}
 async previous(){return this.controller.previous();}
 status(){return this.controller.status();}
}
