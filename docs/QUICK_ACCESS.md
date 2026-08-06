# Quick Access

First-class LifeOS surface — not a hard-coded nav clone.

## Sources

- Frequent / recent actions
- Connected experiences
- Contextual items (check-in, tickets, appointments, unpaid invoice signals)
- Wallet / Explore / Activity defaults
- User pins

## Scoring (deterministic, replaceable)

```
score = frequency + recency + upcoming + pin + context (+ light time-of-day boost)
```

Implemented in `QuickAccessService` / `scoreQuickAccessItem`.

## Personalization

Per-user preferences in `User.preferences.quickAccess`:

- `pinned[]`
- `hidden[]`
- `order[]`

Pin / unpin / reorder / hide / restore via API.
Does **not** change global bottom-nav / sidebar.

## API

- `GET /quick-access`
- `POST /quick-access/pin|unpin|hide|restore|reorder`
