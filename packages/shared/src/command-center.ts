/** Sprint 7 — Command Center contracts (extends Sprint 4 command layer). */

import type { ActionId, ClassifiedIntent, SearchResult } from "./command.js";

export const COMMAND_INTENT_TYPES = [
  "DISCOVER",
  "SEARCH",
  "PERSONAL_CONTEXT",
  "COMPARE",
  "PLAN",
  "BOOK",
  "RESERVE",
  "BUY",
  "PAY",
  "VIEW",
  "CANCEL",
  "RECOMMEND",
  "NAVIGATE",
  "UNKNOWN",
] as const;

export type CommandIntentType = (typeof COMMAND_INTENT_TYPES)[number];

export const COMMAND_INPUT_TYPES = ["TEXT", "VOICE", "IMAGE", "LOCATION"] as const;
export type CommandInputType = (typeof COMMAND_INPUT_TYPES)[number];

/** Structured intent from QueryPlanner — never executes actions. */
export type CommandIntent = {
  type: CommandIntentType;
  rawQuery: string;
  inputType: CommandInputType;
  category?: string | null;
  offeringType?: string | null;
  date?: string | null;
  time?: string | null;
  timeAfter?: string | null;
  timeBefore?: string | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  currency?: string | null;
  locationMode?: "none" | "near_me" | "near_hotel" | "near_cinema" | "near_gym";
  personalFocus?: string | null;
  sortBy?: "price_asc" | "price_desc" | "distance" | "availability" | "relevance" | "cancellation";
  needsClarification?: boolean;
  clarificationPrompt?: string | null;
  actionCapability?: "BOOK" | "BUY" | "RESERVE" | "PAY" | "VIEW" | "NONE" | null;
  confidence: number;
  slots: Record<string, string>;
  suggestedActionId?: ActionId;
  /** Legacy bridge */
  legacyKind?: ClassifiedIntent["kind"];
};

export type CommandSessionPublic = {
  sessionId: string;
  intent: CommandIntent;
  filters: Record<string, unknown>;
  resultCount: number;
  selectedResultId?: string | null;
  pendingActionId?: string | null;
  createdAt: string;
  expiresAt: string;
  reason?: string | null;
};

export type CommandSessionState = CommandSessionPublic & {
  userId: string;
  entities: Record<string, unknown>;
  /** Slim result cards for follow-ups — no secrets. */
  results: SearchResult[];
};

export type QueryPlan = {
  intent: CommandIntent;
  searchQuery: string;
  applyFilters: boolean;
  usePersonalContext: boolean;
  useRecommendations: boolean;
  compareMode: boolean;
  followUp: boolean;
};

export type LocationPermissionState = {
  granted: boolean;
  mode: "none" | "coarse" | "precise";
  /** Never store precise coords in sessions by default. */
  label?: string | null;
};

export const COMMAND_SHORTCUTS = [
  { id: "today", label: "What's happening today?", query: "What's happening today?" },
  { id: "nearby", label: "Find something nearby", query: "what's near me?" },
  { id: "book_again", label: "Book again", query: "book again" },
  { id: "bookings", label: "My bookings", query: "my bookings" },
  { id: "tickets", label: "My tickets", query: "show my cinema tickets" },
  { id: "payments", label: "My payments", query: "show my recent payments" },
  { id: "saved", label: "Saved", query: "what did I save?" },
  { id: "new", label: "What's new?", query: "what's available this weekend?" },
  { id: "surprise", label: "Surprise me", query: "surprise me" },
  { id: "attention", label: "What needs attention?", query: "what needs my attention?" },
] as const;

export type CompareMetric = "price" | "distance" | "availability" | "cancellation";

export type CompareResult = {
  metric: CompareMetric;
  winnerId?: string | null;
  winnerTitle?: string | null;
  summary: string;
  supported: boolean;
};
