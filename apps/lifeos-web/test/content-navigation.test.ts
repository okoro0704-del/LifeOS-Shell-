import { describe, expect, it } from "vitest";
import {
  personalKernelFromPath,
  personalKernelPath,
  PERSONAL_KERNEL_ORDER,
} from "../src/components/shell/nav";

describe("content navigation kernel contracts", () => {
  it("keeps Free / Offline / Main as canonical kernels", () => {
    expect(PERSONAL_KERNEL_ORDER).toEqual(["free", "offline", "main"]);
  });

  it("FREE routes through existing free kernel path", () => {
    expect(personalKernelPath("free")).toBe("/app/personal/free/post");
    expect(personalKernelFromPath("/app/personal/free/post")).toBe("free");
  });

  it("OFFLINE routes through bare broadcast Offline path", () => {
    expect(personalKernelPath("offline")).toBe("/app/personal/offline");
    expect(personalKernelFromPath("/app/personal/offline")).toBe("offline");
    expect(personalKernelFromPath("/app/personal/offline/reels")).toBe("offline");
  });

  it("LIVE stays separate from Main kernel path (Live surface)", () => {
    expect(personalKernelPath("main")).toBe("/app/personal/post");
    expect(personalKernelFromPath("/app/live")).toBeNull();
  });

  it("detects immersive home paths for content-nav docking", () => {
    const immersive =
      /^\/app\/personal(\/(free|offline))?\/(post|reels)$/;
    expect(immersive.test("/app/personal/post")).toBe(true);
    expect(immersive.test("/app/personal/free/reels")).toBe(true);
    expect(immersive.test("/app/personal/products")).toBe(false);
    expect(immersive.test("/app/personal/communities")).toBe(false);
  });
});
