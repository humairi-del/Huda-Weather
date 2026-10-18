// Additional private entrypoint; original morning HTTP and scheduled handlers unchanged.
import {WorkerEntrypoint} from 'cloudflare:workers';
import morning from './daily-bulletin-worker.mjs';
import {runHazard,subscriptionStatus,evaluate,health} from './hazard-preview-sender.mjs';
import {readOfficialBulletins} from './modern-preview/worker/index.mjs';
async function official(env){
 const key='hazard:v1:official-cache',cached=await env.BULLETINS.get(key,{type:'json'});
 if(cached?.schema==='hada-imd-cyclone-v1'&&Number.isFinite(cached.checkedAt)&&cached.checkedAt<=Date.now()&&Date.now()-cached.checkedAt<10*60000)return cached;
 const data=await readOfficialBulletins();
 await env.BULLETINS.put(key,JSON.stringify(data),{expirationTtl:900});return data;
}
export default morning;
export class HazardSender extends WorkerEntrypoint {
 async checkAndSend(){return runHazard(this.env,new Date(),fetch,()=>official(this.env));}
 async status(subscriptionId){return subscriptionStatus(this.env,subscriptionId);}
 async health(){return health(this.env);}
 async inspect(){return {...await evaluate(new Date(),fetch,()=>official(this.env)),sent:false};}
}
