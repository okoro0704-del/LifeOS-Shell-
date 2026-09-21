import { kernelMediaFor } from "./offlineKernelRuntime";
import type { MediaItem } from "./personalCatalog";

export type BroadcastScheduleEntry = {
  title: string;
  creator: string;
};

export type BroadcastSchedule = {
  now: BroadcastScheduleEntry;
  next: BroadcastScheduleEntry;
};

const NOT_SCHEDULED: BroadcastScheduleEntry = {
  title: "Not scheduled",
  creator: "",
};

function normalizedIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function entry(item: MediaItem | undefined): BroadcastScheduleEntry {
  if (!item) return NOT_SCHEDULED;
  return {
    title: item.title || "Not scheduled",
    creator: item.author || item.storeDisplayName || "",
  };
}

/** Resolve the live Now/Next lineup directly from the Offline kernel catalog. */
export function broadcastSchedule(
  surface: "TV" | "RADIO",
  channelIndex: number,
): BroadcastSchedule {
  const kinds: MediaItem["kind"][] =
    surface === "RADIO" ? ["music", "podcast"] : ["video", "reel"];
  const catalog = kernelMediaFor(kinds);
  if (catalog.length === 0) {
    return { now: NOT_SCHEDULED, next: NOT_SCHEDULED };
  }
  const current = normalizedIndex(channelIndex, catalog.length);
  return {
    now: entry(catalog[current]),
    next: entry(catalog[(current + 1) % catalog.length]),
  };
}
