import { kernelBrandOf, kernelMediaFor } from "./offlineKernelRuntime";
import type { MediaItem } from "./personalCatalog";

export type BroadcastScheduleEntry = {
  title: string;
  creator: string;
  live: boolean;
};

export type BroadcastSchedule = {
  /** Station identity for the active creator channel. */
  stationName: string;
  now: BroadcastScheduleEntry;
  next: BroadcastScheduleEntry;
};

const NOT_SCHEDULED: BroadcastScheduleEntry = {
  title: "Not scheduled",
  creator: "",
  live: false,
};

function normalizedIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function entry(item: MediaItem | undefined): BroadcastScheduleEntry {
  if (!item) return NOT_SCHEDULED;
  return {
    title: item.title || "Not scheduled",
    creator: kernelBrandOf(item),
    live: Boolean(item.live),
  };
}

function kindsFor(surface: "TV" | "RADIO"): MediaItem["kind"][] {
  return surface === "RADIO" ? ["music", "podcast"] : ["video", "reel"];
}

function nextForCreator(catalog: MediaItem[], current: number): MediaItem | undefined {
  if (catalog.length === 0) return undefined;
  const brand = kernelBrandOf(catalog[current]!).toLowerCase();
  for (let i = 1; i < catalog.length; i++) {
    const idx = (current + i) % catalog.length;
    if (kernelBrandOf(catalog[idx]!).toLowerCase() === brand) {
      return catalog[idx];
    }
  }
  return catalog[(current + 1) % catalog.length];
}

/** Resolve Now/Next + station identity from the Offline kernel catalog. */
export function broadcastSchedule(
  surface: "TV" | "RADIO",
  channelIndex: number,
): BroadcastSchedule {
  const catalog = kernelMediaFor(kindsFor(surface));
  if (catalog.length === 0) {
    return {
      stationName: surface === "RADIO" ? "Radio" : "TV",
      now: NOT_SCHEDULED,
      next: NOT_SCHEDULED,
    };
  }
  const current = normalizedIndex(channelIndex, catalog.length);
  const nowItem = catalog[current]!;
  const brand = kernelBrandOf(nowItem);
  const suffix = surface === "RADIO" ? " Radio" : " TV";
  return {
    stationName: brand ? `${brand}${suffix}` : surface === "RADIO" ? "Radio" : "TV",
    now: entry(nowItem),
    next: entry(nextForCreator(catalog, current)),
  };
}

export function broadcastKinds(surface: "TV" | "RADIO"): MediaItem["kind"][] {
  return kindsFor(surface);
}
