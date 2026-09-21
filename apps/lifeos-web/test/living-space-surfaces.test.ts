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
import { SURFACE_SWITCHER_IDLE_MS } from "../src/components/SurfaceSwitcherBar";

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

  it("double-tap summons transparent ghost remote on Personal", () => {
    const gest = readFileSync(join(root, "src/components/NavigationDockGestures.tsx"), "utf8");
    expect(gest).toContain("toggleSwitcher");
    expect(gest).toContain('modeRef.current === "PERSONAL"');
    const bar = readFileSync(join(root, "src/components/SurfaceSwitcherBar.tsx"), "utf8");
    expect(bar).toContain("lifeos-ghost-remote");
    expect(bar).toContain("IconTv");
    expect(bar).toContain("IconBroadcast");
    expect(bar).toContain("BROADCAST_OPTIONS");
    expect(bar).not.toContain("lifeos-surface-switcher__control");
    expect(SURFACE_SWITCHER_IDLE_MS).toBeGreaterThanOrEqual(3000);
    expect(SURFACE_SWITCHER_IDLE_MS).toBeLessThanOrEqual(5000);
  });

  it("Offline kernel lands on bare TV broadcast path", () => {
    expect(personalKernelPath("offline")).toBe("/app/personal/offline");
    const home = readFileSync(join(root, "src/pages/personal/PersonalHomePage.tsx"), "utf8");
    expect(home).toContain("offline-broadcast-landing");
    expect(home).not.toContain('Navigate to="/app/personal/offline/post"');
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).toContain("enterBroadcastSurface");
    expect(nav).toContain('enterBroadcastSurface("TV")');
    expect(nav).toContain('aria-label="My TV"');
    expect(nav).toContain('aria-label="My Radio"');
  });

  it("TV owns fullscreen; Radio is wave-field only", () => {
    const tv = readFileSync(join(root, "src/components/TvSurface.tsx"), "utf8");
    const radio = readFileSync(join(root, "src/components/RadioSurface.tsx"), "utf8");
    const waves = readFileSync(join(root, "src/components/RadioWaveField.tsx"), "utf8");
    expect(tv).toContain('data-kernel="lifeos-offline-kernel"');
    expect(radio).toContain('data-kernel="lifeos-offline-kernel"');
    expect(tv).toContain("seekPublicationId");
    expect(tv).toContain("lifeos-surface--bare");
    expect(tv).not.toContain("key={`tv-ch-");
    expect(radio).toContain("RadioWaveField");
    expect(radio).not.toContain("MediaFeed");
    expect(radio).not.toContain("ImmersiveMediaFeed");
    expect(waves).toContain("radio-wave-field__ring");
    expect(waves).toContain("radio-wave-field__core");
  });

  it("Control peek + Auto/Manual creator tuning", () => {
    const remote = readFileSync(join(root, "src/components/BroadcastRemoteControl.tsx"), "utf8");
    expect(remote).toContain("lifeos-remote-peek");
    expect(remote).toContain("Open Control");
    expect(remote).toContain("Auto");
    expect(remote).toContain("Manual");
    expect(remote).toContain("Next creator");
    expect(remote).toContain("Creator brand name");
    expect(remote).toContain("kernelAdjacentCreatorIndex");
    expect(remote).toContain("kernelIndexForBrand");
    const runtime = readFileSync(join(root, "src/lib/offlineKernelRuntime.ts"), "utf8");
    expect(runtime).toContain("kernelCreatorsFor");
    expect(runtime).toContain("kernelIndexForBrand");
  });

  it("ghost remote CSS is transparent and safe-area aware", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain(".lifeos-ghost-remote");
    expect(css).toContain("safe-area-inset-top");
    expect(css).toContain("backdrop-filter");
    expect(css).toContain("radio-ring-out");
    expect(css).toContain(".lifeos-surface--radio");
    expect(css).toContain("rgba(0, 0, 0, 0.12)");
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
