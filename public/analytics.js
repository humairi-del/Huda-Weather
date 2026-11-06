/* The beacon token is a public site identifier, not an API credential. */
(function () {
  'use strict';
  if (location.hostname !== 'hada-weather.com') return;
  // Use one provider lifecycle. Full reloads remain pageviews; anchors are not measured.
  if (document.querySelector('script[data-cf-beacon], script[src^="https://static.cloudflareinsights.com/beacon.min.js"]')) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon', JSON.stringify({token: '350a509c62504a2c97dd7ced413410e1', spa: false}));
  document.head.appendChild(script);
}());

