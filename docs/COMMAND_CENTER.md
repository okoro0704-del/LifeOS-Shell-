# Command Center

The Command Center is LifeOS’s primary interaction surface — not a chatbot.

```
USER → COMMAND CENTER → UNDERSTAND → CONTEXT + DISCOVERY
  → SEARCH / RECOMMEND / COMPARE → ACTION PREVIEW
  → USER CONFIRMATION → ACTION ORCHESTRATOR → EXTERNAL SYSTEM
```

## Surfaces

- Home Ask LifeOS trigger
- Global Ctrl/⌘ K palette (`CommandOverlay`)
- Search / Plans / Quick Access entry points
- Mobile: large field, suggestion chips, voice-ready mic placeholder

## Capabilities

AI / Command may: search, filter, compare, recommend, prepare, navigate.

AI must **not** silently: book, purchase, pay, cancel, refund, or transfer.

## Key modules

| Module | Path |
|--------|------|
| QueryPlanner | `apps/lifeos-api/src/command/query-planner.ts` |
| CommandSession | `apps/lifeos-api/src/command/command-session.ts` |
| Universal Search | `apps/lifeos-api/src/command/search/engine.ts` |
| Ranking | `apps/lifeos-api/src/command/search-ranking.ts` |
| UI | `apps/lifeos-web/src/components/CommandOverlay.tsx` |

## Input types (voice-ready)

`TEXT` | `VOICE` | `IMAGE` | `LOCATION` — same pipeline; only TEXT is live today.
