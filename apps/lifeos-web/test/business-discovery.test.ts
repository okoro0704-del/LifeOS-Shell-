import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("business discovery quad grid", () => {
  it("BusinessHomePage uses exclusive discovery state and shared components", () => {
    const src = readFileSync(join(root, "src/pages/business/BusinessHomePage.tsx"), "utf8");
    expect(src).toContain("DiscoveryQuad");
    expect(src).toContain("ExpandedDiscoveryGrid");
    expect(src).toContain("activeDiscovery");
    expect(src).toContain("KernelBrandBar");
    expect(src).not.toContain("business-home__breath");
    expect(src).toContain("Return to Business Space Home");
    expect(src).toContain("View all businesses");
    expect(src).not.toContain("MOCK_BUSINESSES");
    expect(src).not.toContain("PHYSICAL_PRODUCTS");
    expect(src).not.toContain("distance.toFixed");
  });

  it("DiscoveryQuad uses diamond control with attention pulse", () => {
    const src = readFileSync(join(root, "src/components/DiscoveryQuadGrid.tsx"), "utf8");
    expect(src).toContain("discovery-diamond");
    expect(src).toContain("DiamondControl");
    expect(src).toContain("discovery-diamond--attention");
    expect(src).toContain("discovery-diamond--float");
    expect(src).toContain("data-no-nav-dock");
    expect(src).toContain("Return to Business Space Home");
    expect(src).not.toContain("discovery-quad__expand");
    expect(src).not.toContain("discovery-expanded__breath");
  });

  it("CSS edge-to-edge, float, pulse, and 2-column grid are present", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain("transform: rotate(45deg)");
    expect(css).toContain("transform: rotate(-45deg)");
    expect(css).toContain("discovery-diamond--float");
    expect(css).toContain("discovery-diamond-pulse");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain(".discovery-quad__box");
    expect(css).toContain("grid-template-columns: 1fr 1fr");
    expect(css).not.toContain("business-home__breath");
    expect(css).not.toContain("discovery-expanded__breath");
    expect(css).toContain("lifeos-biz-dock");
    expect(css).toContain("discovery-quad__expand");
    expect(css).toContain("display: none !important");
  });
});

describe("business command rail", () => {
  it("Business chrome: side Messaging/Notification/Exit + floating dock commands", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain('mode === "BUSINESS"');
    expect(src).toContain("lifeos-biz-dock");
    expect(src).toContain("BizDockBtn");
    expect(src).toContain('label="Space"');
    expect(src).toContain('label="Home"');
    expect(src).toContain('label="Explore"');
    expect(src).toContain('label="Activities"');
    expect(src).toContain('label="Finance"');
    expect(src).toContain('id="messaging"');
    expect(src).toContain('label="Notification"');
    expect(src).toContain("goActivities");
    expect(src).toContain("goFinance");
    expect(src).toContain("goBusinessExplore");
    expect(src).toContain("goBusinessHome");
    expect(src).toContain('navigate("/app/activity")');
    expect(src).toContain('navigate("/app/wallet")');
    expect(src).toContain('tapMode: CmdTapMode = "immediate"');
    // Business must not mount Personal kernel bar.
    expect(src).toContain('mode === "PERSONAL" ? (');
    expect(src).toContain("lifeos-kernel-bar");
    // Floating dock mounts only in BUSINESS mode
    expect(src).toMatch(/mode === "BUSINESS"[\s\S]*lifeos-biz-dock/);
  });

  it("ActiveKernelSignature is Personal-only", () => {
    const src = readFileSync(join(root, "src/components/ActiveKernelSignature.tsx"), "utf8");
    expect(src).toContain('if (mode === "BUSINESS") return null');
  });
});
