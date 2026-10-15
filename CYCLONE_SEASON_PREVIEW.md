# Arabian Sea lifecycle desk — 2.6.0-preview

Scope: redesign-hada-2026-10 and its stable Pages preview only. No main, public website, Rasid Hada, Neon, notifications, secrets or scheduled jobs changed.

Replaces all previous sea-point scores, fixed pseudo-route, embedded sea Windy and observer/manual Facebook snapshot. Main card has conservative classification, brief explanation, direction only if explicitly stated in the operational forecast, unconfirmed Shabwa/Huda impact, source chart, source/refresh timestamp and collapsible details.

Daily (7-day) and extended (two-week) official IMD PDF documents are read in the browser with locally bundled Mozilla PDF.js, pinned version in THIRD_PARTY_PDFJS.txt. First page is actually rendered, preserving overlaid dates and forecast annotations. Raw embedded PDF images are NOT used because the inspected report contained an older background template with current annotations layered on top.

A real official track PDF takes priority whenever available. A No_Cyclone placeholder is never shown as an actual track. Until a track exists the extended outlook first page is shown and clearly labelled as outlook, not a trajectory. No invented coordinates, center detection from winds, or drawn track.

Reports and links fetched on opening, user refresh, and every 15 minutes while the modal is open and page visible. This is automatic refresh during use, not an unattended background monitoring/alerting service. The official extended outlook is typically less frequent than the daily bulletin. No fake refreshed issue timestamps. Failed updates retain last successful display with visible failure time; source unavailability never means dissolution.

Text interpretation is deliberately conservative, deterministic and bounded: daily Arabian Sea section for an active depression/storm; operational extended forecast bullets mentioning Arabian Sea/Gulf of Aden for potential low formation/direction. Bay of Bengal, climatology, past verification and model-only tracks cannot become an active Arabian Sea classification. Full evidence and original links available in details. Ambiguous/new wording may require original-source reading. No automatic claim of impact, arrival or rain in Huda/Shabwa.

Document proxy accepts only three fixed kinds, discovers allowed official links itself, rejects redirects, enforces timeout, 4 MiB and PDF signature. PDF parsing refuses >12 pages and limits image size. API responses no-store. Rendering failure has explicit original-source fallback.
