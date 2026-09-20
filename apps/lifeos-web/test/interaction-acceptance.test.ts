import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SHELL_CONFIRM_MS, SHELL_IDLE_MS, SHELL_INTRO_MS } from "../src/context/NavigationDockContext";
import { isNavDockGestureBlocked } from "../src/lib/navDockGesture";
import {
  isLifeOsPersonalDemoEnabled,
  personalDemoSequence,
  PERSONAL_DEMO_SOURCE,
} from "../src/lib/personalDemoActivity";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("interaction acceptance — idle / learnverse / live / demo", () => {
  it("idle dwell is 10 seconds; confirm remains 1 second", () => {
    expect(SHELL_IDLE_MS).toBe(10000);
    expect(SHELL_CONFIRM_MS).toBe(1000);
    expect(SHELL_INTRO_MS).toBe(3000);
  });

  it("Learnverse uses IconBookOpen ↔ IconGraduationCap", () => {
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).toContain("IconBookOpen");
    expect(nav).toContain("IconGraduationCap");
    expect(nav).toContain("LearnverseIcon");
    expect(nav).not.toMatch(/LearnverseIcon[\s\S]*IconBook[^O]/);
    const icons = readFileSync(join(root, "../../packages/ui/src/icons.tsx"), "utf8");
    expect(icons).toContain("export function IconBookOpen");
    expect(icons).toContain("facing pages");
  });

  it("immersive feed canvas allows shell double-tap", () => {
    const media = document.createElement("div");
    media.className = "immersive-feed__media";
    document.body.appendChild(media);
    expect(isNavDockGestureBlocked(media)).toBe(false);

    const rail = document.createElement("button");
    rail.className = "immersive-feed__rail-btn";
    document.body.appendChild(rail);
    expect(isNavDockGestureBlocked(rail)).toBe(true);

    media.remove();
    rail.remove();

    const feed = readFileSync(join(root, "src/components/ImmersiveMediaFeed.tsx"), "utf8");
    expect(feed).not.toContain("onDoubleClick");
    expect(feed).not.toContain("onMediaActivate");
  });

  it("side rail icons enlarged; Live uses red glow class", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain("width: 3.15rem");
    expect(css).toContain("lifeos-live-glow");
    expect(css).toContain(".lifeos-cmd-nav__icon--live");
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav).toContain("lifeos-cmd-nav__icon--live");
    expect(nav).toContain("size={26}");
  });

  it("personal demo fixtures are isolated and marked DEMO", () => {
    const seq = personalDemoSequence();
    expect(seq).toHaveLength(3);
    expect(seq.map((e) => e.kind)).toEqual(["notification", "message", "live"]);
    expect(seq.every((e) => e.source === PERSONAL_DEMO_SOURCE && e.fixture === true)).toBe(true);
    expect(seq[1]!.body).toContain("demo conversation");
    // Without flag, disabled
    expect(isLifeOsPersonalDemoEnabled()).toBe(false);
    const lib = readFileSync(join(root, "src/lib/personalDemoActivity.ts"), "utf8");
    expect(lib).toContain("VITE_LIFEOS_PERSONAL_DEMO");
    expect(lib).not.toContain("notificationService");
  });
});
