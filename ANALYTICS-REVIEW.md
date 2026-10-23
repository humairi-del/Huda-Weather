# Visitor analytics preview

Cloudflare Web Analytics is manually installed on the preview only. Its separate analytics property is registered to `hada-weather-blocks-preview.humairi855.workers.dev`; preview traffic must never be sent to the production property.

The Worker injects one deferred beacon into the homepage only when the request hostname exactly matches WEB_ANALYTICS_HOST and WEB_ANALYTICS_TOKEN is a valid public beacon token. Missing settings disable injection. No cookies, IP addresses or visitor identifiers are stored by this application. Existing application scripts, notifications, routes and schedules are unchanged. CSP permits only the documented beacon script and telemetry endpoint in addition to existing permissions.

Production is NOT activated by this change. A separately approved production release must use its existing production property and the production hostname, preserve the production routing and notification configuration, and keep automatic injection disabled to prevent duplicate beacons. Never merge the preview Wrangler configuration into production.

Proposed new reporting period: 2026-10-24 00:00 Asia/Aden (2026-10-23 21:00 UTC). This is a reporting baseline, not a scheduled activation. Collection starts only after authorized production activation; earlier missing browser data cannot be reconstructed. Keep historical edge analytics. Visits and page views are distinct metrics and neither establishes an exact count of individual people.
