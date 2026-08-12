import type { QuickAccessPreferences } from "./command.js";
import { DEFAULT_QUICK_ACCESS_PREFS } from "./command.js";

export const LIFEOS_VERSION = "1.9.0";

export * from "./command.js";
export * from "./command-center.js";
export * from "./offering.js";
export * from "./actions.js";
export * from "./personal-context.js";
export * from "./booking.js";

export const OS_TYPES = [
  "hospitality",
  "realestate",
  "finance",
  "services",
  "shopping",
  "transport",
  "other",
] as const;

export type OsType = (typeof OS_TYPES)[number];

export const DISCOVER_CATEGORIES = [
  "Hotels",
  "Restaurants",
  "Apartments",
  "Real Estate",
  "Finance",
  "Services",
  "Shopping",
  "Transport",
  "Other",
] as const;

export type DiscoverCategory = (typeof DISCOVER_CATEGORIES)[number];

export type ExperienceStatus = "active" | "inactive" | "pending";
export type ExperienceType = "web" | "pwa" | "embedded" | "external";

/** Permissions a business experience may request — never granted silently. */
export const EXPERIENCE_PERMISSIONS = [
  "profile.basic",
  "profile.contact",
  "wallet.view",
  "wallet.pay",
  "notifications",
] as const;

export type ExperiencePermission = (typeof EXPERIENCE_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<ExperiencePermission, string> = {
  "profile.basic": "Your basic profile",
  "profile.contact": "Your contact details",
  "wallet.view": "View wallet balance (mock)",
  "wallet.pay": "Request payments (mock)",
  notifications: "Booking-related notifications",
};

export const EXPERIENCE_TOKEN_ISSUER = "lifeos";
export const EXPERIENCE_TOKEN_TTL_SECONDS = 300;

export type ExperienceTokenClaims = {
  iss: string;
  sub: string;
  aud: string;
  sid: string;
  exp: number;
  iat: number;
  jti: string;
  experience_id: string;
  business_id: string;
  scopes: ExperiencePermission[];
  display_name?: string;
};

export interface ExperienceRecord {
  id: string;
  businessId: string;
  businessName: string;
  osType: OsType;
  category: DiscoverCategory;
  experienceType: ExperienceType;
  experienceUrl: string;
  approvedOrigin: string;
  displayName: string;
  description: string;
  location?: string | null;
  status: ExperienceStatus;
  version: string;
  icon?: string | null;
  permissions: ExperiencePermission[];
  metadata?: Record<string, unknown>;
  featured?: boolean;
}

export interface ExperienceConnectionPublic {
  id: string;
  experienceId: string;
  businessName: string;
  displayName: string;
  osType: OsType;
  osLabel: string;
  status: "connected" | "disconnected";
  grantedPermissions: ExperiencePermission[];
  connectedAt: string;
  disconnectedAt?: string | null;
}

export interface ExperienceSessionPublic {
  sessionId: string;
  experienceId: string;
  grantedPermissions: ExperiencePermission[];
  /** One-time handoff code — business OS exchanges this for a signed token. */
  handoff: string;
  launchUrl: string;
  expiresAt: string;
}

export interface LifeOsUserPublic {
  id: string;
  trustId: string;
  displayName: string;
  /**
   * @deprecated Zero-PII: never populated from the identity gateway.
   * May appear only from ephemeral client-side returning identity.
   */
  email?: string | null;
  /** @deprecated Zero-PII — not persisted by LifeOS API. */
  firstName?: string | null;
  /** @deprecated Zero-PII — not persisted by LifeOS API. */
  lastName?: string | null;
  /** Trust tier from ZK / trust_level claims (0–3). */
  trustTier?: number | null;
  /** Gateway identity status (e.g. verified / unverified). */
  identityStatus?: string | null;
  /** True when the current login included verified ZK claims. */
  zkVerified?: boolean;
  preferences: LifeOsPreferences;
  createdAt: string;
  lastLoginAt: string;
}

/** Groth16 proof payload as produced by snarkjs / Circom. */
export type Groth16Proof = {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol?: string;
  curve?: string;
};

export type ZkClaimType =
  | "compliance_tier"
  | "uniqueness"
  | "authorization"
  | "identity_status"
  | string;

/** Zero-knowledge claim bundle from TrustID — no raw PII. */
export type ZkClaimBundle = {
  claimType: ZkClaimType;
  proof: Groth16Proof;
  publicSignals: string[];
  /** Audience-bound uniqueness nullifier (opaque). */
  nullifier?: string;
  disclosed?: {
    trustTier?: number;
    identityStatus?: string;
    verified?: boolean;
    authorized?: boolean;
  };
  issuedAt?: string;
  audience?: string;
  protocol?: "groth16";
};

export type ZkVerifyErrorCode =
  | "zk_invalid"
  | "zk_required"
  | "zk_expired"
  | "zk_audience_mismatch"
  | "zk_unavailable";

/** Default OAuth scopes for LifeOS — ZK-first, no legacy PII scopes. */
export const LIFEOS_AUTH_SCOPES =
  "openid identity.basic identity.zk_claims identity.trust_level identity.verification_status";

export interface LifeOsPreferences {
  notificationsEnabled: boolean;
  marketingTips: boolean;
  theme: "system" | "light" | "dark";
  language: string;
  tokenDisplay: string;
  openExperiencesIn: "embed" | "external";
  quickAccess: QuickAccessPreferences;
  /** Optional profile photo as a data URL (client-uploaded). */
  avatarUrl?: string | null;
}

export const DEFAULT_PREFERENCES: LifeOsPreferences = {
  notificationsEnabled: true,
  marketingTips: false,
  theme: "system",
  language: "en",
  tokenDisplay: "TOK",
  openExperiencesIn: "embed",
  quickAccess: { ...DEFAULT_QUICK_ACCESS_PREFS },
  avatarUrl: null,
};

export type ActivityKind =
  | "hotel_booking"
  | "payment"
  | "restaurant_order"
  | "wallet_transfer"
  | "account"
  | "experience"
  | "security"
  | "command";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  description?: string;
  source: string;
  status?: string;
  amount?: string | null;
  deepLink?: string | null;
  experienceId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type NotificationCategory = "Security" | "Wallet" | "Business" | "System";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  source: string;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
  /** Registered Action Registry id — notifications launch actions, not custom handlers. */
  actionId?: string | null;
  actionParams?: Record<string, unknown>;
}

export const TOKEN_SYMBOL = "TOK";

export const AUDIT_EVENTS = {
  SESSION_CREATED: "lifeos.session.created",
  SESSION_REVOKED: "lifeos.session.revoked",
  EXPERIENCE_CONNECTED: "experience.connected",
  EXPERIENCE_DISCONNECTED: "experience.disconnected",
  PERMISSION_GRANTED: "experience.permission.granted",
  PERMISSION_REVOKED: "experience.permission.revoked",
  PERMISSION_REQUESTED: "experience.permission.requested",
  PERMISSION_DENIED: "experience.permission.denied",
  NOTIFICATION_READ: "notification.read",
  EXPERIENCE_SESSION_CREATED: "experience.session.created",
  EXPERIENCE_SESSION_VERIFIED: "experience.session.verified",
  EXPERIENCE_SESSION_REVOKED: "experience.session.revoked",
  EXPERIENCE_TOKEN_REJECTED: "experience.token.rejected",
  EXPERIENCE_TOKEN_EXPIRED: "experience.token.expired",
  EXPERIENCE_TOKEN_REPLAY: "experience.token.replay_detected",
  COMMAND_EXECUTED: "lifeos.command.executed",
  ACTION_CONFIRMED: "lifeos.action.confirmed",
  ACTION_FAILED: "lifeos.action.failed",
  OFFERING_SAVED: "lifeos.offering.saved",
} as const;
