# LifeOS V1 Security

## Authority model

- **TrustID** is the sole identity authority.
- LifeOS is a public OAuth client using Authorization Code + PKCE (`lifeos_mock_public`).
- LifeOS sessions are issued only after validating a TrustID access token via `/oauth/userinfo`.

## What LifeOS does not store

- Passwords
- TrustID private credentials, passkeys, recovery secrets
- Client secrets (public SPA client)
- Production API keys in frontend code

## Session handling

- HttpOnly, SameSite=Lax cookie `lifeos_session`
- Server-side session rows with expiry
- API routes require a valid LifeOS session (except auth bootstrap)

## Experience isolation

- External experiences load only if present in the experience registry with `status=active`
- Origin must match `approved_origin` exactly (scheme + host + port)
- No arbitrary iframe targets
- When an experience is unreachable, the shell remains usable and shows a clear error

## Assumptions (V1)

1. Local development uses HTTP on localhost — acceptable for V1 only.
2. TrustID access tokens are opaque and validated by calling TrustID; LifeOS does not parse JWTs.
3. Mock Token Network holds balances in-memory / seeded DB for demo — not custody-grade.
4. Mock HospitalityOS has no real booking backend or payment settlement.
5. Activity and notifications are presentation indexes, not authoritative event stores.
6. Refresh-token grant is not yet available on TrustID; expired tokens require re-auth.

## Known limitations

- Cross-origin experience postMessage permission protocol is stubbed for later.
- No CSP frame-ancestors hardening beyond origin allowlist checks.
- Offline PWA caches the shell only; external experiences and wallet are online-first.
- Revoking LifeOS in TrustID invalidates TrustID tokens; LifeOS should re-validate periodically (V1 checks on login and `/me` refresh via TrustID when a stored token is present).

## Environment secrets

Configure via `.env` files. Never commit production secrets.
