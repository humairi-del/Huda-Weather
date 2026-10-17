import {satelliteGateway} from './satellite-gateway.mjs';
import {weatherGateway} from './weather-gateway.mjs';
import {officialSources, officialDocument} from './cyclone-season-server.mjs';
import {openDataGateway} from './open-data-bridge.mjs';

// Pages preview only. No credentials, scheduled events, or notification sends.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if(url.pathname==='/api/open-data')return openDataGateway(request,env.OPEN_DATA_BUNDLE);
    if(url.pathname==='/api/satellite')return satelliteGateway(request);
    if(url.pathname==='/api/weather')return weatherGateway(request);
    if(url.pathname==='/api/sea-map'){
      if(request.method!=='GET')return new Response('Method not allowed',{status:405});
      try{const r=await fetch('https://hada-sea-map-preview.humairi855.workers.dev/data',{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('map_unavailable');const data=await r.text();if(data.length>300000)throw Error('map_size');return new Response(data,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'map_unavailable'},{status:503});}
    }
    if (url.pathname === '/api/cyclone-sources' || url.pathname === '/api/cyclone-document') {
      if (request.method !== 'GET') return new Response('Method not allowed', {status:405});
      try {
    if (url.pathname === '/api/cyclone-sources') {
          return Response.json(await officialSources(), {headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
        }
        return await officialDocument(url.searchParams.get('kind'));
      } catch (error) {
        const known = new Set(['invalid_report','report_unavailable','official_links_unavailable','official_source_unavailable','source_too_large','report_fetch_failed','report_too_large','invalid_pdf']);
        const code = known.has(error.message) ? error.message : error.name === 'TimeoutError' ? 'source_timeout' : 'source_request_failed';
        console.error(JSON.stringify({event:'cyclone_document',code}));
        return Response.json({error:code}, {status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
      }
    }
    return env.ASSETS.fetch(request);
  }
};
