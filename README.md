# LifeOS V1

Universal user shell for the TrustID ecosystem.

LifeOS is the **shell**. TrustID owns identity. Business OSs own their data.
The Token Network owns the ledger. LifeOS orchestrates the experience.

## Architecture

```text
                   TRUSTID
                Identity/Trust
                     │
                     │ OAuth 2.0 + PKCE
                     ▼
                  LIFEOS
                 User Shell
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   Token Network           Business OS
     (mock)              (mock HospitalityOS)
```

## Prerequisites

TrustID V1 must already be running:

| Service        | URL                     |
|----------------|-------------------------|
| TrustID PWA    | http://localhost:5173   |
| TrustID API    | http://localhost:8787   |

LifeOS reuses the seeded TrustID OAuth client `lifeos_mock_public`
(redirect `http://localhost:5174/callback`).

## Ports

| Service              | Port |
|----------------------|------|
| LifeOS Web (PWA)     | 5174 |
| LifeOS API           | 8790 |
| Mock HospitalityOS   | 5180 |

> **Port note:** TrustID’s old `mock-lifeos` also used `5174`. Stop it before starting
> LifeOS (`npm run dev:lifeos` in the TrustID repo) so OAuth redirects stay valid.

## Setup

```bash
# TrustID (separate repo)
cd "c:\Users\Hp\Desktop\TRUST ID"
npm run setup   # once
npm run dev:api
npm run dev:web

# LifeOS
cd "c:\Users\Hp\Desktop\LifeOS"
npm run setup   # once
npm run dev     # api + web + hospitality
# or separately:
# npm run dev:api
# npm run dev:web
# npm run dev:hospitality

# Tests
npm test
```

Open http://localhost:5174 → **Continue with TrustID**.

> Stop TrustID’s old `mock-lifeos` if it grabs port **5174**.

## Packages

| Package                    | Role                                      |
|----------------------------|-------------------------------------------|
| `@lifeos/shared`           | Shared types and constants                |
| `@lifeos/auth-client`      | TrustID OAuth + PKCE client               |
| `@lifeos/token-network`    | Token Network provider interface + mock   |
| `@lifeos/experience-sdk`   | Experience registry / origin validation   |
| `@lifeos/ui`               | Shared UI primitives                      |
| `@lifeos/api`              | LifeOS-only backend                       |
| `@lifeos/web`              | LifeOS PWA shell                          |
| `@lifeos/mock-hospitalityos` | Independent hotel experience            |

## Docs

- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [SECURITY.md](docs/SECURITY.md)
- [API.md](docs/API.md)
- [SPRINT1.md](docs/SPRINT1.md)
- [SPRINT2.md](docs/SPRINT2.md)
