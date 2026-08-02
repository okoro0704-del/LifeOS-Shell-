# LifeOS Experience Session Protocol

## Purpose

Allow independent business OSs (HospitalityOS, RealEstateOS, …) to authenticate a guest
into **their own** session using a **scoped, short-lived, signed** authorization from LifeOS —
without receiving TrustID credentials or LifeOS session cookies.

## Architecture

```text
TrustID  →  LifeOS session  →  ExperienceConnection (scopes)
                              →  ExperienceSession + one-time handoff
                              →  Business OS exchanges handoff
                              →  Verifies JWT via JWKS
                              →  Creates OS-local session
```

LifeOS is **not** the identity provider for every business OS. TrustID proves identity;
LifeOS authorizes the experience; each OS owns its session and data.

## Token format

- Algorithm: **EdDSA** (Ed25519)
- Header: `{ "alg": "EdDSA", "kid": "lifeos-key-2026-01", "typ": "JWT" }`
- Issuer (`iss`): `lifeos`
- Audience (`aud`): experience id (e.g. `exp_sunrise_hotel`)
- TTL: configurable, default **300 seconds**

### Claims

| Claim | Meaning |
|-------|---------|
| `sub` | LifeOS user id |
| `aud` | Target experience id |
| `sid` | Experience session id |
| `jti` | Unique token id (replay/revocation) |
| `experience_id` | Same as audience |
| `business_id` | Business registry id |
| `scopes` | Granted permissions from connection |
| `display_name` | Only if `profile.basic` granted |
| `iat` / `exp` | Issued / expiry |

Never included: TrustID access tokens, passwords, passkeys, wallet keys, BVN, documents.

## Key management

- Env: `EXPERIENCE_TOKEN_PRIVATE_KEY`, `EXPERIENCE_TOKEN_PUBLIC_KEY`, `EXPERIENCE_TOKEN_KID`
- Dev fallback: auto-generated `.keys/experience-ed25519.json` (gitignored)
- Abstraction: `ExperienceSigningKeyProvider`
- Public discovery: `GET /.well-known/experience-keys` (JWKS only)

## Launch / handoff

1. LifeOS creates `ExperienceSession` + one-time `handoff` code (hashed at rest).
2. Browser opens `{approvedOrigin}/auth/lifeos?handoff=…&experience_id=…`
3. Business OS `POST /experience-sessions/exchange` with `{ handoff, experienceId }`.
4. LifeOS consumes handoff (single use), returns signed JWT.
5. Business OS verifies JWT (signature, iss, aud, exp) via JWKS + introspects `jti`.
6. Business OS creates **its own** local session; LifeOS JWT is not needed by the UI thereafter.

Query parameters such as `?user=` / `?trustId=` / `?permissions=` **must not** authenticate.

## Revocation

Disconnecting an experience in LifeOS:

- Marks `ExperienceConnection` disconnected
- Revokes all active `ExperienceSession` rows for that user+experience
- Introspection returns `active: false`

## Logout (separate sessions)

| Action | Effect |
|--------|--------|
| LifeOS logout | Clears LifeOS HttpOnly session cookie. Does **not** automatically clear HospitalityOS `sessionStorage`. HospitalityOS should introspect `jti` and clear local session when inactive. |
| HospitalityOS logout | Clears HospitalityOS local session only. LifeOS remains signed in. |

LifeOS must not leave a long-lived business session that can be reused without re-verification. HospitalityOS binds local session lifetime to the LifeOS experience token `exp` and re-checks introspection on load.

## Additional permission requests

Business OS → `experience.request_permission` (postMessage) → LifeOS consent UI →
Grant (updates connection + new session) or Deny (audit only). Never auto-grant.

## postMessage bridge

`createExperienceBridge({ targetOrigin })` — messages only accepted from the registered
`approvedOrigin`. Never use `*`. Safe message types only (`lifeos.ready`, `experience.ready`,
`experience.request_permission`, …). No tokens or secrets in postMessage.

## Error codes

| Code | Meaning | User-facing |
|------|---------|-------------|
| `invalid_token` | Bad/unknown handoff or JWT | We couldn't securely connect to this experience. |
| `token_expired` | Past `exp` | This experience session has expired. Reopen the experience. |
| `wrong_audience` | Audience ≠ experience | This experience cannot use this session. |
| `revoked` | Session revoked | This experience session is no longer valid. |
| `replay_detected` | Handoff reused | We couldn't securely connect to this experience. |
| `permission_denied` | Missing required scope | This experience doesn't have the required permission. |

Never display raw JWT library errors to end users.

## Example exchange

```http
POST /experience-sessions/exchange
Content-Type: application/json

{ "handoff": "hof_…", "experienceId": "exp_sunrise_hotel" }
```

```json
{
  "token": "eyJ…",
  "token_type": "Bearer",
  "expires_at": "2026-08-02T05:30:00.000Z",
  "session_id": "cuid…",
  "scopes": ["profile.basic", "notifications"]
}
```

## Business OS integration checklist

1. Register experience + `approvedOrigin` in LifeOS registry.
2. Implement `/auth/lifeos` handoff receiver.
3. Exchange handoff with LifeOS; verify JWT with JWKS.
4. Create OS-local session; never store TrustID tokens.
5. On logout, clear local session only (LifeOS session is separate).
6. Introspect `jti` when loading protected routes; reject revoked sessions.
