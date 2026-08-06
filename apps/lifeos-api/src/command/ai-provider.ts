import type {
  ActionId,
  ActionPreviewPayload,
  AiPlanStep,
  AiSuggestion,
  ClassifiedIntent,
  SearchResult,
} from "@lifeos/shared";
import { classifyIntent } from "./intent.js";

/**
 * AI provider abstraction — LifeOS must work without external AI credentials.
 */
export interface AIProvider {
  classifyIntent(input: string): Promise<ClassifiedIntent>;
  generateResponse(input: {
    intent: ClassifiedIntent;
    results?: SearchResult[];
  }): Promise<string>;
  suggestActions(input: {
    intent: ClassifiedIntent;
    results?: SearchResult[];
  }): Promise<AiSuggestion[]>;
  summarize(text: string): Promise<string>;
  plan(input: { intent: ClassifiedIntent }): Promise<AiPlanStep[]>;
}

export class MockAIProvider implements AIProvider {
  async classifyIntent(input: string): Promise<ClassifiedIntent> {
    return classifyIntent(input);
  }

  async generateResponse(input: {
    intent: ClassifiedIntent;
    results?: SearchResult[];
  }): Promise<string> {
    const { intent, results = [] } = input;
    if (intent.kind === "SHOW_WALLET" || intent.kind === "WALLET_QUERY") {
      return "Here’s your wallet. Cash is for everyday money; Tokens are for the ecosystem.";
    }
    if (intent.kind === "BOOK" || intent.kind === "PAY") {
      return "I can prepare that for you — confirm before anything is charged or booked.";
    }
    if (results.length > 0) {
      return `I found ${results.length} option${results.length === 1 ? "" : "s"}.`;
    }
    if (intent.kind === "ASK") {
      return "I can search the ecosystem, open your wallet, show activity, or help you prepare a booking.";
    }
    if (intent.kind === "DISCOVER" || intent.kind === "SEARCH") {
      return results.length
        ? `I found ${results.length} matches.`
        : "I couldn’t find a match. Try a business name or category.";
    }
    return "What would you like to do?";
  }

  async suggestActions(input: {
    intent: ClassifiedIntent;
    results?: SearchResult[];
  }): Promise<AiSuggestion[]> {
    const suggestions: AiSuggestion[] = [];
    if (input.intent.suggestedActionId) {
      suggestions.push({
        id: `sug_${input.intent.suggestedActionId}`,
        label: labelFor(input.intent.suggestedActionId as ActionId),
        actionId: input.intent.suggestedActionId,
        reason: "Matched your request",
      });
    }
    for (const r of (input.results ?? []).slice(0, 3)) {
      const primary = r.actions[0];
      if (primary) {
        suggestions.push({
          id: `sug_res_${r.id}`,
          label: `${primary.label} · ${r.title}`,
          actionId: primary.actionId,
          reason: r.type,
        });
      }
    }
    return suggestions;
  }

  async summarize(text: string): Promise<string> {
    const trimmed = text.trim().slice(0, 280);
    return trimmed.length < text.trim().length ? `${trimmed}…` : trimmed;
  }

  async plan(input: { intent: ClassifiedIntent }): Promise<AiPlanStep[]> {
    const steps: AiPlanStep[] = [
      { id: "understand", label: "Understand request", requiresConfirmation: false },
      { id: "search", label: "Search ecosystem", requiresConfirmation: false },
    ];
    if (input.intent.kind === "BOOK" || input.intent.kind === "PAY") {
      steps.push({
        id: "preview",
        label: "Preview action",
        actionId: input.intent.suggestedActionId,
        requiresConfirmation: true,
      });
      steps.push({
        id: "confirm",
        label: "Wait for your confirmation",
        requiresConfirmation: true,
      });
    } else {
      steps.push({
        id: "present",
        label: "Present options",
        requiresConfirmation: false,
      });
    }
    return steps;
  }
}

function labelFor(id: ActionId): string {
  const map: Partial<Record<ActionId, string>> = {
    OPEN_WALLET: "Open wallet",
    VIEW_BOOKINGS: "View bookings",
    VIEW_ACTIVITY: "View activity",
    BOOK_SERVICE: "Prepare booking",
    PAY_INVOICE: "Prepare payment",
    DISCOVER_BUSINESSES: "Discover",
    SEARCH_EXPERIENCES: "Search",
    VIEW_TICKETS: "View tickets",
    VIEW_NOTIFICATIONS: "Notifications",
    VIEW_PROFILE: "Profile",
  };
  return map[id] ?? id;
}

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) provider = new MockAIProvider();
  return provider;
}

/** Test / future OpenAI swap — never required for LifeOS to boot. */
export function setAIProvider(next: AIProvider | null) {
  provider = next;
}
