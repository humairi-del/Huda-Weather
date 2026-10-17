import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './preview-worker.mjs';
import {buildPreview} from './build-preview.mjs';

test('actual deployment bundle serves the unchanged page, PDF modules and push worker without asset bindings', async () => {
  const code = await buildPreview();
  const {default:bundle} = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  for(const [path,mime,marker] of [['/','text/html','2.9.1-preview'],['/preview-recovery.js','application/javascript','createTask'],['/cyclone-pdf.mjs','application/javascript','getDocument'],['/OneSignalSDKWorker.js','application/javascript','OneSignalSDK.sw.js']]) {
    const response=await bundle.fetch(new Request('https://preview.invalid'+path));
    assert.equal(response.status,200);
    assert.ok(response.headers.get('content-type').startsWith(mime));
    assert.ok((await response.text()).includes(marker));
  }
  assert.equal((await bundle.fetch(new Request('https://preview.invalid/not-a-file'))).status,404);
});

test('Pages gateway actually returns a verified official PDF and source header', async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response(calls.length === 1
      ? '<a href="/report.pdf">Tropical Weather Outlook</a>'
      : '%PDF-1.7\nvalid test bytes');
  };
  try {
    const response = await worker.fetch(new Request('https://preview.invalid/api/cyclone-document?kind=outlook'), {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/pdf');
    assert.equal(response.headers.get('x-hada-source'), 'https://rsmcnewdelhi.imd.gov.in/report.pdf');
    assert.match(await response.text(), /^%PDF-/);
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = previous; }
});

test('gateway preserves static assets and never treats a failed report as no cyclone', async () => {
  let assetCalls = 0;
  const env = {ASSETS:{fetch:async () => {assetCalls++; return new Response('unchanged asset');}}};
  assert.equal(await (await worker.fetch(new Request('https://preview.invalid/'), env)).text(), 'unchanged asset');
  const response = await worker.fetch(new Request('https://preview.invalid/api/cyclone-document?kind=https://evil.invalid'), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'invalid_report');
  assert.equal(assetCalls, 1);
  assert.equal((await worker.fetch(new Request('https://preview.invalid/api/cyclone-document', {method:'POST'}), env)).status, 405);
});
