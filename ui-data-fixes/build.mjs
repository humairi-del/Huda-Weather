import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.txt':'text/plain; charset=utf-8'};
const assets={},manifest={};
for(const name of (await fs.readdir(new URL('./public/',import.meta.url))).sort()){
 const bytes=await fs.readFile(new URL('./public/'+name,import.meta.url));
 const ext=name.slice(name.lastIndexOf('.'));
 assets['/'+name]={type:types[ext]||'application/octet-stream',base64:gzipSync(bytes).toString('base64')};
 manifest[name]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
await fs.writeFile(new URL('./assets.generated.mjs',import.meta.url),'export default '+JSON.stringify(assets)+';\n');
await fs.mkdir(new URL('./dist/',import.meta.url),{recursive:true});
await fs.copyFile(new URL('./assets.generated.mjs',import.meta.url),new URL('./dist/assets.generated.mjs',import.meta.url));
await fs.copyFile(new URL('./preview-handler.mjs',import.meta.url),new URL('./dist/preview-handler.mjs',import.meta.url));
await fs.writeFile(new URL('./dist/manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(new URL('./dist/entry.mjs',import.meta.url),"import assets from './assets.generated.mjs';import {handle} from './preview-handler.mjs';export default {fetch:(request,env)=>handle(request,assets,(url,options)=>env.PUBLIC_READ.fetch(new Request(url,options)))};\n");
console.log('Built read-only preview:',Object.keys(assets).length,'public assets');
