# Command Sessions

Lightweight in-memory `CommandSession` for follow-up conversation.

## Fields

- `sessionId`, `userId`  
- `intent`, `filters`, `entities`  
- slim `results` (max 12)  
- `selectedResultId`, `pendingActionId`  
- `createdAt`, `expiresAt` (~20 minutes)  

## Privacy

- User-scoped get/update  
- Strip card/CVV/tokens and precise lat/lng from stored metadata  
- No unrestricted DB exposure to AI  

## APIs

- `POST /commands` accepts optional `sessionId`  
- `GET /commands/session` — latest public session  
- `POST /commands/plan` — plan without side effects  

Sessions expire automatically; they are not a durable conversation store.
