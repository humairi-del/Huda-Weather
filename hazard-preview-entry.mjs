// Additional private entrypoint; original morning HTTP and scheduled handlers unchanged.
import {WorkerEntrypoint} from 'cloudflare:workers';
import morning from './daily-bulletin-worker.mjs';
import {runHazard,subscriptionStatus,evaluate,health} from './hazard-preview-sender.mjs';
export default morning;
export class HazardSender extends WorkerEntrypoint {
 async checkAndSend(){return runHazard(this.env);}
 async status(subscriptionId){return subscriptionStatus(this.env,subscriptionId);}
 async health(){return health(this.env);}
 async inspect(){return {...await evaluate(),sent:false};}
}
