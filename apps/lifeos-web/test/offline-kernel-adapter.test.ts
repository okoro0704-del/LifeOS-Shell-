import { describe, expect, it } from "vitest";
import { descriptor, resolveCurrentNext } from "@digiconomy/offline-kernel";
import {
  assetReadiness,
  channelSequenceProjection,
  mediaItemProgram,
  mediaItemsProjection,
  stationOf,
} from "../src/lib/offlineKernelMapper";
import { offlineCapability } from "../src/lib/offlineKernelRuntime";

const base = {
  id: "a",
  kind: "video" as const,
  title: "Program",
  detail: "",
  free: true,
  premiumRequired: false,
  ownedOrConsumed: true,
  mediaUrl: "local",
  author: "Station A",
};

describe("LifeOS Offline Kernel adapter", () => {
  it("maps MediaItem into canonical TV and Radio programs with station identity", () => {
    const tv = mediaItemsProjection([base], "space.tv");
    const radio = mediaItemsProjection([{ ...base, id: "r", kind: "music" }], "space.radio");
    expect(stationOf(base)).toBe("Station A");
    expect(tv.value.stations[0]).toMatchObject({ id: "Station A", capability: "space.tv" });
    expect(tv.value.stations[0]?.programs[0]).toMatchObject({ id: "a", kind: "CONTENT", stationId: "Station A" });
    expect(radio.value.stations[0]?.capability).toBe("space.radio");
  });

  it("maps local, remote-only, and missing asset truthfully", () => {
    expect(assetReadiness(base)).toBe("AVAILABLE_LOCAL");
    expect(assetReadiness({ ...base, ownedOrConsumed: false })).toBe("REMOTE_ONLY");
    expect(assetReadiness({ ...base, mediaUrl: undefined })).toBe("MISSING");
  });

  it("projects LifeOS channel order then delegates exact CURRENT/NEXT boundaries", () => {
    const startsAt = new Date("2026-01-01T10:00:00.000Z");
    const projection = channelSequenceProjection(
      [base, { ...base, id: "b", title: "Next", author: "Station B" }],
      0,
      "space.tv",
      startsAt,
    )!;
    const programs = projection.value.stations[0]!.programs;
    expect(resolveCurrentNext(programs, startsAt).current?.id).toBe("a");
    expect(resolveCurrentNext(programs, new Date("2026-01-01T10:01:00.000Z")).current?.id).toBe("b");
    expect(resolveCurrentNext(programs, startsAt).next?.id).toBe("b");
  });

  it("delegates TV, Radio, and call capability states to the canonical package", () => {
    expect(offlineCapability("space.tv").provider).toBe("offline-kernel");
    expect(offlineCapability("space.radio").provider).toBe("offline-kernel");
    expect(offlineCapability("space.call")).toMatchObject({ state: "NOT_IMPLEMENTED", provider: "offline-kernel" });
    expect(descriptor("space.tv", mediaItemsProjection([base], "space.tv")).state).toBe("AVAILABLE");
  });

  it("keeps program mapping explicit and versioned for LifeOS compatibility", () => {
    const program = mediaItemProgram(base, "Station A", new Date("2026-01-01T10:00:00.000Z"));
    const projection = mediaItemsProjection([base], "space.tv", 7);
    expect(program.endsAt).toBe("2026-01-01T10:01:00.000Z");
    expect(projection.version).toBe(7);
  });
});
