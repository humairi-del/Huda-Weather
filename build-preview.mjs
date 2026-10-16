import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
export const clientFiles = ['preview-redesign.html','qa-responsive.html','daily-bulletin.js','cyclone-season.js','sea-map-browser.mjs','sea-map-export.mjs','cyclone-pdf.mjs','cyclone-pdf-worker.mjs','cyclone-analysis.mjs','icon.svg','manifest.webmanifest','sw.js','OneSignalSDKWorker.js','sponsor-albaqira.jpg','stars-fix.js','star-details.js','redesign.js','redesign.css','rain-card.js','base-2.1.1.html','patch-2.2.js','dust-view-fix.js','sections-fix.js','prayer-7day.js'];
const mime = p => p.endsWith('.html') ? 'text/html; charset=utf-8' : /\.m?js$/.test(p) ? 'application/javascript; charset=utf-8' : p.endsWith('.css') ? 'text/css; charset=utf-8' : p.endsWith('.png') ? 'image/png' : p.endsWith('.json') ? 'application/json; charset=utf-8' : p.endsWith('.jpg') ? 'image/jpeg' : p.endsWith('.svg') ? 'image/svg+xml' : 'application/manifest+json';

// Self-contained deployment, matching the existing preview's packaging.
// Only these public client files are included; no credentials or send worker.
export async function buildPreview() {
  const assets = {};
  for (const file of clientFiles) assets['/'+file] = [(await readFile(path.join(root,file))).toString('base64'),mime(file)];
  assets['/'] = assets['/index.html'] = assets['/preview-redesign.html'];
  const server = (await readFile(path.join(root,'cyclone-season-server.mjs'),'utf8')).replace(/^export /gm,'');
  const gateway = (await readFile(path.join(root,'preview-worker.mjs'),'utf8')).replace(/^import[^\n]*\n/gm,'').replace('export default {','const gateway = {');
  const weather=(await readFile(path.join(root,'weather-gateway.mjs'),'utf8')).replace(/^export /gm,'');
  const satellite=(await readFile(path.join(root,'satellite-gateway.mjs'),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
  return server+'\n'+weather+'\n'+satellite+'\n'+gateway+'\nconst clientAssets='+JSON.stringify(assets)+`;\nexport default {async fetch(request){return gateway.fetch(request,{ASSETS:{async fetch(request){
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    const asset=clientAssets[new URL(request.url).pathname];
    if(!asset)return new Response('Not found',{status:404});
    const bytes=Uint8Array.from(atob(asset[0]),c=>c.charCodeAt(0));
    return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset[1],'Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }}});}};\n`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Output filename required');
  await writeFile(process.argv[2], await buildPreview());
}
