/**
 * Connected access policy. FREE, PREMIUM and VIP are classifications within
 * this one Online Kernel; Offline remains a separate capability provider.
 * Creator VIP relationships are projections, never LifeOS subscription data.
 */
import type { MediaCapability } from "@lifeos/shared";
import type { MediaItem } from "./personalCatalog";
import { ApiError } from "./api";
import { fetchLifeOsPublicationFeed } from "./mybrandPublicFeed";

export type OnlineAccessClass = "FREE" | "PREMIUM" | "VIP";
export type AccessOutcome =
  | "ALLOW"
  | "IDENTITY_REQUIRED"
  | "SUBSCRIPTION_REQUIRED"
  | "VIP_RELATIONSHIP_REQUIRED"
  | "EXPIRED"
  | "SUSPENDED"
  | "UNAVAILABLE";
export type CreatorVipStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "SUSPENDED";

export type CreatorVipRelationship = {
  subjectId: string;
  creatorId: string;
  productId: string;
  spaceId: string;
  relationshipId: string;
  status: CreatorVipStatus;
  capabilities: readonly string[];
  startedAt: string;
  expiresAt?: string;
  source: string;
};

export type OnlineAccessRequest = {
  accessClass: OnlineAccessClass;
  subjectId?: string | null;
  hasPremium?: boolean;
  creatorId?: string;
  capability?: string;
  relationships?: readonly CreatorVipRelationship[];
};

export function activeVipRelationships(
  subjectId: string | null | undefined,
  relationships: readonly CreatorVipRelationship[],
): CreatorVipRelationship[] {
  if (!subjectId) return [];
  const now = Date.now();
  return relationships.filter((relationship) =>
    relationship.subjectId === subjectId && relationship.status === "ACTIVE" &&
    (!relationship.expiresAt || Date.parse(relationship.expiresAt) > now),
  );
}

export function resolveOnlineAccess(request: OnlineAccessRequest): AccessOutcome {
  if (request.accessClass === "FREE") return "ALLOW";
  if (!request.subjectId) return "IDENTITY_REQUIRED";
  if (request.accessClass === "PREMIUM") return request.hasPremium ? "ALLOW" : "SUBSCRIPTION_REQUIRED";
  const relationship = (request.relationships ?? []).find((item) =>
    item.subjectId === request.subjectId && item.creatorId === request.creatorId,
  );
  if (!relationship) return "VIP_RELATIONSHIP_REQUIRED";
  if (relationship.status === "SUSPENDED") return "SUSPENDED";
  if (relationship.status !== "ACTIVE" || (relationship.expiresAt && Date.parse(relationship.expiresAt) <= Date.now())) return "EXPIRED";
  return !request.capability || relationship.capabilities.includes(request.capability) ? "ALLOW" : "VIP_RELATIONSHIP_REQUIRED";
}

/** A deliberately empty default: production sync must supply creator-owned data. */
export const EMPTY_VIP_RELATIONSHIPS: readonly CreatorVipRelationship[] = [];

/** Read the existing publication API and preserve its product identity mapping. */
async function readPublication(contentId: string): Promise<MediaItem | undefined> {
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const page = await fetchLifeOsPublicationFeed({ cursor, throwOnError: true });
    const item = page.items.find((candidate) => candidate.id === contentId);
    if (item) return item;
    if (!page.nextCursor) return undefined;
    if (seen.has(page.nextCursor)) throw new Error("Publication cursor repeated");
    seen.add(page.nextCursor);
    cursor = page.nextCursor;
  } while (cursor);
}

/** APP uses the existing online reader; injection supports deterministic product fixtures. */
export function createOnlineMediaCapability(
  read: (contentId: string) => Promise<MediaItem | undefined> = readPublication,
  connected: () => boolean = () => typeof navigator === "undefined" || navigator.onLine,
): MediaCapability<MediaItem> {
  return {
    mode: "APP",
    async resolve({ contentId }) {
      if (!connected()) return { state: "AWAITING_ROUTE", transport: "NO_ROUTE", reason: { code: "NO_INTERNET_ROUTE", message: "Online media requires an internet route." }, retry: { when: "ROUTE_AVAILABLE" } };
      try {
        const item = await read(contentId);
        if (!item) return { state: "FAILED", transport: "INTERNET", reason: { code: "CONTENT_NOT_FOUND", message: "Content was not found in the publication feed." } };
        if (item.id !== contentId) return { state: "FAILED", transport: "INTERNET", reason: { code: "CONTENT_ID_MISMATCH", message: "The reader returned another content object." } };
        // Completion describes this metadata read, not downloaded media bytes.
        return { state: "COMPLETED_SYNCED", transport: "INTERNET", data: { contentId: item.id, metadata: item, availability: "AVAILABLE_REMOTE", source: "ONLINE_API" } };
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.code === "zk_required")) {
          return { state: "STEP_UP_REQUIRED", transport: "INTERNET", reason: { code: error.code, message: error.message } };
        }
        if (error instanceof ApiError && error.status === 403) {
          return { state: "DENIED", transport: "INTERNET", reason: { code: error.code, message: error.message } };
        }
        const noRoute = !connected() || (error instanceof ApiError && error.status === 0);
        return { state: noRoute ? "AWAITING_ROUTE" : "FAILED", transport: noRoute ? "NO_ROUTE" : "INTERNET", reason: { code: noRoute ? "NO_INTERNET_ROUTE" : "ONLINE_READ_FAILED", message: "Online media could not be read." } };
      }
    },
  };
}
