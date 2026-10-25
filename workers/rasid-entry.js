import app from './worker.js';
import {dustSatelliteResponse} from './rasid/dust-satellite.js';
import {quakesResponse} from './quakes.js';
import {config} from './rasid/registry.js';
export {RasidCoordinator} from './rasid/coordinator.js';
export default {
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(['/api/rasid-weather','/api/rasid-status','/api/weather-engine'].includes(path)){
   if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
   const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};if(request.method==='HEAD')return new Response(null,{headers});
   try{const c=env.RASID_COORDINATOR.getByName(config.id);const data=path==='/api/rasid-status'?await c.status():path==='/api/weather-engine'?await c.previous():await c.weather();return Response.json(data,{headers});}
   catch{return Response.json({error:'weather_unavailable',message:'تعذر توفير بيانات طقس حديثة الآن؛ لا يعني ذلك استقرار الأجواء.'},{status:503,headers});}
  }
  if(['/api/dust-satellite','/api/dust-satellite/image'].includes(path))return dustSatelliteResponse(request,ctx);
  if(path==='/api/quakes')return quakesResponse(request,ctx);
  // Sending stays disabled, irrespective of accidentally supplied bindings.
  if(path==='/api/notifications/status')return Response.json({ready:false,channels:{morning:false,emergency:false},mode:'isolated_preview'},{headers:{'cache-control':'no-store'}});
  return app.fetch(request,{NOTIFICATION_MODE:'simulate',PUBLIC_NOTIFICATIONS_ENABLED:'0',PUBLIC_SCHEDULE_ENABLED:'0'},ctx);
 }
};
