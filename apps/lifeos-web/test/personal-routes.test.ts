import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal consumer space wiring", () => {
  it("PersonalRoutes mounts Offline · Main · Free kernels", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("PersonalHomePage");
    expect(src).toContain("VaultPage");
    expect(src).toContain("DiscoveryPage");
    expect(src).toContain('path="offline"');
    expect(src).toContain('path="free"');
    expect(src).toContain("PersonalKernelGestures");
  });

  it("primary nav is Offline · Main · Free for Personal; Business is consume", () => {
    const src = readFileSync(join(root, "src/components/shell/nav.ts"), "utf8");
    expect(src).toContain('label: "Offline"');
    expect(src).toContain('label: "Main"');
    expect(src).toContain('label: "Free"');
    expect(src).toContain("/app/personal/offline");
    expect(src).toContain("/app/personal/free");
    expect(src).toContain('label: "Activity"');
    expect(src).toContain("/app/business");
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
  });
});
