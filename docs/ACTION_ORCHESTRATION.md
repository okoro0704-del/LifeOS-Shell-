# Action Orchestration

LifeOS connects discovery to safe action and a **shared booking ledger** used by both
the shell catalog and business PWAs.

```
Offering → Available Actions → Preview → Authorization → Booking ledger → Activity
```

## Components

- `ActionOrchestrator` — preview + confirm (writes shared `Booking` ledger)
- `BookingLedger` — holds / confirms / cancels (single source of truth)
- `AvailabilityProvider` — slot projection + soft locks at hold/confirm
- `AuthorizationProvider` — TrustID boundary (mock)
- `LifeOsPaymentAdapter` — Token Network boundary (mock)
- Experience session — scoped handoff; PWA uses experience JWT for booking APIs

## API

| Method | Path |
|--------|------|
| GET | `/actions/for-offering?offeringId=` |
| POST | `/actions/preview` |
| POST | `/actions/confirm` |
| GET | `/actions/history` |
| GET | `/actions/:id` |
| GET | `/bookings` |
| GET | `/bookings/:id` |
| POST | `/bookings/:id/confirm` |
| POST | `/bookings/:id/cancel` |
| GET | `/experience/bookings` (experience JWT) |
| POST | `/experience/bookings/hold` (experience JWT) |
| POST | `/experience/bookings/:id/cancel` (experience JWT) |
| GET | `/plans` |
| GET | `/saved` |
| POST/DELETE | `/offerings/:id/save` |
| GET | `/discover/offerings/:id/availability` |

## Safety

- No silent consequential execution
- Server re-quotes price; client totals are not trusted
- Final availability check + slot lock at hold/confirm
- Payment goes through adapter + confirmation (shell or catalog path)
- Business PWAs never receive TrustID credentials; they use experience JWTs only
- Idempotency keys supported on hold/confirm