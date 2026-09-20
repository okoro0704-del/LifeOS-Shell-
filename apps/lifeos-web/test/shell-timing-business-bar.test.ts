import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SHELL_CONFIRM_MS, SHELL_IDLE_MS, SHELL_INTRO_MS } from "../src/context/NavigationDockContext";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("shell timing constants", () => {
  it("exposes 3s idle and 1s confirm", () => {
    expect(SHELL_IDLE_MS).toBe(10000);
    expect(SHELL_CONFIRM_MS).toBe(1000);
    expect(SHELL_INTRO_MS).toBe(3000);
  });

  it("NavigationDockContext implements confirmSelection and noteShellActivity", () => {
    const src = readFileSync(join(root, "src/context/NavigationDockContext.tsx"), "utf8");
    expect(src).toContain("confirmSelection");
    expect(src).toContain("noteShellActivity");
    expect(src).toContain("SHELL_IDLE_MS");
    expect(src).toContain("SHELL_CONFIRM_MS");
    expect(src).not.toContain("location.pathname");
  });

  it("SegmentGlassBar confirms selection instead of relying on route auto-close", () => {
    const src = readFileSync(join(root, "src/components/SegmentGlassBar.tsx"), "utf8");
    expect(src).toContain("confirmSelection");
    expect(src).toContain("goSection");
  });
});

describe("business bottom command bar", () => {
  it("renders exact Home/Activities/Explore/Finance/Space order", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    const dock = src.slice(src.indexOf("lifeos-biz-dock"), src.indexOf("lifeos-kernel-bar"));
    const labels = [...dock.matchAll(/<BizDockBtn\s+label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["Home", "Activities", "Explore", "Finance", "Space"]);
    expect(src).toContain('data-biz-dock-order="Home,Activities,Explore,Finance,Space"');
    expect(src).toContain("SpaceSwitcherIcon");
    expect(src).toContain('accessibleName="Space Switcher"');
    expect(src).toContain("lifeos-biz-dock__btn--space");
    expect(dock).not.toContain("Messaging");
    expect(dock).not.toContain("Notification");
  });

  it("Business does not mount side command rail or Personal kernels", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain('mode === "PERSONAL" ? (');
    expect(src).toContain("lifeos-kernel-bar");
    // Business block has no Messaging/Notification CmdIcons
    const bizIdx = src.indexOf("BUSINESS: floating bottom dock");
    expect(bizIdx).toBeGreaterThan(-1);
    expect(src).not.toMatch(/mode === "BUSINESS"[\s\S]*id="messaging"/);
  });

  it("Personal and Business share SpaceSwitcherIcon primitive", () => {
    const icon = readFileSync(join(root, "src/components/SpaceSwitcherIcon.tsx"), "utf8");
    expect(icon).toContain("IconLink");
    expect(icon).toContain("SpaceSwitcherIcon");
    const nav = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(nav.match(/SpaceSwitcherIcon/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe("activities owns messaging + notifications", () => {
  it("Activity page links to canonical destinations", () => {
    const src = readFileSync(join(root, "src/pages/Activity.tsx"), "utf8");
    expect(src).toContain('navigate("/app/messages")');
    expect(src).toContain('navigate("/app/notifications")');
    expect(src).toContain("activity-gateway");
  });
});

describe("living lifeos placement", () => {
  it("Personal uses right; Business uses business-current", () => {
    const personal = readFileSync(join(root, "src/pages/personal/PersonalHomePage.tsx"), "utf8");
    expect(personal).toContain('placement="right"');
    const biz = readFileSync(join(root, "src/pages/business/BusinessHomePage.tsx"), "utf8");
    expect(biz).toContain('placement="business-current"');
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain(".living-lifeos-box--right");
    expect(css).toContain(".living-lifeos-box--business-current");
  });
});

describe("viewport-fixed discovery square", () => {
  it("portals float diamond and keeps CSS fixed center", () => {
    const src = readFileSync(join(root, "src/components/DiscoveryQuadGrid.tsx"), "utf8");
    expect(src).toContain("createPortal");
    expect(src).toContain("document.body");
    expect(src).toContain('data-discovery-diamond={floating ? "float"');
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain(".discovery-diamond--float");
    expect(css).toMatch(/\.discovery-diamond--float\s*\{[^}]*position:\s*fixed/s);
    expect(css).toMatch(/\.discovery-diamond--float\s*\{[^}]*left:\s*50%/s);
    expect(css).toMatch(/\.discovery-diamond--float\s*\{[^}]*top:\s*50%/s);
  });

  it("demo fixtures support 100-item long scroll", () => {
    const page = readFileSync(join(root, "src/pages/business/BusinessHomePage.tsx"), "utf8");
    expect(page).toContain("buildDemoBusinesses(100)");
    expect(page).toContain("buildDemoServices(100)");
    expect(page).toContain("buildDemoProducts(100)");
  });
});
