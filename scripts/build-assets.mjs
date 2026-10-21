// public/ is the only editable asset source. Never commit the generated table.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.geojson':'application/geo+json','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8'};
const assets={};
async function visit(dir){for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,item.name);if(item.isDirectory())await visit(file);else{const data=await readFile(file);assets['/'+path.relative('public',file).split(path.sep).join('/') ]={type:types[path.extname(file)]||'application/octet-stream',base64:gzipSync(data,{level:9,mtime:0}).toString('base64'),gzip:true};}}}
await visit('public');await writeFile('workers/assets.generated.js','// Generated from public/. Do not edit.\nexport const assets='+JSON.stringify(assets)+';\n');console.log(`Prepared ${Object.keys(assets).length} canonical public assets.`);
