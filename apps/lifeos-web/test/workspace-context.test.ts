import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("workspace Phase 1 wiring", () => {
  it("exports WorkspaceMode and storage keys in context module source", () => {
    const src = readFileSync(join(root, "src/context/WorkspaceContext.tsx"), "utf8");
    expect(src).toContain('export type WorkspaceMode = "PERSONAL" | "BUSINESS"');
    expect(src).toContain("lifeos_active_workspace");
    expect(src).toContain("lifeos_active_business_id");
  });

  it("AppShell mounts WorkspaceToggle", () => {
    const src = readFileSync(join(root, "src/components/AppShell.tsx"), "utf8");
    expect(src).toContain("WorkspaceToggle");
    expect(src).toContain("primaryNavForMode");
  });

  it("App wraps with WorkspaceProvider", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain("WorkspaceProvider");
    expect(src).toContain('path="personal"');
    expect(src).toContain('path="business"');
  });
});
