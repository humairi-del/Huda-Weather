# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Users
Arabic-speaking residents of Hada and nearby villages, including the owner Samer, who is not a programmer. Phone-first use on weak internet.
## Product Purpose
Understand local forecast, nearest future rain opportunity, prayers and two independent agricultural star calendars without technical clutter.
## Operating Context
Existing plain HTML/CSS/JavaScript application served from a Cloudflare Worker. Current isolated preview is hada-rasid-central-preview. Data are model forecasts; missing or old values must remain distinguishable.
## Capabilities and Constraints
Preserve all existing IDs, sources, forecast calculations, Rasid central engine, prayers, star tables, daily card and download, maps and earthquakes. Thaybi right, Qushar left. Preserve sponsor. No production/main changes, real notifications, new paid services, resurrected cancelled sections, or backend calculation changes. Dust stays in background and appears only as a concise supported weather alert.
## Brand Commitments
Arabic name طقس هدى وما جاورها. Existing logo and Albaqira sponsor image. Calm premium Arabic interface. 12-hour Yemen time. Visual direction was delegated in the detailed user request; no aesthetic answer was obtained from the optional question. First-screen weather emphasis is this session's assumption, not a standing user preference.
## Evidence on Hand
Current Rasid preview branch 386578a; source and provenance, real forecasts, 103 tests. No evidence of locally calibrated forecast accuracy. Arabian Sea and cumulative rain map were cancelled in repair/REQUESTS-AR.md; no restoration in this design.
## Product Principles
Keep data truthful; preserve working behavior; load external maps on demand; no fabricated claims; prioritize readable Arabic and touch controls.
## Accessibility & Inclusion
RTL, readable Arabic, visible focus, comfortably sized touch controls, sufficient contrast, reduced motion, honest loading and missing-data states.
