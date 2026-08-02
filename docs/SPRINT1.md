# Sprint 1 notes

## Gaps closed in this sprint

- Clearer session states: `authenticated` / `unauthenticated` / `session_expired`
- TrustID errors: `trustid_unavailable`, `authorization_revoked`, `invalid_token`
- User-facing error banners (no raw server dumps)
- `ActivitySource` + `NotificationSource` composite adapters
- Frontend service modules (`lib/services.ts`) instead of inline hard-coded fetches
- Wallet responses marked `mock: true`
- Architecture tests under `apps/lifeos-api/test`

## Independence (verified by tests)

- LifeOS SQLite has no hospitality reservation/order tables
- Experiences load only from registry + approved origin
- Token Network is an injectable provider (`MockTokenNetworkProvider`)
