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
    expect(src).not.toContain('align="end"');
    expect(src).toContain("View all businesses");
    expect(src).toContain("Close business discovery");
    expect(src).not.toContain("MOCK_BUSINESSES");
    expect(src).not.toContain("PHYSICAL_PRODUCTS");
    expect(src).not.toContain("distance.toFixed");
  });

  it("DiscoveryQuad uses diamond control not circular expand", () => {
    const src = readFileSync(join(root, "src/components/DiscoveryQuadGrid.tsx"), "utf8");
    expect(src).toContain("discovery-diamond");
    expect(src).toContain("DiamondControl");
    expect(src).toContain("data-no-nav-dock");
    expect(src).not.toContain("discovery-quad__expand");
  });

  it("CSS edge-to-edge and diamond rotation are present", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toContain("transform: rotate(45deg)");
    expect(css).toContain("transform: rotate(-45deg)");
    expect(css).toContain("discovery-diamond--float");
    expect(css).toContain(".discovery-quad__box");
    expect(css).toContain("border-radius: 0");
    expect(css).toContain("discovery-quad__expand");
    expect(css).toContain("display: none !important");
  });
});
