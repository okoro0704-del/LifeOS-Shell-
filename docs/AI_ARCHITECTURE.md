# AI Architecture

LifeOS AI is part of the Command Layer — not a chatbot product.

## Provider interface

```ts
interface AIProvider {
  classifyIntent(input: string): Promise<ClassifiedIntent>
  generateResponse(...): Promise<string>
  suggestActions(...): Promise<AiSuggestion[]>
  summarize(text: string): Promise<string>
  plan(...): Promise<AiPlanStep[]>
}
```

## MockAIProvider

- Default at runtime
- No API keys required
- Uses deterministic intent rules + structured copy
- Application boots and works offline from AI vendors

## Future providers

Swap via `setAIProvider()` (e.g. OpenAIProvider) without changing Command Layer core logic.

## What AI may do

Search, explain, recommend, summarize, suggest, plan, navigate, **prepare** an action.

## What AI must not do silently

Spend money, purchase, book, cancel, transfer tokens, change security settings, connect experiences, or other irreversible actions — without Action Preview + explicit confirmation.

See [AI_SAFETY.md](./AI_SAFETY.md).
