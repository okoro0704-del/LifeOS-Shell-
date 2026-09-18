import { describe, expect, it } from "vitest";
import {
  adjacentKernel,
  evaluateKernelSwipe,
  KERNEL_NAV_ORDER,
  kernelDisplayName,
} from "../src/lib/kernelNavigation";

describe("kernel navigation", () => {
  it("uses canonical Free → Offline → Main order", () => {
    expect(KERNEL_NAV_ORDER).toEqual(["free", "offline", "main"]);
  });

  it("maps display names", () => {
    expect(kernelDisplayName("free")).toBe("Free");
    expect(kernelDisplayName("offline")).toBe("Offline");
    expect(kernelDisplayName("main")).toBe("Main");
  });

  it("swipes left toward Main without wrapping", () => {
    expect(adjacentKernel("free", "left")).toBe("offline");
    expect(adjacentKernel("offline", "left")).toBe("main");
    expect(adjacentKernel("main", "left")).toBeNull();
  });

  it("swipes right toward Free without wrapping", () => {
    expect(adjacentKernel("main", "right")).toBe("offline");
    expect(adjacentKernel("offline", "right")).toBe("free");
    expect(adjacentKernel("free", "right")).toBeNull();
  });

  it("recognizes horizontal multi-finger swipe left/right", () => {
    const left = [
      { dx: -90, dy: 8, dtMs: 180 },
      { dx: -95, dy: -4, dtMs: 180 },
      { dx: -88, dy: 10, dtMs: 180 },
    ];
    expect(evaluateKernelSwipe(left, 3)).toBe("left");
    const right = left.map((s) => ({ ...s, dx: -s.dx }));
    expect(evaluateKernelSwipe(right, 3)).toBe("right");
  });

  it("rejects vertical or under-threshold motion", () => {
    expect(
      evaluateKernelSwipe(
        [
          { dx: -40, dy: 10, dtMs: 200 },
          { dx: -42, dy: 12, dtMs: 200 },
          { dx: -38, dy: 8, dtMs: 200 },
        ],
        3,
      ),
    ).toBeNull();
    expect(
      evaluateKernelSwipe(
        [
          { dx: -20, dy: -120, dtMs: 200 },
          { dx: -10, dy: -110, dtMs: 200 },
          { dx: -15, dy: -130, dtMs: 200 },
        ],
        3,
      ),
    ).toBeNull();
  });

  it("requires configured pointer count", () => {
    const samples = [
      { dx: -100, dy: 0, dtMs: 160 },
      { dx: -100, dy: 0, dtMs: 160 },
    ];
    expect(evaluateKernelSwipe(samples, 3)).toBeNull();
    expect(evaluateKernelSwipe(samples, 2)).toBe("left");
  });
});
