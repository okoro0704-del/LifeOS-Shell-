import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("business discovery quad grid", () => {
  it("BusinessHomePage uses shared DiscoveryQuadGrid and KernelBrandBar", () => {
    const src = readFileSync(join(root, "src/pages/business/BusinessHomePage.tsx"), "utf8");
    expect(src).toContain("DiscoveryQuadGrid");
    expect(src).toContain("KernelBrandBar");
    expect(src).toContain('align="end"');
    expect(src).toContain("Businesses Near");
    expect(src).toContain("View all businesses");
    expect(src).toContain("View all services");
    expect(src).toContain("View all products");
    expect(src).not.toContain("MOCK_BUSINESSES");
    expect(src).not.toContain("PHYSICAL_PRODUCTS");
    expect(src).not.toContain("distance.toFixed");
    expect(src).not.toContain("AskLifeOSTrigger");
  });

  it("DiscoveryQuadGrid is generic and shared", () => {
    const src = readFileSync(join(root, "src/components/DiscoveryQuadGrid.tsx"), "utf8");
    expect(src).toContain("export function DiscoveryQuadGrid");
    expect(src).toContain("expandAriaLabel");
    expect(src).toContain("discovery-quad__expand");
  });
});
