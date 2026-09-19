import { describe, expect, test } from "vitest";
import {
  activeIndexFromScroll,
  clampIndex,
  IMMERSIVE_WINDOW_RADIUS,
  nextFeedIndex,
  previousFeedIndex,
  resolveInitialIndex,
  shouldMountSlide,
  shouldRequestNextPage,
} from "../src/lib/immersiveFeedController";

describe("immersiveFeedController", () => {
  test("one active index from scroll snaps to nearest slide", () => {
    expect(activeIndexFromScroll(0, 800, 5)).toBe(0);
    expect(activeIndexFromScroll(800, 800, 5)).toBe(1);
    expect(activeIndexFromScroll(1600, 800, 5)).toBe(2);
  });

  test("next and previous transitions stay in bounds", () => {
    expect(nextFeedIndex(0, 4)).toBe(1);
    expect(nextFeedIndex(3, 4)).toBe(3);
    expect(previousFeedIndex(2, 4)).toBe(1);
    expect(previousFeedIndex(0, 4)).toBe(0);
  });

  test("snap completion uses clamp", () => {
    expect(clampIndex(99, 3)).toBe(2);
    expect(clampIndex(-1, 3)).toBe(0);
  });

  test("windowing mounts only around active", () => {
    expect(shouldMountSlide(0, 0, 10)).toBe(true);
    expect(shouldMountSlide(2, 0, 10)).toBe(true);
    expect(shouldMountSlide(3, 0, 10)).toBe(false);
    expect(shouldMountSlide(5, 5, 10)).toBe(true);
    expect(shouldMountSlide(8, 5, 10)).toBe(false);
    expect(IMMERSIVE_WINDOW_RADIUS).toBe(2);
  });

  test("deep-link resolves initial publication id", () => {
    const ids = ["a", "b", "c"];
    expect(resolveInitialIndex(ids, "b")).toBe(1);
    expect(resolveInitialIndex(ids, "missing")).toBe(0);
    expect(resolveInitialIndex(ids, null)).toBe(0);
  });

  test("pagination triggers near end", () => {
    expect(shouldRequestNextPage(7, 10, true)).toBe(true);
    expect(shouldRequestNextPage(2, 10, true)).toBe(false);
    expect(shouldRequestNextPage(9, 10, false)).toBe(false);
  });

  test("hysteresis avoids tiny-scroll active flips", () => {
    // still near previous 0 → stay 0 when drift small toward 1
    expect(activeIndexFromScroll(200, 800, 5, 0)).toBe(0);
  });
});
