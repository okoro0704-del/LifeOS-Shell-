import { RESOURCE_TYPES, type ContinuityCheckpoint, type LocalAssetManifest, type ResourceReference, type ResourceScope, type SavedResource, type SpaceProvider } from "@lifeos/shared";
import type { MediaItem } from "../personalCatalog";

export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
export const date = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
export const version = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text);
const sync = (v: unknown) => v === "LOCAL_ONLY" || v === "IMPORTED" || v === "SYNCED";
const nonnegative = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
export function validScope(v: unknown): v is ResourceScope & Record<string, unknown> {
  return record(v) && [v.subjectRef, v.productId, v.providerId, v.spaceId].every(text);
}
export function validReference(v: unknown): v is ResourceReference & Record<string, unknown> {
  return validScope(v) && record(v) && text(v.resourceId) && RESOURCE_TYPES.includes(v.resourceType as never);
}
export function resourceKey(v: ResourceReference): string {
  return JSON.stringify([v.subjectRef, v.productId, v.providerId, v.spaceId, v.resourceType, v.resourceId]);
}
export function sameScope(v: ResourceScope, scope: ResourceScope): boolean {
  return v.subjectRef === scope.subjectRef && v.productId === scope.productId && v.providerId === scope.providerId && v.spaceId === scope.spaceId;
}
export function validMedia(v: unknown): v is MediaItem {
  return record(v) && text(v.id) && text(v.title) && typeof v.detail === "string" &&
    ["video", "picture", "reel", "music", "podcast", "book", "course", "edu", "school", "post", "info"].includes(String(v.kind)) &&
    [v.free, v.ownedOrConsumed, v.premiumRequired].every(x => typeof x === "boolean") &&
    [v.mediaUrl, v.posterUrl].every(x => x === undefined || typeof x === "string");
}
export function validSaved(v: unknown): v is SavedResource<MediaItem> {
  if (!record(v) || !validReference(v) || v.schemaVersion !== 1 || !date(v.savedAt) || !sync(v.syncState) || v.availabilityRef !== resourceKey(v)) return false;
  if (v.lastAccessedAt !== undefined && !date(v.lastAccessedAt)) return false;
  return v.resourceType === "MEDIA"
    ? validMedia(v.metadata) && v.metadata.id === v.resourceId && (v.durationSeconds === undefined || nonnegative(v.durationSeconds))
    : record(v.metadata) && text(v.metadata.title);
}
export function validProvider(v: unknown): v is SpaceProvider {
  if (!record(v) || v.schemaVersion !== 1 || !version(v.version) || !date(v.validUntil)) return false;
  if (![v.spaceId, v.productId, v.providerId, v.displayName, v.publisherRef, v.distributionRef].every(text) || typeof v.description !== "string") return false;
  if (!["PUBLIC", "UNLISTED", "PRIVATE", "RELATIONSHIP_ONLY"].includes(String(v.visibility)) || !["PUBLIC", "SUBSCRIBER"].includes(String(v.access))) return false;
  if (!strings(v.capabilities) || !strings(v.experiences) || v.experiences.length === 0 || v.experiences.includes("SPACE")) return false;
  return v.bootstrap === undefined || (record(v.bootstrap) && version(v.bootstrap.version) && text(v.bootstrap.defaultExperienceId) && v.experiences.includes(v.bootstrap.defaultExperienceId));
}
export function validManifest(v: unknown): v is LocalAssetManifest {
  return record(v) && validReference(v) && v.schemaVersion === 1 && version(v.version) && version(v.byteLength) &&
    typeof v.sha256 === "string" && /^[a-f0-9]{64}$/.test(v.sha256) && text(v.mimeType) && date(v.storedAt) && (v.validUntil === undefined || date(v.validUntil));
}
export function validCheckpoint(v: unknown): v is ContinuityCheckpoint {
  if (!record(v) || !validReference(v) || v.schemaVersion !== 1 || !version(v.version) || !date(v.updatedAt) || !sync(v.syncState) || !text(v.experience) || !text(v.sourceDeviceId) || !record(v.state)) return false;
  if (v.reconciliation !== undefined && (!record(v.reconciliation) || !Number.isSafeInteger(v.reconciliation.baseVersion) || Number(v.reconciliation.baseVersion) < 0 || !text(v.reconciliation.correlationId))) return false;
  return v.resourceType === "MEDIA" ? nonnegative(v.state.playbackSeconds) : typeof v.state.cursor === "string";
}
