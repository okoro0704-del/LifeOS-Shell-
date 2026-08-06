# AI Context

The Command Layer may answer personal questions using **AI-safe** projections from `PersonalContextService`.

## Allowed questions (examples)

- What do I have today?
- What’s coming up this weekend?
- What did I book recently?
- Show my saved spas
- Where am I going tonight?
- What do I need to pay?
- What did I do yesterday?
- I have nothing planned Saturday — what can I do?

## Access model

- Intent `PERSONAL_CONTEXT` / enriched `SHOW_BOOKINGS`
- `toAiSafe()` returns summaries + minimal item list
- **No** unrestricted database access for AI
- **No** biometrics, BVN, payment credentials, staff notes, or secrets

## Context + discovery

For “nothing planned / what can I do?”, LifeOS:

1. Reads preference signals
2. Returns offering cards (recommendations)
3. User selects → Action Orchestrator preview/confirm

AI prepares; LifeOS never auto-executes consequential actions.
