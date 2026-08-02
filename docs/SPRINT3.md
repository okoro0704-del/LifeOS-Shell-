# LifeOS Sprint 3 — Secure Experience Session Protocol

## Summary

Replaced query-parameter experience handoff with signed, short-lived, scoped
**Experience Session Tokens**. HospitalityOS verifies LifeOS JWTs via JWKS,
creates its own local session, and never receives TrustID credentials.

## Ports

| Service | URL |
|---------|-----|
| LifeOS Web | http://localhost:5174 |
| LifeOS API | http://localhost:8790 |
| Mock HospitalityOS | http://localhost:5180 |
| TrustID | http://localhost:5173 / :8787 |

## Verification

```bash
npm test   # 34 passing (Sprint 1–3)
node --env-file=apps/lifeos-api/.env apps/lifeos-api/scripts/e2e-sprint3.mjs
```

Protocol reference: [experience-session-protocol.md](./experience-session-protocol.md)
