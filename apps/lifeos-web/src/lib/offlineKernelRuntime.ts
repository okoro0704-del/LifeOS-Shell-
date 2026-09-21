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

/** Brand / creator label for a catalog item (TV station identity). */
export function kernelBrandOf(item: MediaItem): string {
  const brand = (item.author || item.storeDisplayName || item.title || "").trim();
  return brand || "Unknown";
}

/** Unique creator brands in catalog order (first appearance wins). */
export function kernelCreatorsFor(kinds: MediaItem["kind"][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of kernelMediaFor(kinds)) {
    const brand = kernelBrandOf(item);
    const key = brand.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(brand);
  }
  return out;
}

/** Index of first catalog item matching a creator brand name (fuzzy). */
export function kernelIndexForBrand(kinds: MediaItem["kind"][], query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return -1;
  const pool = kernelMediaFor(kinds);
  const exact = pool.findIndex((i) => kernelBrandOf(i).toLowerCase() === q);
  if (exact >= 0) return exact;
  return pool.findIndex((i) => {
    const brand = kernelBrandOf(i).toLowerCase();
    return brand.includes(q) || q.includes(brand);
  });
}

/** Index of first item for the next/prev unique creator relative to `fromIndex`. */
export function kernelAdjacentCreatorIndex(
  kinds: MediaItem["kind"][],
  fromIndex: number,
  direction: "next" | "prev",
): number {
  const pool = kernelMediaFor(kinds);
  if (pool.length === 0) return 0;
  const creators = kernelCreatorsFor(kinds);
  if (creators.length === 0) return 0;
  const cur = pool[((fromIndex % pool.length) + pool.length) % pool.length]!;
  const curBrand = kernelBrandOf(cur).toLowerCase();
  let ci = creators.findIndex((c) => c.toLowerCase() === curBrand);
  if (ci < 0) ci = 0;
  const nextCi =
    direction === "next"
      ? (ci + 1) % creators.length
      : (ci - 1 + creators.length) % creators.length;
  return kernelIndexForBrand(kinds, creators[nextCi]!);
}
