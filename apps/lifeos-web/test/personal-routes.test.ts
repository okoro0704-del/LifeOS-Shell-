import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal consumer space wiring", () => {
  it("PersonalRoutes mounts Main + Offline/Free kernels and finance", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("PersonalHomePage");
    expect(src).toContain("VaultPage");
    expect(src).toContain("DiscoveryPage");
    expect(src).toContain("FinancePage");
    expect(src).toContain('path="offline"');
    expect(src).toContain('path="free"');
    expect(src).toContain("PersonalKernelGestures");
  });

  it("primary nav restores Home · Activity · Finance for Personal", () => {
    const src = readFileSync(join(root, "src/components/shell/nav.ts"), "utf8");
    expect(src).toContain('label: "Home"');
    expect(src).toContain('label: "Activity"');
    expect(src).toContain('label: "Finance"');
    expect(src).toContain("/app/personal/finance");
    expect(src).not.toContain('label: "Offline"');
    expect(src).not.toContain('label: "Main"');
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
    expect(src).toContain("personalLandingPath");
  });
});
