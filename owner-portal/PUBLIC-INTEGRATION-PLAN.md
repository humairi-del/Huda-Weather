# HADA Owner ↔ Public Weather: Safe Integration Contract (staging only)

Status: PREPARATION. No public publishing, DNS changes, production database writes, or main-branch changes.

## Confirmed public entrypoints (read-only inspected)
- Public site: https://hada-weather.com
- Repository: humairi-del/Huda-Weather, main
- Entry page: index.html dynamically loads base-2.1.1.html and patch scripts.
- Star presentation is currently affected by stars-fix.js; it is not a direct read from the owner D1 database.
- Prayer times have code in base-2.1.1.html and prayer-7day.js; draft text is not a validated schedule.
- Owner portal: owner-dev.hada-weather.com, separate Worker and D1 database, behind Cloudflare Access.

## Content mapping before any publish
| Owner data | Public consumer | Required adapter | Release policy |
|---|---|---|---|
| stars:<observer>:<season>:<index> | stars-fix.js / star display | explicit observer+season+index mapping, reconcile canonical names and dates | preview, validate, approve |
| site:draft | public site header/footer | extract whitelisted site fields from draft | preview, validate, approve |
| prayers:draft | prayer-7day.js / base page | structured verified prayer timetable, never raw text substitution | preview, validate, approve |
| alerts:draft | alert display | separate manually reviewed editorial text from automatic severe-weather alerts | preview, validate, approve |
| modules:draft | section toggles | typed boolean flags with safe defaults, not arbitrary script execution | preview, validate, approve |

## Required production-safe release flow
1. Owner signs in to Access-protected staging and saves draft.
2. Read current main revision and compute a proposed change against an exact pinned SHA.
3. Render a **read-only preview** of the proposed public change; show original and proposed values.
4. Validate dates, section schema, safe text escaping, and compatibility with existing site scripts.
5. Request explicit owner approval for the specific reviewed proposal (not blanket permission).
6. Create a proposed change on an isolated branch; run automated checks and mobile preview.
7. Publish only the approved change after independent health checks, with a backup and rollback target.
8. Verify the public website; if verification fails, restore the prior known-good revision.

## Hard safeguards
- Never allow public visitors to query owner-only D1 or audit records.
- Never expose Access JWTs, credentials, or internal owner APIs in the public page.
- No direct writes from draft saves to main, production Worker, or production DB.
- Use a fixed allowlist of publishable fields and destinations.
- Keep weather model output and automatic warnings separate from owner-edited text.
- No sponsor feature (canceled).
- Owner authorization code is consent, not login credentials.
- Avoid modifying existing public scripts until exact mapping and preview are verified.

## Outstanding blockers before full integration
- The existing owner drafts are free-form text; they are not yet structured publication payloads.
- Star labels and date baselines differ between owner portal and public stars-fix.js.
- No authenticated approval-to-release pipeline or rollback mechanism exists yet.
- No browser-level end-to-end test of public preview has been performed.

Next implementation: add a staging-only review interface with explicit comparison, then build typed adapters section by section. Do not enable public publishing until approved.
