import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './preview-worker.mjs';

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
