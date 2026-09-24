import type { ExecutionResult, JsonValue, KernelTransport, LocalAssetManifest, LocalAvailabilityState, MediaCapability, ResourceReference, ResourceScope, SavedResource } from "@lifeos/shared";
import type { MediaItem } from "../personalCatalog";
import { createOfflineMediaCapability } from "../offlineKernelRuntime";
import type { SpaceLocalDatabase } from "./database";
import { record, resourceKey, sameScope, validManifest, validMedia, validReference, validSaved, version as validVersion } from "./validation";

export function failure<T extends JsonValue>(code: string, transport: KernelTransport = "NO_ROUTE", state: "FAILED" | "DENIED" | "CONFLICT" | "AWAITING_ROUTE" | "ONLINE_REQUIRED" = "FAILED"): ExecutionResult<T> {
  return { state, transport, reason: { code, message: code.toLowerCase().replaceAll("_", " ") } };
}
export const completed = <T extends JsonValue>(data: T): ExecutionResult<T> => ({ state: "COMPLETED_LOCAL", transport: "NO_ROUTE", data });
export async function sha256(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
}
const mediaRef = (scope: ResourceScope, resourceId: string): ResourceReference => ({ ...scope, resourceId, resourceType: "MEDIA" });
type Inspection = { state: LocalAvailabilityState; manifest?: LocalAssetManifest; bytes?: Uint8Array; media?: MediaItem };

export class SavedResources {
  constructor(private db: SpaceLocalDatabase) {}
  async save(resource: SavedResource<MediaItem>): Promise<ExecutionResult<SavedResource<MediaItem>>> {
    if (!validSaved(resource)) return failure("INVALID_SAVED_RESOURCE");
    if (resource.syncState === "SYNCED") return failure("SYNC_NOT_IMPLEMENTED");
    try {
      // Saving metadata does not fetch, write bytes, or mark the resource downloaded.
      await this.db.write([{ store: "saved", key: resourceKey(resource), value: resource }]);
      return completed(resource);
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  async list(scope: ResourceScope): Promise<ExecutionResult<{ items: SavedResource<MediaItem>[]; rejected: number }>> {
    try {
      const items: SavedResource<MediaItem>[] = [];
      let rejected = 0;
      for (const { key, value } of await this.db.entries("saved")) {
        if (!validSaved(value) || resourceKey(value) !== key) { rejected++; continue; }
        if (sameScope(value, scope)) items.push(value);
      }
      return completed({ items, rejected });
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
}

export class LocalResources {
  constructor(private db: SpaceLocalDatabase, private now: () => number = Date.now) {}
  /** Explicit preloading only. Caller supplies bytes; there is no fetch or auto-sync. */
  async preloadMedia(scope: ResourceScope, media: MediaItem, bytes: Uint8Array, mimeType: string, version = 1, validUntil?: string): Promise<ExecutionResult<LocalAssetManifest>> {
    const reference = mediaRef(scope, media.id);
    if (!validReference(reference) || !validMedia(media) || !validVersion(version) || bytes.length === 0 || !/^(image|video|audio)\/[a-z0-9.+-]+$/i.test(mimeType)) return failure("INVALID_LOCAL_MEDIA");
    try {
      const manifest: LocalAssetManifest = { ...reference, schemaVersion: 1, version, byteLength: bytes.length, sha256: await sha256(bytes), mimeType, storedAt: new Date(this.now()).toISOString(), ...(validUntil ? { validUntil } : {}) };
      if (!validManifest(manifest)) return failure("INVALID_LOCAL_MANIFEST");
      const key = resourceKey(reference);
      await this.db.write([
        { store: "availability", key, value: manifest },
        { store: "assets", key, value: { resourceKey: key, version, media, bytes: new Uint8Array(bytes).buffer } },
      ]);
      return completed(manifest);
    } catch { return failure("LOCAL_STORAGE_UNAVAILABLE"); }
  }
  async inspect(reference: ResourceReference): Promise<Inspection> {
    if (!validReference(reference)) return { state: "CORRUPT" };
    const key = resourceKey(reference);
    const manifest = await this.db.get("availability", key);
    const asset = await this.db.get("assets", key);
    if (manifest === undefined && asset === undefined) return { state: "NOT_PRESENT" };
    if (!validManifest(manifest) || resourceKey(manifest) !== key) return { state: "CORRUPT" };
    if (manifest.validUntil && Date.parse(manifest.validUntil) <= this.now()) return { state: "STALE", manifest };
    if (asset === undefined) return { state: "NOT_PRESENT", manifest };
    if (!record(asset) || asset.resourceKey !== key || asset.version !== manifest.version || !validMedia(asset.media) || asset.media.id !== reference.resourceId || !(asset.bytes instanceof ArrayBuffer)) return { state: "CORRUPT", manifest };
    const bytes = new Uint8Array(asset.bytes);
    if (bytes.length < manifest.byteLength) return { state: "PARTIAL", manifest };
    if (bytes.length !== manifest.byteLength || await sha256(bytes) !== manifest.sha256) return { state: "CORRUPT", manifest };
    return { state: "AVAILABLE_LOCAL", manifest, bytes, media: asset.media };
  }
  capability(scope: ResourceScope, transport: () => KernelTransport): MediaCapability<MediaItem> {
    return {
      mode: "SPACE",
      resolve: async ({ contentId }) => {
        const route = transport();
        try {
          const local = await this.inspect(mediaRef(scope, contentId));
          if (local.state !== "AVAILABLE_LOCAL") {
            const state = local.state === "CORRUPT" ? "FAILED" : route === "NO_ROUTE" ? "AWAITING_ROUTE" : "ONLINE_REQUIRED";
            return failure(`LOCAL_MEDIA_${local.state}`, route, state);
          }
          // Materialize verified bytes for the frozen DK1 adapter; never persist base64 in localStorage.
          let binary = "";
          for (const byte of local.bytes!) binary += String.fromCharCode(byte);
          const media = { ...local.media!, mediaUrl: `data:${local.manifest!.mimeType};base64,${btoa(binary)}` };
          const projection = { version: local.manifest!.version, updatedAt: local.manifest!.storedAt, value: media };
          return createOfflineMediaCapability({ load: async () => projection, save: async () => { throw new Error("Use explicit preloadMedia"); } }, transport).resolve({ contentId });
        } catch { return failure("LOCAL_STORAGE_UNAVAILABLE", route); }
      },
    };
  }
}
