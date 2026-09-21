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
import { personalKernelPath } from "../src/components/shell/nav";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Living Space First + Offline TV/Radio broadcast", () => {
  it("lands on Living LifeOS even when offline (login)", () => {
    expect(personalLandingPath()).toBe("/app/personal/post");
    expect(offlineLoginFallbackPath()).toBe("/app/personal/post");
    expect(personalLandingPath()).not.toContain("/offline");
  });

  it("exposes three surfaces and shared offline kernel", () => {
    const ctx = readFileSync(join(root, "src/context/LifeOsSurfaceContext.tsx"), "utf8");
    expect(ctx).toContain("LIVING_LIFEOS");
    expect(ctx).toContain('"TV"');
    expect(ctx).toContain('"RADIO"');
    expect(ctx).toContain("broadcastMode");
    expect(ctx).toContain("enterBroadcast");
    expect(ctx).toContain("channelUp");
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
    expect(bar).toContain("Control");
    expect(bar).toContain("BROADCAST_OPTIONS");
  });

  it("Offline kernel lands on bare TV broadcast path", () => {
    expect(personalKernelPath("offline")).toBe("/app/personal/offline");
    const home = readFileSync(join(root, "src/pages/personal/PersonalHomePage.tsx"), "utf8");
    expect(home).toContain("offline-broadcast-landing");
    expect(home).not.toContain('Navigate to="/app/personal/offline/post"');
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).toContain('aria-label="Offline"');
    expect(nav).toContain('selectKernel("offline")');
    expect(nav).toContain("enterBroadcast");
  });

  it("TV and Radio surfaces share offline kernel id and channel seek", () => {
    const tv = readFileSync(join(root, "src/components/TvSurface.tsx"), "utf8");
    const radio = readFileSync(join(root, "src/components/RadioSurface.tsx"), "utf8");
    expect(tv).toContain('data-kernel="lifeos-offline-kernel"');
    expect(radio).toContain('data-kernel="lifeos-offline-kernel"');
    expect(tv).toContain("seekPublicationId");
    expect(tv).toContain("lifeos-surface--bare");
  });

  it("Control remote changes channel", () => {
    const remote = readFileSync(join(root, "src/components/BroadcastRemoteControl.tsx"), "utf8");
    expect(remote).toContain("Channel up");
    expect(remote).toContain("Channel down");
    expect(remote).toContain("channelUp");
    expect(remote).toContain("Control remote");
  });

  it("Living swipe stays Free ↔ Main; Offline is broadcast destination", () => {
    expect(KERNEL_NAV_ORDER).toEqual(["free", "main"]);
    expect(adjacentKernel("offline", "right")).toBe("free");
    expect(adjacentKernel("offline", "left")).toBe(null);
  });

  it("AppShell hosts switcher, surfaces, remote, bare broadcast", () => {
    const shell = readFileSync(join(root, "src/components/AppShell.tsx"), "utf8");
    expect(shell).toContain("SurfaceSwitcherBar");
    expect(shell).toContain("BroadcastRemoteControl");
    expect(shell).toContain("TvSurface");
    expect(shell).toContain("RadioSurface");
    expect(shell).toContain("is-broadcast-bare");
    expect(shell).toContain("enterBroadcast");
  });
});
