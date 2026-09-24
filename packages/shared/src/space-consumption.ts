import type { JsonValue } from "./kernel-contract.js";

/** Host-supplied commercial projections, never identity or administrative grants. */
export type UserAccessEntitlements = { appAccess: boolean; spaceAccess: boolean; sourceRef: string; validUntil: string };
export type ProviderEntitlements = {
  providerId: string;
  productId: string;
  appDistribution: boolean;
  spacePublish: boolean;
  spaceDistribution: boolean;
  spaceDiscovery: boolean;
  sourceRef: string;
  validUntil: string;
};
export type SpaceVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE" | "RELATIONSHIP_ONLY";
/** Existing canonical IDs are references, not minted here. */
export type SpaceProvider = {
  schemaVersion: 1;
  spaceId: string;
  productId: string;
  providerId: string;
  displayName: string;
  description: string;
  publisherRef: string;
  visibility: SpaceVisibility;
  access: "PUBLIC" | "SUBSCRIBER";
  capabilities: string[];
  experiences: string[];
  version: number;
  validUntil: string;
  distributionRef: string;
  /** Descriptor bootstrap only; does not assert that media bytes are present. */
  bootstrap?: { version: number; defaultExperienceId: string };
  integrityRef?: string;
};
export const RESOURCE_TYPES = ["MEDIA", "FILE", "PRODUCT", "BUSINESS", "SPACE", "ARTICLE", "KNOWLEDGE", "PLAYLIST", "BOOKING_REFERENCE"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type ResourceScope = {
  /** Existing session/profile namespace; not proof of identity. */
  subjectRef: string;
  productId: string;
  providerId: string;
  spaceId: string;
};
export type ResourceReference = ResourceScope & { resourceId: string; resourceType: ResourceType };
export type ResourceSyncState = "LOCAL_ONLY" | "IMPORTED" | "SYNCED";
type SavedBase = ResourceScope & {
  schemaVersion: 1;
  resourceId: string;
  savedAt: string;
  lastAccessedAt?: string;
  syncState: ResourceSyncState;
  availabilityRef: string;
};
export type SavedResource<TMedia extends JsonValue> = SavedBase & (
  | { resourceType: "MEDIA"; metadata: TMedia; durationSeconds?: number; artworkRef?: string }
  | { resourceType: Exclude<ResourceType, "MEDIA">; metadata: { title: string; reference?: string } }
);
export type LocalAvailabilityState = "NOT_PRESENT" | "PARTIAL" | "AVAILABLE_LOCAL" | "CORRUPT" | "STALE";
export type LocalAssetManifest = ResourceReference & {
  schemaVersion: 1;
  version: number;
  byteLength: number;
  sha256: string;
  mimeType: string;
  storedAt: string;
  validUntil?: string;
};
export type ContinuityCheckpoint = ResourceReference & {
  schemaVersion: 1;
  version: number;
  experience: string;
  updatedAt: string;
  sourceDeviceId: string;
  syncState: ResourceSyncState;
  reconciliation?: { baseVersion: number; correlationId: string };
} & (
  | { resourceType: "MEDIA"; state: { playbackSeconds: number } }
  | { resourceType: Exclude<ResourceType, "MEDIA">; state: { cursor: string } }
);
/** Explicit transfer envelope only; no background sync or DataZone implementation. */
export type ContinuityTransfer = { schemaVersion: 1; checkpoint: ContinuityCheckpoint };
