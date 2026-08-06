/** Sprint 4 — Command Layer shared contracts */

export const SEARCH_RESULT_TYPES = [
  "BUSINESS",
  "BOOKING",
  "TICKET",
  "ACTIVITY",
  "TRANSACTION",
  "EXPERIENCE",
  "PERSONAL",
  "ACTION",
  "NOTIFICATION",
] as const;

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number];

export type SearchResultAction = {
  id: string;
  label: string;
  actionId: string;
  params?: Record<string, unknown>;
  requiresConfirmation?: boolean;
};

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  image?: string;
  metadata?: Record<string, unknown>;
  actions: SearchResultAction[];
  source: string;
  score: number;
};

export const INTENT_KINDS = [
  "SEARCH",
  "NAVIGATE",
  "VIEW",
  "BOOK",
  "PAY",
  "DISCOVER",
  "SHOW_ACTIVITY",
  "SHOW_BOOKINGS",
  "SHOW_WALLET",
  "OPEN_EXPERIENCE",
  "ASK",
  "WALLET_QUERY",
  "UNKNOWN",
] as const;

export type IntentKind = (typeof INTENT_KINDS)[number];

export type ClassifiedIntent = {
  kind: IntentKind;
  confidence: number;
  query: string;
  slots: Record<string, string>;
  suggestedActionId?: string;
};

export const ACTION_IDS = [
  "OPEN_WALLET",
  "VIEW_BOOKINGS",
  "VIEW_ACTIVITY",
  "SEARCH_EXPERIENCES",
  "OPEN_EXPERIENCE",
  "BOOK_SERVICE",
  "PAY_INVOICE",
  "VIEW_TICKETS",
  "VIEW_NOTIFICATIONS",
  "VIEW_PROFILE",
  "DISCOVER_BUSINESSES",
  "SHOW_CONNECTIONS",
  "CHECK_IN",
  "VIEW_APPOINTMENT",
] as const;

export type ActionId = (typeof ACTION_IDS)[number];

export type ActionDefinition = {
  id: ActionId;
  name: string;
  description: string;
  /** Soft permission tags — LifeOS-local, not TrustID. */
  requiredPermissions: string[];
  parameters: string[];
  requiresConfirmation: boolean;
  source: "lifeos" | "wallet" | "experience";
  navigateTo?: string;
};

export type CommandOutcome =
  | {
      type: "navigate";
      path: string;
      message?: string;
    }
  | {
      type: "results";
      message: string;
      results: SearchResult[];
      intent: ClassifiedIntent;
    }
  | {
      type: "preview";
      message: string;
      preview: ActionPreviewPayload;
    }
  | {
      type: "answer";
      message: string;
      suggestions?: AiSuggestion[];
    }
  | {
      type: "executed";
      message: string;
      activityId?: string;
    };

export type ActionPreviewPayload = {
  actionId: ActionId;
  title: string;
  subtitle?: string;
  lines: { label: string; value: string }[];
  amount?: string;
  params: Record<string, unknown>;
  confirmLabel: string;
};

export type QuickAccessItem = {
  id: string;
  kind: "action" | "experience" | "contextual" | "wallet";
  label: string;
  subtitle?: string;
  icon?: string;
  actionId: string;
  params?: Record<string, unknown>;
  score: number;
  pinned: boolean;
  contextual?: boolean;
  navigateTo?: string;
};

export type CommandHistoryEntry = {
  id: string;
  kind: "search" | "command" | "action";
  query: string;
  intent?: string | null;
  actionId?: string | null;
  createdAt: string;
};

export type QuickAccessPreferences = {
  pinned: string[];
  hidden: string[];
  order: string[];
};

export const DEFAULT_QUICK_ACCESS_PREFS: QuickAccessPreferences = {
  pinned: [],
  hidden: [],
  order: [],
};

export type AiSuggestion = {
  id: string;
  label: string;
  actionId?: string;
  query?: string;
  reason?: string;
};

export type AiPlanStep = {
  id: string;
  label: string;
  actionId?: string;
  requiresConfirmation: boolean;
};
