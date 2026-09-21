/**
 * LifeOS Offline Kernel cloud adapter.
 * Device runtime (catalog + localStorage) stays authoritative when offline.
 * When ONLINE and OFFLINE_KERNEL_API_URL is set, prefer cloud station package programs.
 */

import { catalogByKinds, type MediaItem } from "./personalCatalog";
import { applyWatchedOffline } from "./personalMonetization";

export const OFFLINE_KERNEL_ID = "lifeos-offline-kernel" as const;

export type OfflineKernelCapability =
  | "local-media"
  | "playlists"
  | "last-played"
  | "cached-stations"
  | "offline-playback"
  | "cloud-station-sync";

export const OFFLINE_KERNEL_CAPABILITIES: OfflineKernelCapability[] = [
  "local-media",
  "playlists",
  "last-played",
  "cached-stations",
  "offline-playback",
  "cloud-station-sync",
];

type CloudProgram = {
  id: string;
  channelType: "TV" | "RADIO";
  title: string;
  assetId: string | null;
  mediaUrl: string | null;
  coverUrl: string | null;
  durationMs: number;
};

type CloudPackageCache = {
  stationId: string;
  fetchedAt: number;
  programs: CloudProgram[];
};

const PACKAGE_TTL_MS = 60_000;
let packageCache: CloudPackageCache | null = null;

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function kernelApiUrl(): string {
  const fromEnv =
    (typeof import.meta !== "undefined" &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_OFFLINE_KERNEL_API_URL) ||
    "";
  return String(fromEnv || "").replace(/\/$/, "");
}

export async function syncStationPackage(stationIdOrSlug: string): Promise<CloudProgram[]> {
  const base = kernelApiUrl();
  if (!base || !isOnline()) return packageCache?.programs ?? [];
  try {
    const res = await fetch(`${base}/v1/stations/${encodeURIComponent(stationIdOrSlug)}/package`);
    if (!res.ok) return packageCache?.programs ?? [];
    const pkg = (await res.json()) as { stationId: string; programs: CloudProgram[] };
    packageCache = {
      stationId: pkg.stationId,
      fetchedAt: Date.now(),
      programs: pkg.programs ?? [],
    };
    return packageCache.programs;
  } catch {
    return packageCache?.programs ?? [];
  }
}

function cloudProgramsAsMedia(kinds: MediaItem["kind"][]): MediaItem[] {
  if (!packageCache || Date.now() - packageCache.fetchedAt > PACKAGE_TTL_MS * 5) return [];
  const wantTv = kinds.some((k) => k === "video" || k === "reel");
  const wantRadio = kinds.some((k) => k === "music" || k === "podcast");
  return packageCache.programs
    .filter((p) => (p.channelType === "TV" && wantTv) || (p.channelType === "RADIO" && wantRadio))
    .filter((p) => Boolean(p.mediaUrl))
    .map((p) => ({
      id: p.assetId || p.id,
      kind: (p.channelType === "RADIO" ? "music" : "video") as MediaItem["kind"],
      title: p.title,
      detail: "Station program",
      free: true,
      ownedOrConsumed: true,
      premiumRequired: false,
      mediaUrl: p.mediaUrl!,
      posterUrl: p.coverUrl || undefined,
      author: packageCache?.stationId,
    }));
}

/**
 * Resolve media for TV/Radio through the Offline Kernel adapter.
 * Prefer cloud package when synced; otherwise local catalog.
 * Offline → owned/consumed local library only.
 */
export function kernelMediaFor(kinds: MediaItem["kind"][]): MediaItem[] {
  applyWatchedOffline();
  const cloud = cloudProgramsAsMedia(kinds);
  if (cloud.length && isOnline()) return cloud;
  if (cloud.length && !isOnline()) return cloud;
  const pool = catalogByKinds(kinds);
  if (isOnline()) return pool;
  return pool.filter((i) => i.ownedOrConsumed);
}

export function kernelHasLocalContent(kinds: MediaItem["kind"][]): boolean {
  return kernelMediaFor(kinds).length > 0;
}

export function kernelBrandOf(item: MediaItem): string {
  const brand = (item.author || item.storeDisplayName || item.title || "").trim();
  return brand || "Unknown";
}

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
