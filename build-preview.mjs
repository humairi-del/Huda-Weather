import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {prepareOpenDataBundle} from './open-data-bridge.mjs';
import {build} from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));
export const clientFiles = ['wind-alert.js','preview-redesign.html','qa-responsive.html','preview-recovery.js','daily-bulletin.js','cyclone-season.js','sea-map-browser.mjs','sea-map-export.mjs','cyclone-pdf.mjs','cyclone-pdf-worker.mjs','cyclone-analysis.mjs','icon.svg','manifest.webmanifest','sw.js','OneSignalSDKWorker.js','sponsor-albaqira.jpg','stars-fix.js','star-details.js','redesign.js','redesign.css','rain-card.js','base-2.1.1.html','patch-2.2.js','dust-view-fix.js','sections-fix.js','prayer-7day.js'];
const mime = p => p.endsWith('.html') ? 'text/html; charset=utf-8' : /\.m?js$/.test(p) ? 'application/javascript; charset=utf-8' : p.endsWith('.css') ? 'text/css; charset=utf-8' : p.endsWith('.png') ? 'image/png' : p.endsWith('.json') ? 'application/json; charset=utf-8' : p.endsWith('.jpg') ? 'image/jpeg' : p.endsWith('.svg') ? 'image/svg+xml' : 'application/manifest+json';

// Self-contained deployment, matching the existing preview's packaging.
// Only these public client files are included; no credentials or send worker.
export async function buildPreview() {
  const assets = {};
  for (const file of clientFiles) assets['/'+file] = [(await readFile(path.join(root,file))).toString('base64'),mime(file)];
  for (const file of ['open-data-lab.html','open-data-lab.js','open-data-lab-qa.html']) assets['/'+file]=[(await readFile(path.join(root,file))).toString('base64'),mime(file)];
  const readSnapshot=async name=>JSON.parse(await readFile(path.join(root,'sea-map-data',name),'utf8'));
  const [local,aifs,region]=await Promise.all(['open-data-local-20261017.json','open-data-aifs-ens-20261017.json','open-data-region-20261017.json'].map(readSnapshot));
  const openDataBundle=prepareOpenDataBundle({local,aifs,region});
  const mapModule=await build({entryPoints:[path.join(root,'sea-map-render.mjs')],bundle:true,write:false,format:'esm',loader:{'.geojson':'json'},minify:true});
  const {renderMap}=await import('data:text/javascript;base64,'+Buffer.from(mapModule.outputFiles[0].text).toString('base64'));
  assets['/open-data-map.svg']=[Buffer.from(renderMap(region)).toString('base64'),'image/svg+xml'];
  assets['/'] = assets['/index.html'] = assets['/preview-redesign.html'];
  const server = (await readFile(path.join(root,'cyclone-season-server.mjs'),'utf8')).replace(/^export /gm,'');
  const gateway = (await readFile(path.join(root,'preview-worker.mjs'),'utf8')).replace(/^import[^\n]*\n/gm,'').replace('export default {','const gateway = {');
  const weather=(await readFile(path.join(root,'weather-gateway.mjs'),'utf8')).replace(/^export /gm,'');
  const satellite=(await readFile(path.join(root,'satellite-gateway.mjs'),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
  const openBridge=(await readFile(path.join(root,'open-data-bridge.mjs'),'utf8')).replace(/^export /gm,'');
  return server+'\n'+weather+'\n'+satellite+'\n'+openBridge+'\n'+gateway+'\nconst openDataBundle='+JSON.stringify(openDataBundle)+';\nconst clientAssets='+JSON.stringify(assets)+`;\nexport default {async fetch(request){return gateway.fetch(request,{OPEN_DATA_BUNDLE:openDataBundle,ASSETS:{async fetch(request){
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
