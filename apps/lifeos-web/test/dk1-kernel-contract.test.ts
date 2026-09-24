import { describe, expect, expectTypeOf, it } from "vitest";
import { EXECUTION_MODES, KERNEL_TRANSPORTS, type ExecutionMode, type ExecutionResult, type MediaCapability, type MediaResolution } from "@lifeos/shared";
import type { MediaItem } from "../src/lib/personalCatalog";
import { MEDIA_PRESENTATIONS, defaultMediaPresentation } from "../src/lib/immersiveFeedController";
import { createDualKernelMedia } from "../src/lib/dualKernelMedia";
import { dk1LocalStore, dk1Media } from "./fixtures/dk1Media";

describe("DK1 shared kernel contract", () => {
  it("has only APP/SPACE execution modes and transport vocabulary without implementations", () => {
    expect(EXECUTION_MODES).toEqual(["APP", "SPACE"]);
    expect(KERNEL_TRANSPORTS).toEqual(["INTERNET", "LOCAL_NETWORK", "NEARBY", "EDGE", "RELAY", "PRELOADED", "NO_ROUTE"]);
    expectTypeOf<MediaCapability<MediaItem>["resolve"]>().returns.toEqualTypeOf<Promise<ExecutionResult<MediaResolution<MediaItem>>>>();
    // These assertions are also compiled by tsconfig.dk1.json.
    // @ts-expect-error Presentation cannot select a kernel.
    const invalidMode: ExecutionMode = "TV";
    // @ts-expect-error QUEUED cannot carry completed data.
    const invalidQueue: ExecutionResult<string> = { state: "QUEUED", data: "remote completion", operationId: "op", transport: "NO_ROUTE", reason: { code: "QUEUED", message: "Pending" } };
    // @ts-expect-error Arbitrary executable values are not serializable payloads.
    const invalidPayload: ExecutionResult<() => void> = { state: "COMPLETED_LOCAL", transport: "PRELOADED", data: () => {} };
    void [invalidMode, invalidQueue, invalidPayload];
  });

  it("round-trips all semantic states with structured reasons and optional metadata", () => {
    const results: ExecutionResult<string>[] = [
      { state: "COMPLETED_LOCAL", transport: "PRELOADED", data: "local" },
      { state: "COMPLETED_SYNCED", transport: "INTERNET", data: "remote" },
      { state: "QUEUED", transport: "NO_ROUTE", operationId: "pending-1", reason: { code: "PENDING", message: "Not remotely completed" }, retry: { when: "ROUTE_AVAILABLE", afterMs: 1000 }, reconciliation: { correlationId: "pending-1", revision: "1" } },
      ...(["AWAITING_ROUTE", "ONLINE_REQUIRED", "STEP_UP_REQUIRED", "CONFLICT", "DENIED", "FAILED"] as const).map(state => ({ state, transport: "NO_ROUTE" as const, reason: { code: state, message: "Not completed" } })),
    ];
    expect(JSON.parse(JSON.stringify(results))).toEqual(results);
    for (const result of results) {
      if (result.state === "COMPLETED_LOCAL" || result.state === "COMPLETED_SYNCED") {
        expectTypeOf(result.data).toEqualTypeOf<string>();
      } else expect(result).not.toHaveProperty("data");
    }
  });

  for (const execution of EXECUTION_MODES) {
    for (const presentation of MEDIA_PRESENTATIONS) {
      it(`${execution} + ${presentation} resolves the same content independently`, async () => {
        const hostSelection = { execution, presentation };
        const media = createDualKernelMedia(await dk1LocalStore(), { connected: () => true, onlineRead: async () => dk1Media });
        const result = await media(hostSelection.execution).resolve({ contentId: dk1Media.id });
        expect(result.state).toBe(execution === "APP" ? "COMPLETED_SYNCED" : "COMPLETED_LOCAL");
        expect(result.data?.contentId).toBe(dk1Media.id);
        expect(hostSelection.presentation).toBe(presentation);
      });
    }
  }

  it("keeps device defaults in host policy without inferring TV from width", () => {
    expect(defaultMediaPresentation({ deviceClass: "PHONE", inputModel: "TOUCH" })).toBe("FEED");
    expect(defaultMediaPresentation({ deviceClass: "TABLET", inputModel: "TOUCH" })).toBe("WATCH");
    expect(defaultMediaPresentation({ deviceClass: "DESKTOP", inputModel: "KEYBOARD_MOUSE", display: { width: 7680, height: 4320 } })).toBe("CINEMA");
    expect(defaultMediaPresentation({ deviceClass: "TV", inputModel: "REMOTE_DPAD", display: { width: 640, height: 480 } })).toBe("TV");
  });
});
