import { describe, expect, it } from "vitest";
import {
  adjacentKernel,
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
});
