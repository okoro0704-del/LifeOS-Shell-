/** Sprint 6 — Personal context contracts (LifeOS read layer, not SoT). */

export const LIFE_PLAN_ITEM_TYPES = [
  "BOOKING",
  "APPOINTMENT",
  "TICKET",
  "EVENT",
  "STAY",
  "CLASS",
  "RESERVATION",
  "PAYMENT",
  "TASK",
  "OTHER",
] as const;

export type LifePlanItemType = (typeof LIFE_PLAN_ITEM_TYPES)[number];

export const LIFE_PLAN_ITEM_STATUSES = [
  "UPCOMING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
  "ATTENTION",
] as const;

export type LifePlanItemStatus = (typeof LIFE_PLAN_ITEM_STATUSES)[number];

export type LifePlanAction = {
  label: string;
  /** Navigate path or orchestrated action hint */
  kind: "view" | "check_in" | "ticket" | "open" | "pay" | "resume" | "other";
  href?: string | null;
  actionId?: string | null;
};

/** Normalized personal plan item — references external records; not a booking copy. */
export type LifePlanItem = {
  id: string;
  type: LifePlanItemType;
  title: string;
  subtitle?: string | null;
  source: string;
  sourceId?: string | null;
  experienceId?: string | null;
  offeringId?: string | null;
  businessId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  status: LifePlanItemStatus;
  location?: string | null;
  image?: string | null;
  action?: LifePlanAction | null;
  amountFormatted?: string | null;
  metadata?: Record<string, unknown>;
};

export type TimelineEntry = {
  id: string;
  bucket: "today" | "yesterday" | "this_week" | "upcoming" | "earlier";
  label: string;
  item: LifePlanItem;
};

export type ContinueItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  experienceId?: string | null;
  offeringId?: string | null;
  href: string;
  /** Never includes payment credentials or card data. */
  stage: string;
};

export type AttentionItem = {
  id: string;
  title: string;
  detail?: string | null;
  severity: "info" | "warning" | "critical";
  href?: string | null;
  source: "notification" | "action" | "wallet";
  createdAt: string;
};

export type RecommendationItem = {
  id: string;
  offeringId: string;
  name: string;
  businessName: string;
  category: string;
  priceFormatted: string;
  reason: string;
  experienceId: string;
  score: number;
};

export type WalletContextSummary = {
  fiatFormatted?: string | null;
  tokenFormatted?: string | null;
  recentPayments: Array<{
    id: string;
    title: string;
    amountFormatted: string;
    href: string;
  }>;
  upcomingPayments: Array<{
    id: string;
    title: string;
    amountFormatted: string;
    href: string;
  }>;
  available: boolean;
};

export type PersonalPlanGroup = {
  id: string;
  title: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  itemIds: string[];
  items: LifePlanItem[];
  createdAt: string;
};

export type PersonalContextSignals = {
  preferredCategories: string[];
  preferredBusinessIds: string[];
  recentSearchTerms: string[];
  favoriteExperienceIds: string[];
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
};

export type PersonalContextSnapshot = {
  userId: string;
  generatedAt: string;
  stale: boolean;
  offlineCapable: boolean;
  today: LifePlanItem[];
  upcoming: LifePlanItem[];
  completed: LifePlanItem[];
  timeline: TimelineEntry[];
  continueItems: ContinueItem[];
  attention: AttentionItem[];
  recommendations: RecommendationItem[];
  savedCount: number;
  wallet: WalletContextSummary | null;
  signals: PersonalContextSignals;
  planGroups: PersonalPlanGroup[];
  providerErrors: string[];
};

/** AI-safe context projection — no secrets, credentials, or biometrics. */
export type AiSafePersonalContext = {
  todaySummary: string;
  upcomingSummary: string;
  recentBookingsSummary: string;
  savedSpasSummary: string;
  tonightSummary: string;
  paymentAttentionSummary: string;
  yesterdaySummary: string;
  items: Array<{
    id: string;
    type: LifePlanItemType;
    title: string;
    when?: string | null;
    status: LifePlanItemStatus;
  }>;
};
