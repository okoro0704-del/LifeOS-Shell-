import type { ContinuityCheckpoint, ProviderEntitlements, ResourceReference, ResourceScope, SavedResource, SpaceProvider, UserAccessEntitlements } from "@lifeos/shared";
import type { MediaItem } from "../../src/lib/personalCatalog";
import { resourceKey } from "../../src/lib/space-consumption/validation";
import type { SpaceLocalDatabase } from "../../src/lib/space-consumption/database";
import { SpaceDirectory } from "../../src/lib/space-consumption/directory";

export const NOW = Date.parse("2026-01-01T00:00:00Z");
const until = "2030-01-01T00:00:00Z";
export const appUser: UserAccessEntitlements = { appAccess: true, spaceAccess: false, sourceRef: "fixture:access", validUntil: until };
export const spaceUser = { ...appUser, spaceAccess: true };
export function provider(id: string, visibility: SpaceProvider["visibility"] = "PUBLIC"): SpaceProvider {
  return { schemaVersion: 1, spaceId: `space:${id}`, productId: `product:${id}`, providerId: `provider:${id}`, displayName: id === "hotel" ? "Harbour Hotel" : `${id} product`, description: id === "hotel" ? "Hotel information" : "Generic digital product", publisherRef: `publisher:${id}`, visibility, access: "SUBSCRIBER", capabilities: id === "hotel" ? ["space.info"] : ["space.media"], experiences: ["FEED", "WATCH", "CINEMA", "TV"], version: 1, validUntil: until, distributionRef: `fixture:distribution:${id}`, bootstrap: { version: 1, defaultExperienceId: "FEED" } };
}
export const providers = [provider("creator"), provider("hotel"), provider("store", "UNLISTED"), provider("private-business", "PRIVATE"), provider("app-only"), provider("no-discovery"), provider("relationship", "RELATIONSHIP_ONLY")];
export const grants: ProviderEntitlements[] = providers.map(p => ({ providerId: p.providerId, productId: p.productId, sourceRef: p.distributionRef, validUntil: until, appDistribution: true, spacePublish: p.spaceId !== "space:app-only", spaceDistribution: p.spaceId !== "space:app-only", spaceDiscovery: p.spaceId !== "space:no-discovery" }));
export async function seedDirectory(db: SpaceLocalDatabase) {
  const directory = new SpaceDirectory(db, id => grants.find(g => g.providerId === id), () => NOW);
  for (const p of providers) await directory.put(p);
  return directory;
}
export const scope: ResourceScope = { subjectRef: "session:fixture-person", productId: "product:creator", providerId: "provider:creator", spaceId: "space:creator" };
export const reference = { ...scope, resourceId: "content:test-media-001", resourceType: "MEDIA" as const } satisfies ResourceReference;
export const media: MediaItem = { id: reference.resourceId, kind: "music", title: "DK2 local audio", detail: "80-second PCM fixture", free: true, ownedOrConsumed: false, premiumRequired: false };
export const saved: SavedResource<MediaItem> = { ...reference, schemaVersion: 1, metadata: media, durationSeconds: 80, savedAt: new Date(NOW).toISOString(), syncState: "LOCAL_ONLY", availabilityRef: resourceKey(reference) };
export function checkpoint(position = 42, version = 1, device = "PHONE", experience = "FEED"): ContinuityCheckpoint {
  return { ...reference, schemaVersion: 1, version, experience, updatedAt: new Date(NOW + version * 1000).toISOString(), sourceDeviceId: device, syncState: "LOCAL_ONLY", state: { playbackSeconds: position }, reconciliation: { baseVersion: version - 1, correlationId: "fixture:continuity" } };
}
/** Valid 80-second mono PCM WAV, with no remote URLs or codec dependencies. */
export function audioBytes(): Uint8Array {
  const samples = 8000 * 80;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const label = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  label(0, "RIFF"); view.setUint32(4, samples + 36, true); label(8, "WAVE"); label(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  label(36, "data"); view.setUint32(40, samples, true); bytes.fill(128, 44);
  return bytes;
}
