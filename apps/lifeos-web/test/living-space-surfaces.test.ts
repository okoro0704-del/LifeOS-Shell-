import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { personalLandingPath, offlineLoginFallbackPath } from "../src/lib/personalConnectivity";
import { KERNEL_NAV_ORDER, adjacentKernel } from "../src/lib/kernelNavigation";
import {
  OFFLINE_KERNEL_ID,
  kernelAdjacentCreatorIndex,
  kernelCreatorsFor,
  kernelMediaFor,
  OFFLINE_KERNEL_CAPABILITIES,
} from "../src/lib/offlineKernelRuntime";
import { broadcastSchedule } from "../src/lib/broadcastSchedule";
import { personalKernelPath } from "../src/components/shell/nav";
import {
  BROADCAST_REMOTE_IDLE_MS,
  SURFACE_SWITCHER_IDLE_MS,
} from "../src/components/SurfaceSwitcherBar";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Living Space First + Offline TV/Radio broadcast", () => {
  it("lands on Living LifeOS even when offline (login)", () => {
    expect(personalLandingPath()).toBe("/app/personal/post");
    expect(offlineLoginFallbackPath()).toBe("/app/personal/post");
    expect(personalLandingPath()).not.toContain("/offline");
  });

  it("exposes Living, Offline hub, TV and Radio with broadcast UI modes", () => {
    const ctx = readFileSync(join(root, "src/context/LifeOsSurfaceContext.tsx"), "utf8");
    expect(ctx).toContain("LIVING_LIFEOS");
    expect(ctx).toContain('"TV"');
    expect(ctx).toContain('"RADIO"');
    expect(ctx).toContain('"OFFLINE_HUB"');
    expect(ctx).toContain("broadcastMode");
    expect(ctx).toContain("enterBroadcast");
    expect(ctx).toContain("channelUp");
    expect(ctx).toContain('BroadcastUiMode = "HIDDEN" | "REMOTE_REVEALED" | "PROGRAM_INFO_REVEALED"');
    expect(ctx).toContain("openRemoteReveal");
    expect(ctx).toContain("openProgramInfo");
    expect(ctx).toContain("radioChannel");
    expect(OFFLINE_KERNEL_ID).toBe("lifeos-offline-kernel");
    expect(OFFLINE_KERNEL_CAPABILITIES.length).toBeGreaterThan(0);
    expect(Array.isArray(kernelMediaFor(["video", "reel"]))).toBe(true);
  });

  it("Offline kernel lands on its TV/Radio hub", () => {
    expect(personalKernelPath("offline")).toBe("/app/personal/offline");
    const home = readFileSync(join(root, "src/pages/personal/PersonalHomePage.tsx"), "utf8");
    expect(home).toContain("offline-broadcast-landing");
    expect(home).not.toContain('Navigate to="/app/personal/offline/post"');
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).toContain("enterOffline");
    expect(nav).toContain('aria-label="Offline"');
    expect(nav).not.toContain('aria-label="My TV"');
    expect(nav).not.toContain('aria-label="My Radio"');
    expect(nav).toContain("onOfflineHub");
    expect(nav).toContain("if (onOfflineHub) return null");
    const hub = readFileSync(join(root, "src/components/OfflineHubSurface.tsx"), "utf8");
    expect(hub).toContain('setSurface("TV")');
    expect(hub).toContain("offline-hub__online");
    expect(hub).toContain("goOnline");
    expect(hub).toContain('personalKernelPath("main")');
  });

  it("edge reveal opens Online TV Radio; double-tap opens program info", () => {
    const gest = readFileSync(join(root, "src/components/NavigationDockGestures.tsx"), "utf8");
    expect(gest).toContain("openProgramInfo");
    expect(gest).not.toContain("openControl");
    expect(gest).toContain("No single-tap broadcast action");
    expect(gest).toContain('modeRef.current === "PERSONAL"');
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).toContain("toggleRemoteReveal");
    expect(nav).toContain("data-broadcast-reveal");
    expect(nav).toContain("onEdgeReveal");
    const bar = readFileSync(join(root, "src/components/SurfaceSwitcherBar.tsx"), "utf8");
    expect(bar).toContain("lifeos-ghost-remote");
    expect(bar).toContain('aria-label="Online"');
    expect(bar).toContain("goOnline");
    expect(bar).toContain('aria-label="TV"');
    expect(bar).toContain('aria-label="Radio"');
    expect(bar).toContain(">TV</span>");
    expect(bar).toContain(">Radio</span>");
    expect(bar).toContain("lifeos-ghost-remote__btn--online");
    expect(bar).toContain("lifeos-ghost-remote__btn--named");
    expect(bar).not.toContain("BROADCAST_MODE_OPTIONS");
    expect(bar).not.toContain("lifeos-surface-switcher__control");
    expect(SURFACE_SWITCHER_IDLE_MS).toBeGreaterThanOrEqual(3000);
    expect(SURFACE_SWITCHER_IDLE_MS).toBeLessThanOrEqual(5000);
    expect(BROADCAST_REMOTE_IDLE_MS).toBeGreaterThanOrEqual(3000);
    expect(BROADCAST_REMOTE_IDLE_MS).toBeLessThanOrEqual(5000);
  });

  it("TV opens broadcast-only; Radio is canvas wave-field only", () => {
    const tv = readFileSync(join(root, "src/components/TvSurface.tsx"), "utf8");
    const radio = readFileSync(join(root, "src/components/RadioSurface.tsx"), "utf8");
    const waves = readFileSync(join(root, "src/components/RadioWaveField.tsx"), "utf8");
    expect(tv).toContain('data-kernel="lifeos-offline-kernel"');
    expect(radio).toContain('data-kernel="lifeos-offline-kernel"');
    expect(tv).toContain("seekPublicationId");
    expect(tv).toContain("lifeos-surface--bare");
    expect(tv).toContain("is-program-dip");
    expect(radio).toContain("RadioWaveField");
    expect(radio).toContain("radioChannel");
    expect(radio).not.toContain("radio-meta");
    expect(radio).not.toContain("MediaFeed");
    expect(radio).not.toContain("ImmersiveMediaFeed");
    expect(waves).toContain("radio-wave-field__canvas");
    expect(waves).toContain("cancelAnimationFrame");
    expect(waves).toContain("reduced");
  });

  it("remote is a transparent creator-station switcher", () => {
    const remote = readFileSync(join(root, "src/components/BroadcastRemoteControl.tsx"), "utf8");
    expect(remote).toContain("lifeos-ghost-controls");
    expect(remote).toContain("REMOTE_REVEALED");
    expect(remote).toContain("kernelAdjacentCreatorIndex");
    expect(remote).toContain("kernelIndexForBrand");
    expect(remote).toContain('aria-label="Previous station"');
    expect(remote).toContain('aria-label="Next station"');
    expect(remote).toContain('aria-label="Type creator station"');
    expect(remote).toContain("lifeos-ghost-controls__seek");
    expect(remote).toContain("lifeos-ghost-controls__caption");
    expect(remote).not.toContain("Play");
    expect(remote).not.toContain("Pause");
    expect(remote).not.toContain('setSurface("OFFLINE_HUB")');
    expect(remote).not.toContain("lifeos-remote-peek");
    const creators = kernelCreatorsFor(["video", "reel"]);
    expect(creators.length).toBeGreaterThan(1);
    const next = kernelAdjacentCreatorIndex(["video", "reel"], 0, "next");
    const loop = kernelAdjacentCreatorIndex(["video", "reel"], creators.length - 1, "next");
    expect(next).not.toBe(0);
    expect(typeof loop).toBe("number");
  });

  it("Living LifeOS stays visible on Main immersive home", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).not.toMatch(
      /\.personal-page--immersive\.is-shell-clean\s*>\s*\.living-lifeos-box[^}]*opacity:\s*0/,
    );
    expect(css).toContain(".personal-page--immersive > .living-lifeos-box");
    expect(css).toContain("Living LifeOS identity stays persistent");
  });

  it("program info shows creator + NOW/NEXT from real schedule", () => {
    const info = readFileSync(join(root, "src/components/BroadcastNowNext.tsx"), "utf8");
    expect(info).toContain("broadcast-program-info");
    expect(info).toContain("stationName");
    expect(info).toContain("PROGRAM_INFO_REVEALED");
    expect(info).toContain("LIVE —");
    expect(info).toContain("broadcastSchedule");
    const schedule = broadcastSchedule("TV", 0);
    expect(schedule.stationName.length).toBeGreaterThan(0);
    expect(schedule.now.title).not.toBe("");
    expect(schedule.next.title).not.toBe("");
    const live = broadcastSchedule(
      "TV",
      kernelMediaFor(["video", "reel"]).findIndex((i) => i.live),
    );
    if (live.now.live) {
      expect(live.now.title).toBeTruthy();
    }
  });

  it("futuristic visual tokens: transparent remote + reduced motion", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain("--los-ghost-bg");
    expect(css).toContain("--los-ghost-blur");
    expect(css).toContain(".lifeos-ghost-remote");
    expect(css).toContain("scale(0.97)");
    expect(css).toContain("safe-area-inset-top");
    expect(css).toContain("radio-wave-field__canvas");
    expect(css).toContain(".radio-meta");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("lifeos-tv-dip");
    expect(css).toContain("broadcast-program-info");
    expect(css).toContain("lifeos-cmd-nav__edge--broadcast");
    expect(css).toContain(".shell.is-broadcast-bare .lifeos-kernel-bar");
    expect(css).not.toMatch(/\.lifeos-ghost-remote__glass[^}]*background:\s*#000/);
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
    expect(shell).toContain("OfflineHubSurface");
    expect(shell).toContain("BroadcastNowNext");
    expect(shell).toContain("is-broadcast-bare");
    expect(shell).toContain("enterOffline");
  });
});
