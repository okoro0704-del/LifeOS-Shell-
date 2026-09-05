import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal consumer space wiring", () => {
  it("PersonalRoutes mounts finance and redirects vault/discovery", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("FinancePage");
    expect(src).toContain("PersonalHomePage");
    expect(src).toContain('path="vault"');
    expect(src).toContain('to="/app/activity"');
    expect(src).toContain('path="discovery"');
    expect(src).toContain('to="/app/personal/finance"');
    expect(src).not.toContain("VaultPage");
    expect(src).not.toContain("DiscoveryPage");
  });

  it("primary nav is Home · Activity · Finance (no Vault)", () => {
    const src = readFileSync(join(root, "src/components/shell/nav.ts"), "utf8");
    expect(src).toContain('label: "Home"');
    expect(src).toContain('label: "Activity"');
    expect(src).toContain('label: "Finance"');
    expect(src).toContain("/app/activity");
    expect(src).toContain("/app/personal/finance");
    expect(src).not.toContain("/app/personal/vault");
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
  });
});
