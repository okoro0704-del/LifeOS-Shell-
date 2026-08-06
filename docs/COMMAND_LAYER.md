# LifeOS Command Layer

The Command Layer is the central interface for LifeOS interactions.

```
ASK → SEARCH → DISCOVER → DECIDE → ACT → REMEMBER
```

AI, Universal Search, and Quick Access converge here. They are not separate apps.

## Input-agnostic entry

All inputs feed the same pipeline:

- Text (`Ask LifeOS...`)
- Touch / Quick Access
- Deep links
- Notifications (via Action Registry)
- Future: voice

## Flow

1. User enters a command (or selects Quick Access / notification action)
2. Intent engine classifies the request
3. Mock AI (or future provider) may explain / suggest / plan
4. Universal Search gathers typed `SearchResult` objects when needed
5. Action Registry resolves what can happen
6. Safe actions navigate immediately
7. Consequential actions show **Action Preview** → require confirmation
8. Confirmed actions may create Activity records

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/search` | Universal search |
| POST | `/commands` | Run a natural-language command |
| GET | `/commands/recent` | Recent commands/searches |
| DELETE | `/commands/recent` | Clear history |
| GET | `/quick-access` | Ranked Quick Access |
| POST | `/quick-access/pin` | Pin item |
| POST | `/quick-access/unpin` | Unpin item |
| POST | `/quick-access/reorder` | Reorder |
| GET | `/suggestions` | Suggestions + recent + quick |
| POST | `/ai/intent` | Classify intent |
| POST | `/ai/plan` | Plan steps |
| GET | `/actions` | List Action Registry |
| POST | `/actions/execute` | Resolve / confirm action |

## Client

- `CommandLayerProvider` + `Ctrl/Cmd+K`
- `CommandOverlay` (“Ask LifeOS”)
- Home redesigned around Command + Quick Access
- Notifications launch registered actions only

## Boundaries

- Does not modify TrustID, HospitalityOS, or Token Network internals
- Experiences open via existing discover/session architecture
- Wallet uses adapter interface over existing LifeOS wallet preview
