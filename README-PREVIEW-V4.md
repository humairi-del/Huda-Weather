# preview-v4 — Phase 1

This branch is an isolated review build. Do not merge into main or deploy a production route without the owner's later explicit release authorization.

- `public/` is the only editable frontend source. `scripts/build-assets.mjs` regenerates the ignored `workers/assets.generated.js` before every build/deploy. There is no manually maintained frontend bundle in `worker.js`.
- `workers/v4-entry.js` serves preview assets and read-only APIs. It never calls the production notification sender, never binds production KV, and has no schedules or custom domain routes.
- The map, regional sea summary and alerts consume the same `/api/region` rain snapshot and `public/region-model.js` assessment.
- Rain amounts use the equal-weight ECMWF/GFS/ICON mean. Probabilities are explicitly supplied by Open-Meteo's probability forecast, not inferred from amounts or model agreement. Regional probability means the maximum daily value among represented points, not the probability of a cyclone reaching an area.
- Shabwah is sampled within the existing boundary. Haban and Huda are point forecasts. Do not imply complete geographic coverage or infer storm attribution from rain.
- Current weather: 15-minute cache. Forecasts and regional alerts: 1 hour. Official sea bulletin: 6 hours, still subject to bulletin-age validation. Prayer calendar: checked every 6 hours, with the applicable day selected at midnight. Star cards: recalculated when the Yemen-local date changes.
- Historical official bulletins never become current alerts. Missing probabilities display as unavailable. Technical amounts, model names and numeric map live under expandable technical details.
- `npm test` validates shared assessment behavior; `npm run build` is a deployment dry run. `npm run deploy:preview` targets only `hada-weather-preview-v4` per this branch's config.

Existing production source modules remain preserved for later deliberate migration. They are not the active preview data/sending paths.
