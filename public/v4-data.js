// One browser-side store for the map, alerts and Arabian Sea local rain.
(()=>{'use strict';
 let latest=null,pending=null;
 async function region(force=false){
  const now=Date.now(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Aden',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(!force&&latest&&latest.rain?.start===day&&now-latest.rain.fetchedAt<3600000)return latest;
  if(pending)return pending;
  pending=(async()=>{const r=await fetch('./api/region',{cache:'no-store',signal:AbortSignal.timeout(80000)});if(!r.ok)throw Error('region_unavailable');const d=await r.json();if(d.schema!=='hada-region-v4'||!d.rain||d.assessment?.state!=='ready')throw Error('invalid_region');latest=d;window.dispatchEvent(new CustomEvent('hada:region',{detail:d}));return d;})().catch(error=>{window.dispatchEvent(new CustomEvent('hada:region-error'));throw error;}).finally(()=>{pending=null;});return pending;
 }
 window.HadaData={region,rain:async force=>(await region(force)).rain,get:()=>latest};
})();
