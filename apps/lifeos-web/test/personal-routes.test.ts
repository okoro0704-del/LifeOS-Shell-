import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal consumer space wiring", () => {
  it("PersonalRoutes mounts kernel Home tabs and LearnVerse Edu", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("PersonalPostPage");
    expect(src).toContain("PersonalProductsPage");
    expect(src).toContain("FreePostPage");
    expect(src).toContain("OfflinePostPage");
    expect(src).toContain("LearnVerseRoutes");
  });

  it("primary nav is Home · LearnVerse · Streamify", () => {
    const src = readFileSync(join(root, "src/components/shell/nav.ts"), "utf8");
    expect(src).toContain('label: "Home"');
    expect(src).toContain('label: "LearnVerse"');
    expect(src).toContain('label: "Streamify"');
    expect(src).toContain("personalPrimaryNav");
  });

  it("LearnVerse includes Edu between Courses and Schools", () => {
    const src = readFileSync(join(root, "src/pages/personal/LearnVersePage.tsx"), "utf8");
    expect(src).toContain('label: "Edu"');
    expect(src).toContain("LearnVerseEduPage");
    expect(src).toContain('catalogByKinds(["edu"])');
    expect(src).toContain('searchTo={`${base}/search`}');
    expect(src).toContain("LearnVerseSearchPage");
    expect(src).toContain("KernelBrandBar");
  });

  it("AppShell mounts shared LifeOsCommandNavigation", () => {
    const src = readFileSync(join(root, "src/components/AppShell.tsx"), "utf8");
    expect(src).toContain("LifeOsCommandNavigation");
    expect(src).not.toContain("LifeOsNavigationDock");
    expect(src).not.toContain("LifeOsBottomDock");
    expect(src).not.toContain("LiveFloat");
  });

  it("command nav is icons-only with accessible labels", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain("lifeos-cmd-nav__icon");
    expect(src).toContain("lifeos-cmd-nav__edge");
    expect(src).toContain("lifeos-kernel-bar");
    expect(src).toContain('aria-label="Offline"');
    expect(src).toContain('aria-label="Main"');
    expect(src).toContain('aria-label="Free"');
    expect(src).toContain("lifeos-cmd-nav__cmd-label");
    expect(src).toContain("aria-hidden={!revealed}");
  });

  it("nav side is PERSONAL right / BUSINESS left", () => {
    const ctx = readFileSync(join(root, "src/context/NavigationDockContext.tsx"), "utf8");
    expect(ctx).toContain('mode === "BUSINESS" ? "left" : "right"');
    expect(ctx).toContain("shellControlsVisible");
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
  });

  it("nav dock gesture leaves immersive media eligible for shell double-tap", () => {
    const src = readFileSync(join(root, "src/lib/navDockGesture.ts"), "utf8");
    expect(src).toContain(".immersive-feed__rail");
    expect(src).toContain("isNavDockGestureBlocked");
    expect(src).toContain("eligible for shell double-tap");
    expect(src).not.toMatch(/INTERACTIVE_SELECTOR[\s\S]*"\.immersive-feed__media"/);
  });
});
