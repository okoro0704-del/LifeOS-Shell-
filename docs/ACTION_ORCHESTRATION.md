# Action Orchestration

LifeOS connects discovery to safe action without owning commerce.

```
Offering → Available Actions → Preview → Authorization → External Execution → Result → Activity
```

## Components

- `ActionOrchestrator` — preview + confirm
- `AvailabilityProvider` — slot projection (source re-checks at confirm)
- `AuthorizationProvider` — TrustID boundary (mock)
- `LifeOsPaymentAdapter` — Token Network boundary (mock)
- Experience session — existing scoped handoff after success

## API

| Method | Path |
|--------|------|
| GET | `/actions/for-offering?offeringId=` |
| POST | `/actions/preview` |
| POST | `/actions/confirm` |
| GET | `/actions/history` |
| GET | `/actions/:id` |
| GET | `/plans` |
| GET | `/saved` |
| POST/DELETE | `/offerings/:id/save` |
| GET | `/discover/offerings/:id/availability` |

## Safety

- No silent consequential execution
- Server re-quotes price; client totals are not trusted
- Final availability check at confirm
- Payment goes through adapter + confirmation
- HospitalityOS / Token Network remain authoritative systems
