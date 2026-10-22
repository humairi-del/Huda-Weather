import app from './worker.js';
import {engineResponse} from './weather-engine.js';
import {quakesResponse} from './quakes.js';
export default {
 async fetch(request,env,ctx){const path=new URL(request.url).pathname;if(path==='/api/weather-engine')return engineResponse(request,ctx);if(path==='/api/quakes')return quakesResponse(request,ctx);return app.fetch(request,env,ctx);},
 scheduled(event,env,ctx){return app.scheduled(event,env,ctx);}
};
