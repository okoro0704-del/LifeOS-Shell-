# LifeOS V1 Architecture

## Principle

> LifeOS is the shell. Individual OSs own their business logic and data.

LifeOS does **not**:

- Create an independent consumer identity (TrustID does)
- Store hotel reservations, restaurant orders, or property records
- Own the token ledger
- Embed business OS backends inside the LifeOS database

## Systems boundary

| System | Owns | Does not own |
|--------|------|--------------|
| TrustID | Identity, passkeys, OAuth, devices, audit | LifeOS preferences, wallet ledger, bookings |
| LifeOS | Shell UI, LifeOS profile/prefs, experience registry index, activity aggregation, notifications index | Business workflows, token custody |
| Token Network (mock) | Balance, transactions (via adapter) | Identity, bookings |
| HospitalityOS (mock) | Rooms, bookings UI, hotel UX | TrustID credentials, LifeOS prefs |

## Auth flow

```text
User → LifeOS → Continue with TrustID
     → TrustID OAuth authorize (PKCE)
     → User authenticates + consents
     → Callback with code
     → Exchange for access_token
     → LifeOS API validates via TrustID /oauth/userinfo
     → Upsert lifeos_users by trustId (TD-…)
     → Issue LifeOS session cookie
```

LifeOS never stores passwords or TrustID private credentials.

## Experience loading

```text
Discover → Experience Registry (approved origins only)
        → ExperienceViewer (iframe / navigation)
        → Independent Business OS PWA
```

Arbitrary URLs are rejected. Only registered `approved_origin` values load.

## Token Network

```text
LifeOS UI → TokenNetworkProvider interface → MockTokenNetworkProvider
                                          → (later) RealTokenNetworkProvider
```

UI components never hard-code ledger logic.

## Data that belongs in LifeOS

- `lifeos_users` / profiles / preferences
- `experience_registry` / business directory metadata
- `notifications` (presentation copies)
- `activity_index` (aggregated pointers, not source of truth)
- LifeOS sessions

## Data that does NOT belong in LifeOS

- `hotel_reservations`
- `restaurant_orders`
- `property_records`
- `finance_accounts`
- Token ledger balances as source of truth
- TrustID credentials / devices
