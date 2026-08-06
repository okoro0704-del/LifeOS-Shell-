# Sprint 4 — AI + Universal Search + Quick Access

LifeOS Command Layer foundation. See:

- [COMMAND_LAYER.md](./COMMAND_LAYER.md)
- [SEARCH.md](./SEARCH.md)
- [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md)
- [AI_SAFETY.md](./AI_SAFETY.md)
- [ACTION_REGISTRY.md](./ACTION_REGISTRY.md)
- [QUICK_ACCESS.md](./QUICK_ACCESS.md)

Version: **1.5.0**

## Deploy notes

1. Run Prisma migrate/push on the API database (adds `CommandHistory`, `SearchMetric`, notification `actionId` fields).
2. Deploy LifeOS API, then LifeOS web.
3. No AI API keys required — `MockAIProvider` is default.
