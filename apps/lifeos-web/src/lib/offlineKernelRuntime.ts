/**
 * LifeOS Offline Kernel cloud adapter.
 * Device runtime (catalog + localStorage) stays authoritative when offline.
 * When ONLINE and OFFLINE_KERNEL_API_URL is set, prefer cloud station package programs.
 */

import { catalogByKinds, type MediaItem } from "./personalCatalog";
import { applyWatchedOffline } from "./personalMonetization";
import {
  MemoryLastValidStore,
  descriptor,
  synchronizeProjection,
  type CapabilityDescriptor,
  type ScheduleProjection,
  type VersionedProjection,
} from "@digiconomy/offline-kernel";
import { mediaItemsProjection } from "./offlineKernelMapper";
import type { LastValidStore } from "@digiconomy/offline-kernel";
import type { KernelTransport, MediaCapability } from "@lifeos/shared";

export const OFFLINE_KERNEL_ID = "lifeos-offline-kernel" as const;

/** DK1 supports self-contained data assets only, not URL/ownership-based cache claims. */
function hasInlineMedia(item: MediaItem): boolean {
  const url = item.mediaUrl || (item.kind === "picture" ? item.posterUrl : undefined);
  const match = /^data:(?:image|audio|video)\/[a-z0-9.+-]+;base64,([a-z0-9+/]+={0,2})$/i.exec(url ?? "");
  if (!match) return false;
  try { return atob(match[1]).length > 0; } catch { return false; }
}

/**
 * SPACE reads an explicitly supplied canonical local projection store only.
 * The caller supplies synchronized/preloaded MediaItem data; this does not sync,
 * download, reconcile, or infer media bytes from ownedOrConsumed.
 */
export function createOfflineMediaCapability(
  store: LastValidStore<MediaItem>,
  transport: () => KernelTransport = () => isOnline() ? "INTERNET" : "NO_ROUTE",
): MediaCapability<MediaItem> {
  return {
    mode: "SPACE",
    async resolve({ contentId }) {
      const route = transport();
      try {
        const projection = await store.load(contentId);
        if (projection && (!Number.isFinite(projection.version) || !Number.isFinite(Date.parse(projection.updatedAt)) || projection.value?.id !== contentId)) {
          return { state: "FAILED", transport: route, reason: { code: "INVALID_LOCAL_PROJECTION", message: "Local projection identity or version is invalid." } };
        }
        if (projection && hasInlineMedia(projection.value)) {
          return { state: "COMPLETED_LOCAL", transport: route, data: { contentId, metadata: projection.value, availability: "AVAILABLE_LOCAL", source: "LOCAL_PROJECTION" } };
        }
        return { state: route === "NO_ROUTE" ? "AWAITING_ROUTE" : "ONLINE_REQUIRED", transport: route, reason: { code: "MEDIA_NOT_LOCAL", message: "No verified local media data exists for this content." }, retry: { when: route === "NO_ROUTE" ? "ROUTE_AVAILABLE" : "USER_ACTION" } };
      } catch {
        return { state: "FAILED", transport: route, reason: { code: "LOCAL_STORE_UNAVAILABLE", message: "Local media storage could not be read." } };
      }
    },
  };
}

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
const stationProjectionStore = new MemoryLastValidStore<ScheduleProjection>();

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
    const candidate: CloudPackageCache = {
      stationId: pkg.stationId,
      fetchedAt: Date.now(),
      programs: pkg.programs ?? [],
    };
    const accepted = await synchronizeProjection(stationProjectionStore, candidate.stationId, {
      fetch: async () => cloudProjection(candidate),
    });
    if (!accepted || accepted.version !== candidate.fetchedAt) return packageCache?.programs ?? [];
    packageCache = candidate;
    return packageCache.programs;
  } catch {
    return packageCache?.programs ?? [];
  }
}

function cloudProgramsAsMedia(kinds: MediaItem["kind"][], source = packageCache): MediaItem[] {
  if (!source || Date.now() - source.fetchedAt > PACKAGE_TTL_MS * 5) return [];
  const wantTv = kinds.some((k) => k === "video" || k === "reel");
  const wantRadio = kinds.some((k) => k === "music" || k === "podcast");
  return source.programs
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
      author: source.stationId,
    }));
}

function cloudProjection(source: CloudPackageCache): VersionedProjection<ScheduleProjection> {
  const media = cloudProgramsAsMedia(["video", "reel", "music", "podcast"], source);
  const tv = mediaItemsProjection(media.filter((item) => item.kind === "video" || item.kind === "reel"), "space.tv", source.fetchedAt);
  const radio = mediaItemsProjection(media.filter((item) => item.kind === "music" || item.kind === "podcast"), "space.radio", source.fetchedAt);
  return { version: source.fetchedAt, updatedAt: new Date(source.fetchedAt).toISOString(), value: { stations: [...tv.value.stations, ...radio.value.stations] } };
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

/** LifeOS adapter: maps its catalog into the canonical capability descriptor. */
export function offlineCapability(capability: "space.tv" | "space.radio" | "space.call"): CapabilityDescriptor {
  if (capability === "space.call") return descriptor(capability);
  const kinds: MediaItem["kind"][] = capability === "space.radio" ? ["music", "podcast"] : ["video", "reel"];
  return descriptor(capability, mediaItemsProjection(kernelMediaFor(kinds), capability));
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
