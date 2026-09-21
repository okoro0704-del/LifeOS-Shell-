/**
 * Shared Offline Kernel runtime for TV + Radio.
 * Presentation layers consume this — they do not own separate offline stores.
 */
import { catalogByKinds, type MediaItem } from "./personalCatalog";
import { applyWatchedOffline } from "./personalMonetization";

export const OFFLINE_KERNEL_ID = "lifeos-offline-kernel" as const;

export type OfflineKernelCapability =
  | "local-media"
  | "playlists"
  | "last-played"
  | "cached-stations"
  | "offline-playback";

/** Capabilities provided by the shared offline kernel (infrastructure). */
export const OFFLINE_KERNEL_CAPABILITIES: OfflineKernelCapability[] = [
  "local-media",
  "playlists",
  "last-played",
  "cached-stations",
  "offline-playback",
];

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/**
 * Resolve media for TV/Radio through the shared offline kernel.
 * Online → full catalog for kinds.
 * Offline → owned/consumed local library only (same store as Personal offline filter).
 */
export function kernelMediaFor(kinds: MediaItem["kind"][]): MediaItem[] {
  applyWatchedOffline();
  const pool = catalogByKinds(kinds);
  if (isOnline()) return pool;
  return pool.filter((i) => i.ownedOrConsumed);
}

export function kernelHasLocalContent(kinds: MediaItem["kind"][]): boolean {
  return kernelMediaFor(kinds).length > 0;
}
