/* Preview-only Web Analytics. The beacon token is a public site identifier, not an API credential. */
(function () {
  'use strict';
  if (location.hostname !== 'hada-rasid-central-preview.humairi855.workers.dev') return;
  // One provider-owned pageview lifecycle; no manual events, retries, or SPA/anchor measurement.
  if (document.querySelector('script[data-cf-beacon], script[src^="https://static.cloudflareinsights.com/beacon.min.js"]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon', JSON.stringify({token: '42bec4905b924edeae2644761d6d0e4b', spa: false}));
  document.head.appendChild(script);
}());

