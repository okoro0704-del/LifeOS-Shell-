import { describe, expect, it } from "vitest";
import {
  KERNEL_NAV_ORDER,
  adjacentKernel,
  evaluateKernelSwipe,
  getKernelSwipeFingers,
  kernelDisplayName,
  KERNEL_SWIPE_MIN_DX,
} from "../src/lib/kernelNavigation";

describe("kernel navigation", () => {
  it("uses canonical Free ↔ Main order (Offline is infrastructure)", () => {
    expect(KERNEL_NAV_ORDER).toEqual(["free", "main"]);
  });

  it("maps display names", () => {
    expect(kernelDisplayName("free")).toBe("Free");
    expect(kernelDisplayName("main")).toBe("Main");
    expect(kernelDisplayName("offline")).toBe("Offline");
  });

  it("always uses 2-finger swipe (avoids Android screenshot)", () => {
    expect(getKernelSwipeFingers()).toBe(2);
  });

  it("swipes left toward Main without wrapping", () => {
    expect(adjacentKernel("free", "left")).toBe("main");
    expect(adjacentKernel("main", "left")).toBe(null);
  });

  it("swipes right toward Free without wrapping", () => {
    expect(adjacentKernel("main", "right")).toBe("free");
    expect(adjacentKernel("free", "right")).toBe(null);
  });

  it("treats legacy offline position as Main for swipe peers", () => {
    expect(adjacentKernel("offline", "right")).toBe("free");
    expect(adjacentKernel("offline", "left")).toBe(null);
  });

  it("recognizes horizontal 2-finger swipe left/right", () => {
    const left = evaluateKernelSwipe(
      [
        { dx: -KERNEL_SWIPE_MIN_DX - 10, dy: 2, dtMs: 180 },
        { dx: -KERNEL_SWIPE_MIN_DX - 8, dy: -1, dtMs: 180 },
      ],
      2,
    );
    const right = evaluateKernelSwipe(
      [
        { dx: KERNEL_SWIPE_MIN_DX + 10, dy: 2, dtMs: 180 },
        { dx: KERNEL_SWIPE_MIN_DX + 8, dy: -1, dtMs: 180 },
      ],
      2,
    );
    expect(left).toBe("left");
    expect(right).toBe("right");
  });

  it("rejects vertical or under-threshold motion", () => {
    expect(
      evaluateKernelSwipe(
        [
          { dx: 20, dy: 90, dtMs: 200 },
          { dx: 18, dy: 88, dtMs: 200 },
        ],
        2,
      ),
    ).toBe(null);
  });

  it("requires exactly 2 pointers", () => {
    expect(
      evaluateKernelSwipe([{ dx: -KERNEL_SWIPE_MIN_DX - 20, dy: 0, dtMs: 100 }], 2),
    ).toBe(null);
  });
});
