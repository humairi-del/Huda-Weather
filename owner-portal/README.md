# HADA owner portal — development only

This branch contains an isolated visual prototype at `owner-portal-preview.html` and an **un-deployed** Cloudflare Worker API scaffold under `owner-portal/backend`.

## Security boundary
- The static preview has NO authentication and NO production write access. Never publish it as a real admin console.
- Deploy the API only behind Cloudflare Access with a dedicated Access application; the Worker verifies the Access JWT signature, issuer and audience using the team's JWKS.
- Set `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, and `OWNER_EMAIL` securely. Optionally set `SPONSOR_EMAIL` for a rates-only account.
- Create a NEW D1 database, separate from the Rasid Hada production Neon database. Apply `backend/schema.sql` to that new database only.
- The Worker does not use cookies or permissive CORS; it rejects cross-origin requests and supports optimistic revisions using `If-Match`.
- API: `GET /api/me`, `GET /api/entries/:id`, `PUT /api/entries/:id`. IDs start with a section prefix, e.g. `stars:hassan:autumn:6` or `rates:aden`.
- Sponsor role is limited to `rates:*` read/update. Owner can read/update supported sections.
- No public read endpoint, no deletion, no publishing, and no connection to the existing site yet. These need separate approval, schema validation and integration testing.
- IMPORTANT: the current API is an architectural scaffold, NOT a security-audited production service. It requires stronger per-section validation, CSRF/origin policy for its actual hostname, rate limits, backup/restore tests, Access policy configuration, audit retention policy, and end-to-end tests before deployment.

## Next steps
1. Provision dedicated development D1 + Cloudflare Access (not production).
2. Wire the preview to the API only after authentication is configured.
3. Validate payload schemas for each section; enforce revision-safe updates and audit behavior under concurrency.
4. Add read-only site delivery, draft/review/publish workflow, rollback and backup.
5. Run functional and security tests, then deploy to an isolated staging URL.
6. Only after owner acceptance, plan production integration with the existing public site.

The original `main` branch must remain unchanged throughout development.
