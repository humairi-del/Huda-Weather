import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildPreview} from './build-preview.mjs';

test('deployed five-image bulletin preserves original PNG bytes, provenance and identical forecast interval',async()=>{
 const manifest=JSON.parse(await readFile(new URL('./sea-charts/2026-10-16/manifest.json',import.meta.url),'utf8'));
 const code=await buildPreview();const {default:bundle}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 assert.equal(manifest.mode,'dated-bulletin');assert.equal(manifest.models.length,5);
 const identities={ecmwf:'ecmwf',gfs:'gfs',cmc:'gem',icon:'icon',aifs:'ec-aifs'},hashes=new Set();
 for(const entry of manifest.models){
  assert.equal(entry.sourceModel,identities[entry.id]);assert.equal(entry.runAt,'2026-10-16T00:00:00Z');assert.equal(entry.validAt,'2026-10-20T00:00:00Z');assert.equal(entry.forecastHours,96);
  assert.ok(entry.sourceImage.includes('/'+entry.sourceModel+'_apcpn_io_'));assert.equal(new URL(entry.sourceImage).hostname,'www.tropicaltidbits.com');
  const response=await bundle.fetch(new Request('https://preview.invalid'+entry.image));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,entry.bytes);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),1024);
  const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,entry.sha256);hashes.add(hash);
 }
 assert.equal(hashes.size,5);
});
