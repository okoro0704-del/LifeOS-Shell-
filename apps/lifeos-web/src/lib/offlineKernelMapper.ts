import type {
  CapabilityId,
  LocalAssetState,
  Program,
  ScheduleProjection,
  Station,
  VersionedProjection,
} from "@digiconomy/offline-kernel";
import type { MediaItem } from "./personalCatalog";

const PROGRAM_WINDOW_MS = 60_000;

export function stationOf(item: MediaItem): string {
  return (item.author || item.storeDisplayName || item.title || "Unknown").trim() || "Unknown";
}

/** Convert LifeOS ownership/media facts into the canonical asset state. */
export function assetReadiness(item: MediaItem): LocalAssetState {
  if (!item.mediaUrl) return "MISSING";
  return item.ownedOrConsumed ? "AVAILABLE_LOCAL" : "REMOTE_ONLY";
}

export function mediaItemProgram(item: MediaItem, stationId: string, startsAt: Date): Program {
  return {
    id: item.id,
    stationId,
    kind: item.live ? "LIVE" : "CONTENT",
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + PROGRAM_WINDOW_MS).toISOString(),
    assets: [assetReadiness(item)],
    metadata: { title: item.title, creator: stationOf(item), live: Boolean(item.live) },
  };
}

/** Map LifeOS catalog entries to a canonical station projection. */
export function mediaItemsProjection(
  items: MediaItem[],
  capability: "space.tv" | "space.radio",
  version = 1,
  startsAt = new Date(0),
): VersionedProjection<ScheduleProjection> {
  const byStation = new Map<string, MediaItem[]>();
  for (const item of items) {
    const id = stationOf(item);
    byStation.set(id, [...(byStation.get(id) ?? []), item]);
  }
  const stations: Station[] = [...byStation].map(([id, entries]) => ({
    id,
    capability,
    programs: entries.map((item, index) =>
      mediaItemProgram(item, id, new Date(startsAt.getTime() + index * PROGRAM_WINDOW_MS)),
    ),
  }));
  return { version, updatedAt: new Date().toISOString(), value: { stations } };
}

/**
 * LifeOS owns channel ordering. It projects the selected channel and its
 * product-defined successor into a canonical time sequence; the canonical
 * package is the sole CURRENT/NEXT resolver.
 */
export function channelSequenceProjection(
  catalog: MediaItem[],
  channelIndex: number,
  capability: CapabilityId,
  now = new Date(),
): VersionedProjection<ScheduleProjection> | undefined {
  if (catalog.length === 0) return undefined;
  const currentIndex = ((channelIndex % catalog.length) + catalog.length) % catalog.length;
  const current = catalog[currentIndex]!;
  const creator = stationOf(current).toLowerCase();
  let nextIndex = -1;
  for (let offset = 1; offset < catalog.length; offset += 1) {
    const candidate = (currentIndex + offset) % catalog.length;
    if (stationOf(catalog[candidate]!).toLowerCase() === creator) {
      nextIndex = candidate;
      break;
    }
  }
  if (nextIndex < 0) nextIndex = (currentIndex + 1) % catalog.length;
  const sequence = [current, catalog[nextIndex]!];
  const stationId = stationOf(current);
  const station: Station = {
    id: stationId,
    capability,
    programs: sequence.map((item, index) =>
      mediaItemProgram(item, stationId, new Date(now.getTime() + index * PROGRAM_WINDOW_MS)),
    ),
  };
  return { version: 1, updatedAt: now.toISOString(), value: { stations: [station] } };
}
