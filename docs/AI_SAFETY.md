# AI Safety

## Boundary

| Allowed | Forbidden without confirmation |
|---------|--------------------------------|
| Search / explain / recommend | Spend money / pay |
| Summarize / plan / navigate | Book / cancel bookings |
| Prepare an action | Transfer tokens |
| Suggest Quick Access | Change security / devices |
| | Connect experiences silently |

## Confirmation pipeline

```
AI suggestion → Action Preview → User Confirm → Authorized execution
```

Registry flags:

- `BOOK_SERVICE`, `PAY_INVOICE`, `CHECK_IN` → `requiresConfirmation: true`

`POST /actions/execute` with `confirmed: false` returns a preview for consequential actions.

## Privacy

- Command history stores sanitized queries (secrets redacted, length-capped)
- Search metrics omit raw query text
- No biometric storage
- No TrustID private credentials
- No payment credentials in history

## TrustID boundary

LifeOS may know authenticated user reference and app auth state.
LifeOS must not recreate TrustID auth or store biometrics.
