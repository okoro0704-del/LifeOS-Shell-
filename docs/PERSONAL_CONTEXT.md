# Personal Context

LifeOS aggregates authorized personal signals into a coherent “what’s going on” layer.

## Principle

LifeOS is a **consumer operating layer**. It does not own bookings, wallets, or identity.

```
CONTEXT → UNDERSTAND → DISCOVER → RECOMMEND → CONFIRM → ACT → REMEMBER
```

## PersonalContextService

Location: `apps/lifeos-api/src/services/personal-context.ts`

Aggregates normalized references from providers (parallel, timed out independently):

| Provider | Source | Purpose |
|----------|--------|---------|
| BookingProvider | `ActionRecord` | Upcoming / completed actions |
| ActivityProvider | `Activity` | Recent completed events |
| NotificationProvider | `Notification` | Attention signals |
| WalletProvider | Token Network adapter | Balance + payment attention (no ledger copy) |
| ExperienceProvider | Connections | Connected experiences |
| SavedOfferingProvider | `SavedOffering` | Saved catalog refs |
| RecommendationProvider | Offerings + signals | Deterministic “For you” |
| PlanGroupProvider | `PersonalPlan` | Lightweight multi-step groups |

## Caching

- Short in-memory TTL (~15s)
- Stale-while-revalidate via `getCached`
- Partial provider failures recorded in `providerErrors` — Home/Plans still render

## API

- `GET /context` — full snapshot (user-scoped)
- `GET /context/ai` — AI-safe summaries only
- `GET /plans` — Today / Upcoming / Timeline / Continue / Attention / For you

## Offline

Cached Today / Plans / Saved / activity may display when offline.

**Never** confirm payments or consequential actions offline.

Banner: *You're offline. Some information may be outdated.*
