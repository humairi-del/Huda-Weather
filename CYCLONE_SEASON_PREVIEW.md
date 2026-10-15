# Arabian Sea cyclone-season desk — preview only

The desk is mounted inside the existing sea modal. Production, Rasid Hada, Neon and the daily-push scheduler are outside its scope.

- `cyclone-season.js` renders the desk and reads `/api/cyclone-sources` on opening the sea modal, at most once per 15 minutes in that page session unless the reader requests a refresh.
- `cyclone-season-server.mjs` fetches the fixed IMD/RSMC index, with a 12-second timeout and a 512 KiB body limit. Only HTTPS links on the two allowlisted official hosts can be returned. No user-provided URL is fetched.
- The API discovers links, not forecast content. Date strings come from report filenames where available. Fetch time and report issue time are displayed separately. Missing dates, old reports, inaccessible sources and the No_Cyclone track placeholder are explicit; failure must never be rendered as absence of risk.
- The current observer summary comes from the owner's screenshot, with account identity confirmed by the owner. Its publication time is unknown; only the chart's model run and validity times are known. It is not a live Facebook feed. After 48 hours since review it is labelled as an older update requiring review.
- The GFS chart is simulated infrared satellite imagery, not an observed satellite image, an official track, or proof of landfall. No track coordinates, storm name, intensity category, landfall time or local threat is synthesized from that screenshot or the existing sparse 72-hour point monitor.
- The new section has no cron, no secrets, no database, and sends no notifications. The existing 72-hour sea monitor remains separate and unchanged.

Deployment: the Pages preview entry embeds the existing page assets and the new client script/data. It bundles the exported server module into its Worker and routes only `GET /api/cyclone-sources` to `officialSources()`. All other known asset paths retain their existing static responses. Publish only to branch `redesign-hada-2026-10` of `hada-weather-aifs-preview`.

Validation: `node --test cyclone-season.test.mjs notification-controller.test.cjs daily-bulletin.test.cjs daily-bulletin-worker.test.mjs`.
