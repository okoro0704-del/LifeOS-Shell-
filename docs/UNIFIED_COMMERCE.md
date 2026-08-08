# Unified Commerce (LifeOS ↔ Business)

One **Booking** ledger on LifeOS is the source of truth for catalog checkout and
embedded business PWAs.

## Paths

1. **Catalog** — LifeOS Business page → `/actions/confirm` → `Booking` confirmed → open PWA → `GET /experience/bookings` shows it.
2. **PWA** — Room hold via `/experience/bookings/hold` → `experience.request_payment` → shell `/bookings/:id/confirm` → `lifeos.booking.updated` → Activity/Plans.

## Statuses

`held` → `confirmed` | `cancelled` | `failed`

Holds expire (~15m) and release slot locks.
