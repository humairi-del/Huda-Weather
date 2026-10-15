import {officialSources, officialDocument} from './cyclone-season-server.mjs';

// Pages preview only. No credentials, scheduled events, or notification sends.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
