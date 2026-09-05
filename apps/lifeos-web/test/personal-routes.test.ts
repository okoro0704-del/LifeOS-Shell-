import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal Digiconomy Phase 2 wiring", () => {
  it("digiconomyClient sends Authorization Bearer", () => {
    const src = readFileSync(join(root, "src/lib/digiconomyClient.ts"), "utf8");
    expect(src).toContain("Authorization");
    expect(src).toContain("Bearer");
    expect(src).toContain("/v1/personal/vault");
    expect(src).toContain("/v1/personal/discovery");
    expect(src).toContain("/v1/personal/finance/summary");
  });

  it("PersonalRoutes mounts vault, discovery, finance", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("VaultPage");
    expect(src).toContain("DiscoveryPage");
    expect(src).toContain("FinancePage");
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
  });
});
