# Hada regional multi-model map — preview 2.8.0

Scope: `redesign-hada-2026-10` and its separate Pages preview. The new `hada-sea-map-preview` Worker and its own KV namespace are independent of Rasid and the existing daily bulletin. Main, public website, Neon, recipients and notification schedules are unchanged.

The visitor sees exactly three choices: Arabian Sea status (official IMD interpretation); Shabwa/Habban/Huda local guidance; one Hada-branded regional precipitation map. No model-gallery dropdown, raw external map or full PDF picture in this section. Official text parsing and its conservative failure handling remain.

## Data and interpretation

- Open-Meteo numeric API, explicit ECMWF IFS 0.25°, GFS Global, ICON Global, GEM Global. AIFS was probed and returned null precipitation, so it is excluded, never treated as zero.
- Fixed 0.75-degree grid: 42–60E, 9–21N, 425 samples plus three local places. This is an interpolated regional comparison (~80 km spacing), not a fine-resolution local forecast.
- Three complete future Yemen calendar days (72 hours), starting midnight tomorrow. Start and exclusive end are printed; it is not a rolling next-72-hour claim. Source retrieval time is separate from model initialization (the latter is unavailable from this API).
- At each location add the three daily precipitation values for each model; take the median of valid model totals. Require at least three complete models, correct mm units, identical dates and UTC+3 offset at every cell. Reject the whole new edition if any cell fails; preserve the prior edition.
- Keep every model total. Hatching indicates max-minus-min >=20 mm and greater than the median. This is a transparent disagreement rule, not a probability or validated uncertainty envelope.
- Contours from d3-contour 4.0.2 (ISC license retained) and real governorate boundaries; all 22 labels, Atq/Habban/Huda markers. Exact original coordinates and requests are retained in source. Huda point is the existing project reference; Habban refers to the town near 14.3541N,47.0765E, not a similarly named town near Bayhan.
- Numeric median is a neutral comparison, not a calibrated optimal forecast or proof that one model is best. No cyclone center/track/landfall is inferred from rain colors. No generated weather artwork, blended screenshots, or reused Meteologix artwork.
- Local quantities represent sampled places; Atq is explicitly a local indicator, not a forecast for all Shabwa. No fabricated gust, arrival time, or impact statement.

## Scheduled refresh

Independent Worker `hada-sea-map-preview.humairi855.workers.dev`, KV `hada-sea-map-preview`, binding `SEA_MAP`. Cron `0 */6 * * *` (UTC), i.e. 3am,9am,3pm,9pm Yemen. 18 batches of <=24 locations, 4 models each, 16-second pause; one bounded retry. Maximum data-query timeout 25s. <=50 external subrequests and a 12-minute collection deadline within the 15-minute scheduled wall-time limit. Writes one complete latest JSON only after successful full validation; failure records an attempt without replacing the map. Public endpoints GET `/data` and `/health` only; no public refresh/write endpoint. Pages proxy has one fixed upstream and a 300KB cap. No visitor-generated paid queries.

Data is visibly marked delayed after nine hours and expired after its forecast period. Fetching every six hours does not mean all providers issue a new model run every six hours. First initial snapshot is fetched with the same requests and aggregate/validation functions; scheduled configuration is verified separately from an observed future cron execution.

## Attribution and reuse

- Forecast data: Open-Meteo, ECMWF, NOAA/NCEP GFS, DWD ICON, ECCC GEM, CC BY 4.0. https://open-meteo.com/en/docs
- Free Open-Meteo endpoint is for noncommercial evaluation. This implementation stays in the development preview. Commercial/public use for the sponsored site requires a suitable permitted data service; this does not silently license the public site.
- Yemen ADM1: geoBoundaries gbOpen, boundary ID YEM-ADM1-18629408 (2017 representation), source OpenStreetMap/Wambacher, ODbL 1.0. Exact source metadata and GeoJSON are provided, retaining database attribution and availability. https://www.geoboundaries.org/api/current/gbOpen/YEM/ADM1/
- Neighbor country outlines: Natural Earth 1:110m, public domain, https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson . Administrative boundaries are schematic, not a legal position.
- Map caption: متابعة وتجميع ورسم: طقس هدى — بمساعدة ChatGPT .

Build renderer: install `d3-contour@4.0.2`, `esbuild@0.28.2` (or compatible pinned versions), bundle `sea-map-render.mjs` with JSON loader for GeoJSON. The checked-in `sea-map-browser.mjs` is self-contained and is used directly by preview packaging. Worker uses only standard Fetch/KV APIs.


## Verified 16 October 2026, 12:10 UTC

- Initial real edition has all 425 grid cells and all three local places, with all four models complete at every point. 72-hour interval: 17 October 00:00 to 20 October 00:00 Yemen. Retrieved at 12:09:57 UTC. Initial numeric snapshot archived in sea-map-data/initial-2026-10-16.json.
- All 43 tests pass, including fixed source handling, period/units/null rejection, median/disagreement, complete coverage, cache read-only endpoints, all 22 labels, three exclusive visitor choices, and packaged page/modules.
- Pages deployment 2ed277f5-9dff-44a7-aecc-3c0b74e0e8f2 succeeded on the development branch. Browser verified official classification, all three choices, live map load (1200 x 1160), and preview version 2.8.0.
- The six-hour cron registration is confirmed. The next scheduled event is 18:00 UTC (9pm Yemen); it has not yet occurred. Do not describe the initial seed upload as an observed cron execution.

Final deployment ecab5e79-8e33-43ff-b356-a60b758cde21 succeeded at 12:13:05 UTC, from 802ba59475bdee79b94e0b5f0f63a4053fdbf8e8. It contains the same verified dataset gateway, with simpler local visitor text.


## 2.8.1-preview — map label cleanup
Moved the Gulf of Aden label from 49E,11N (over northern Somalia) to 48.5E,12.4N in open water. Removed other Yemeni governorate labels and Atq from the map; only Shabwa, Habban and Huda are labelled, with larger type and separated local callouts. All 22 governorate geometries remain. Country/sea context, rainfall values, source timestamps and six-hour schedule are retained. This is a renderer correction, not a fresh weather-data collection.
