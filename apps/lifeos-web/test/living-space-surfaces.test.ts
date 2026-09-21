import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { personalLandingPath, offlineLoginFallbackPath } from "../src/lib/personalConnectivity";
import { KERNEL_NAV_ORDER, adjacentKernel } from "../src/lib/kernelNavigation";
import {
  OFFLINE_KERNEL_ID,
  kernelMediaFor,
  OFFLINE_KERNEL_CAPABILITIES,
} from "../src/lib/offlineKernelRuntime";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Living Space First + TV/Radio", () => {
  it("lands on Living LifeOS even when offline", () => {
    expect(personalLandingPath()).toBe("/app/personal/post");
    expect(offlineLoginFallbackPath()).toBe("/app/personal/post");
    expect(personalLandingPath()).not.toContain("/offline");
  });

  it("exposes three surfaces and shared offline kernel", () => {
    const ctx = readFileSync(join(root, "src/context/LifeOsSurfaceContext.tsx"), "utf8");
    expect(ctx).toContain("LIVING_LIFEOS");
    expect(ctx).toContain('"TV"');
    expect(ctx).toContain('"RADIO"');
    expect(OFFLINE_KERNEL_ID).toBe("lifeos-offline-kernel");
    expect(OFFLINE_KERNEL_CAPABILITIES.length).toBeGreaterThan(0);
    expect(Array.isArray(kernelMediaFor(["video", "reel"]))).toBe(true);
  });

  it("double-tap summons surface switcher on Personal", () => {
    const gest = readFileSync(join(root, "src/components/NavigationDockGestures.tsx"), "utf8");
    expect(gest).toContain("toggleSwitcher");
    expect(gest).toContain('modeRef.current === "PERSONAL"');
    const bar = readFileSync(join(root, "src/components/SurfaceSwitcherBar.tsx"), "utf8");
    expect(bar).toContain("LifeOS");
    expect(bar).toContain("TV");
    expect(bar).toContain("Radio");
  });

  it("TV and Radio surfaces share offline kernel id", () => {
    const tv = readFileSync(join(root, "src/components/TvSurface.tsx"), "utf8");
    const radio = readFileSync(join(root, "src/components/RadioSurface.tsx"), "utf8");
    expect(tv).toContain('data-kernel="lifeos-offline-kernel"');
    expect(radio).toContain('data-kernel="lifeos-offline-kernel"');
    expect(tv).toContain("kernelMediaFor");
    expect(radio).toContain("kernelMediaFor");
  });

  it("removes Offline as user-facing kernel destination", () => {
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).not.toContain('aria-label="Offline"');
    expect(nav).toContain('aria-label="Main"');
    expect(nav).toContain('aria-label="Free"');
    expect(KERNEL_NAV_ORDER).toEqual(["free", "main"]);
    expect(adjacentKernel("offline", "right")).toBe("free");
    expect(adjacentKernel("offline", "left")).toBe(null);
    const shell = readFileSync(join(root, "src/components/AppShell.tsx"), "utf8");
    expect(shell).not.toContain("Go to the Offline kernel");
    expect(shell).toContain("Stay in LifeOS");
  });

  it("AppShell hosts switcher and surfaces without permanent nav", () => {
    const shell = readFileSync(join(root, "src/components/AppShell.tsx"), "utf8");
    expect(shell).toContain("SurfaceSwitcherBar");
    expect(shell).toContain("TvSurface");
    expect(shell).toContain("RadioSurface");
    expect(shell).toContain("is-living-suspended");
    expect(shell).toContain("content--surface-suspended");
  });
});
