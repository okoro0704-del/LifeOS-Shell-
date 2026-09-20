import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SHELL_INTRO_MS } from "../src/context/NavigationDockContext";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("unified 3-bar shell", () => {
  it("exposes one shellControlsVisible source of truth", () => {
    const src = readFileSync(join(root, "src/context/NavigationDockContext.tsx"), "utf8");
    expect(src).toContain("shellControlsVisible");
    expect(src).toContain("SHELL_INTRO_MS");
    expect(SHELL_INTRO_MS).toBe(2800);
    expect(src).toContain("markShellIntroSeen");
  });

  it("PersonalKernelShell ties section bar to shellControlsVisible", () => {
    const src = readFileSync(join(root, "src/pages/personal/PersonalHomePage.tsx"), "utf8");
    expect(src).toContain("shellControlsVisible");
    expect(src).toContain("sectionHidden");
    expect(src).toContain("scrolled={sectionHidden}");
  });

  it("command rail removes Contact/Profile and uses Learnverse education icon", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain("IconLearnverse");
    expect(src).not.toContain("IconProfile");
    expect(src).not.toMatch(/label=["']Contact["']/);
    expect(src).not.toContain("space-personal");
    expect(src).toContain('label="Home"');
    expect(src).toContain("goLearnVerse");
    expect(src).toContain("goStreamify");
    expect(src).toContain("goComments");
    expect(src).toContain("goLive");
  });

  it("Learnverse icon composes book + graduation cap", () => {
    const src = readFileSync(join(root, "../../packages/ui/src/icons.tsx"), "utf8");
    expect(src).toContain("export function IconLearnverse");
    expect(src).toContain("open book");
    expect(src).toContain("graduation cap");
  });
});
