# Isolated repair phase 1

Owner-approved scope is repair preparation and isolated preview only. Target hada-weather-repair-phase1 on branch repair-phase1-20261023. No main changes or production deployments, production Cloudflare setting changes, real notifications, OneSignal setting changes, Rasid Hada or Neon writes are authorized.

The build guard rejects production names/routes/cron, enabled sender flags and database/service bindings. Preview has no credentials and notification mode is simulate. The existing production reference and redacted rollback settings are in repair/production-baseline.json. Never store owner confirmation codes, credentials or private subscription identifiers in source or images.

Publication requires a later explicit owner approval and confirmation. Merge only reviewed source changes onto the current production base; never merge the preview Wrangler settings or build target guard into production.

Latest owner decisions (24 October 2026): eventual audience is all consenting subscribers; a single verified phone is only for a separately authorized first test. Important and manual notifications require owner approval, invalidated by edits or expiry. None of that enables sending in this repair preview. Emergency sends are blocked pending the owner approval workflow. Do not deploy owner-delivery.js as a permanent public-audience policy.
