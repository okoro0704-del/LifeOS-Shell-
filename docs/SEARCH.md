# Universal Search

Search is server-side, permission-aware, and provider-based.

## SearchResult

Normalized object (never raw DB dumps):

- `id`, `type`, `title`, `subtitle`, `description`
- `icon`, `image`, `metadata`
- `actions[]` (permission-aware)
- `source`, `score`

Types: `BUSINESS`, `BOOKING`, `TICKET`, `ACTIVITY`, `TRANSACTION`, `EXPERIENCE`, `PERSONAL`, `ACTION`, `NOTIFICATION`

## Providers

| Provider | Scope |
|----------|--------|
| LifeOSSearchProvider | Actions + personal shortcuts |
| ExperienceSearchProvider | Directory experiences/businesses |
| BookingSearchProvider | User booking-like activities |
| WalletSearchProvider | Wallet + transactions (own user) |
| ActivitySearchProvider | User activity |
| NotificationSearchProvider | User notifications |

Add providers without rewriting the engine (`UniversalSearchEngine`).

## Permissions

- Activity/booking/notification results are **user-scoped**
- Experience-linked private rows require a **connected** experience
- Never returns other users’ data
- Never exposes TrustID biometrics, staff notes, payment credentials, or secrets

## Performance

- Debounced client queries (~220–250ms)
- Parallel providers with per-provider failure isolation
- Result limit (default 24)
- Privacy-conscious `SearchMetric` rows (category / hasResults — **no raw query text**)

## API

`GET /search?q=...&type=EXPERIENCE,ACTION`

Also returns legacy `businesses` / `experiences` arrays for back-compat.
