/** Sprint 5 — Action orchestration contracts (LifeOS orchestration, not commerce SoT). */

export const OFFERING_CAPABILITIES = [
  "VIEW",
  "BOOK",
  "BUY",
  "RESERVE",
  "PAY",
  "JOIN",
  "CHECK_IN",
  "CANCEL",
  "WAITLIST",
  "SAVE",
  "OPEN_EXPERIENCE",
  "PURCHASE_TICKET",
] as const;

export type OfferingCapability = (typeof OFFERING_CAPABILITIES)[number];

export const ORCHESTRATED_ACTIONS = [
  "BOOK",
  "BUY",
  "RESERVE",
  "JOIN",
  "PURCHASE_TICKET",
  "VIEW",
  "SAVE",
  "OPEN_EXPERIENCE",
  "PAY",
  "CHECK_IN",
  "CANCEL",
  "WAITLIST",
] as const;

export type OrchestratedAction = (typeof ORCHESTRATED_ACTIONS)[number];

export const ACTION_RESULT_STATUSES = [
  "SUCCESS",
  "PENDING",
  "FAILED",
  "CANCELLED",
  "REQUIRES_AUTHORIZATION",
] as const;

export type ActionResultStatus = (typeof ACTION_RESULT_STATUSES)[number];

export type ActionResult = {
  id: string;
  status: ActionResultStatus;
  action: OrchestratedAction;
  offeringId?: string | null;
  businessId?: string | null;
  experienceId?: string | null;
  externalReference?: string | null;
  bookingId?: string | null;
  paymentId?: string | null;
  receiptId?: string | null;
  message: string;
  timestamp: string;
  /** Launch experience after success when present. */
  launchExperienceId?: string | null;
  activityId?: string | null;
  metadata?: Record<string, unknown>;
};

export type AvailabilitySlot = {
  id: string;
  label: string;
  startsAt: string;
  endsAt?: string | null;
  available: boolean;
  remaining?: number | null;
  priceOverride?: number | null;
  priceFormatted?: string | null;
  metadata?: Record<string, unknown>;
};

export type AvailabilityQuery = {
  date?: string;
  time?: string;
  quantity?: number;
  duration?: string;
  location?: string;
};

export type AvailabilityResponse = {
  offeringId: string;
  timezone: string;
  summary: string;
  slots: AvailabilitySlot[];
  /** Source system remains authoritative at confirm time. */
  source: string;
  staleWarning?: string;
};

export type PaymentLine = {
  label: string;
  amount: number;
  formatted: string;
};

export type PaymentPreview = {
  currency: string;
  lines: PaymentLine[];
  subtotal: number;
  fees: number;
  taxes: number;
  discounts: number;
  total: number;
  totalFormatted: string;
  methodLabel: string;
};

export type ActionPreviewRequest = {
  action: OrchestratedAction;
  offeringId: string;
  slotId?: string;
  quantity?: number;
  partySize?: number;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  params?: Record<string, unknown>;
};

export type ActionPreviewResponse = {
  action: OrchestratedAction;
  offeringId: string;
  title: string;
  subtitle?: string;
  lines: { label: string; value: string }[];
  amount?: string;
  payment?: PaymentPreview;
  policy?: string;
  confirmLabel: string;
  requiresAuthorization: boolean;
  requiresPayment: boolean;
  slot?: AvailabilitySlot | null;
  /** Client must re-confirm; never trust client price. */
  serverQuotedTotal: number;
  currency: string;
  params: Record<string, unknown>;
};

export type ActionConfirmRequest = ActionPreviewRequest & {
  confirmed: true;
  /** Must match preview quote when payment involved. */
  expectedTotal?: number;
  authorizationToken?: string;
};

export type PlanItem = {
  id: string;
  kind: "booking" | "ticket" | "appointment" | "reservation" | "class" | "stay" | "event" | "other";
  title: string;
  subtitle?: string;
  when?: string | null;
  amount?: string | null;
  status: string;
  offeringId?: string | null;
  experienceId?: string | null;
  businessName?: string | null;
  deepLink?: string | null;
  source: string;
};

export type SavedOfferingPublic = {
  id: string;
  offeringId: string;
  name: string;
  businessName: string;
  category: string;
  priceFormatted: string;
  experienceId: string;
  savedAt: string;
};

export type SlotPickerConfig = {
  mode: "datetime" | "daterange" | "showtime" | "class" | "party" | "quantity";
  labels: {
    primary?: string;
    secondary?: string;
    quantity?: string;
  };
};
