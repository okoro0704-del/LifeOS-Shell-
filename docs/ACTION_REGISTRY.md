# Action Registry

Central bridge between AI / Search / Quick Access / Notifications and LifeOS behavior.

## Actions

| id | Confirmation | Typical effect |
|----|--------------|----------------|
| OPEN_WALLET | No | Navigate wallet |
| VIEW_BOOKINGS | No | Activity filter |
| VIEW_ACTIVITY | No | Activity |
| SEARCH_EXPERIENCES | No | Search |
| OPEN_EXPERIENCE | No* | Discover open |
| BOOK_SERVICE | **Yes** | Preview → activity |
| PAY_INVOICE | **Yes** | Preview → wallet adapter |
| VIEW_TICKETS | No | Activity filter |
| VIEW_NOTIFICATIONS | No | Notifications |
| VIEW_PROFILE | No | Profile |
| DISCOVER_BUSINESSES | No | Discover |
| SHOW_CONNECTIONS | No | Connections |
| CHECK_IN | **Yes** | Preview → activity |
| VIEW_APPOINTMENT | No | Activity |

\* Opening an unconnected experience still uses existing consent UI in Discover.

## Definition shape

- `id`, `name`, `description`
- `requiredPermissions`
- `parameters`
- `requiresConfirmation`
- `handler` (via execute endpoints)
- `source`: `lifeos` | `wallet` | `experience`

## Notifications

Notifications carry optional `actionId` + `actionParams` and must route through the registry — no parallel action logic.
