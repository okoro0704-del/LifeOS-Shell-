import { resolveCurrentNext, type Program } from "@digiconomy/offline-kernel";
import { channelSequenceProjection } from "./offlineKernelMapper";
import { kernelBrandOf, kernelMediaFor } from "./offlineKernelRuntime";
import type { MediaItem } from "./personalCatalog";

export type BroadcastScheduleEntry = { title: string; creator: string; live: boolean };
export type BroadcastSchedule = { stationName: string; now: BroadcastScheduleEntry; next: BroadcastScheduleEntry };

const NOT_SCHEDULED: BroadcastScheduleEntry = { title: "Not scheduled", creator: "", live: false };

function kindsFor(surface: "TV" | "RADIO"): MediaItem["kind"][] {
  return surface === "RADIO" ? ["music", "podcast"] : ["video", "reel"];
}

function entry(program: Program | undefined): BroadcastScheduleEntry {
  if (!program) return NOT_SCHEDULED;
  const metadata = program.metadata ?? {};
  return {
    title: typeof metadata.title === "string" && metadata.title ? metadata.title : "Not scheduled",
    creator: typeof metadata.creator === "string" ? metadata.creator : program.stationId,
    live: metadata.live === true,
  };
}

/**
 * LifeOS compatibility projection over the canonical CURRENT/NEXT resolver.
 * Channel order and station naming remain LifeOS concerns.
 */
export function broadcastSchedule(surface: "TV" | "RADIO", channelIndex: number): BroadcastSchedule {
  const catalog = kernelMediaFor(kindsFor(surface));
  const capability = surface === "RADIO" ? "space.radio" : "space.tv";
  const projection = channelSequenceProjection(catalog, channelIndex, capability, new Date());
  if (!projection) {
    return {
      stationName: surface === "RADIO" ? "Radio" : "TV",
      now: NOT_SCHEDULED,
      next: NOT_SCHEDULED,
    };
  }
  const { current, next } = resolveCurrentNext(projection.value.stations[0]!.programs, new Date());
  const selected = ((channelIndex % catalog.length) + catalog.length) % catalog.length;
  const brand = kernelBrandOf(catalog[selected]!);
  const suffix = surface === "RADIO" ? " Radio" : " TV";
  return { stationName: `${brand}${suffix}`, now: entry(current), next: entry(next) };
}

export function broadcastKinds(surface: "TV" | "RADIO"): MediaItem["kind"][] {
  return kindsFor(surface);
}
