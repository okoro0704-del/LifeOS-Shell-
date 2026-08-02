# LifeOS API

Base URL (dev): `http://localhost:8790`

All routes below (except auth bootstrap and health) require the `lifeos_session` cookie.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/session` | Exchange TrustID access token → LifeOS session |
| POST | `/auth/logout` | Destroy LifeOS session |
| GET | `/auth/status` | Session presence |

### POST `/auth/session`

```json
{ "accessToken": "<trustid access token>" }
```

Validates token with TrustID `GET /oauth/userinfo`, upserts LifeOS user by `trustId`, sets session cookie.

## Me / Profile

| Method | Path |
|--------|------|
| GET | `/me` |
| GET | `/profile` |
| PATCH | `/profile` |

## Wallet (via Token Network adapter)

| Method | Path |
|--------|------|
| GET | `/wallet` |
| GET | `/wallet/balance` |
| GET | `/wallet/transactions` |
| POST | `/wallet/send` |
| POST | `/wallet/pay` |

## Discover / Experiences

| Method | Path |
|--------|------|
| GET | `/discover` |
| GET | `/experiences` |
| GET | `/experiences/:id` |

## Activity / Notifications

| Method | Path |
|--------|------|
| GET | `/activity` |
| GET | `/notifications` |
| POST | `/notifications/:id/read` |

## Health

| Method | Path |
|--------|------|
| GET | `/health` |
