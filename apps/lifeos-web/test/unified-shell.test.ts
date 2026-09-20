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

  it("command rail removes Contact/Profile; Learnverse uses living book↔cap", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain("LearnverseIcon");
    expect(src).toContain("IconBook");
    expect(src).toContain("IconGraduationCap");
    expect(src).not.toContain("IconLearnverse");
    expect(src).not.toContain("IconProfile");
    expect(src).not.toContain("IconStay");
    expect(src).not.toMatch(/label=["']Contact["']/);
    expect(src).not.toContain("space-personal");
    expect(src).toContain('label="Home"');
    expect(src).toContain("goLearnVerse");
    expect(src).toContain("goStreamify");
    expect(src).toContain("goComments");
    expect(src).toContain("goLive");
    // One Home id per space branch (Personal + Business).
    expect(src.match(/id="home"/g)?.length ?? 0).toBe(2);
    expect(src).toContain("IconKernel");
    expect(src).toContain("lifeos-kernel-bar__label");
    expect(src).toContain("goBusinessHome");
    expect(src).toContain("goActivities");
  });

  it("Learnverse icons are separate Book and GraduationCap (not simultaneous)", () => {
    const src = readFileSync(join(root, "../../packages/ui/src/icons.tsx"), "utf8");
    expect(src).toContain("export function IconBook");
    expect(src).toContain("export function IconGraduationCap");
    expect(src).toContain("export function IconKernel");
    expect(src).not.toContain("export function IconLearnverse");
  });

  it("Living LifeOS Box + transparent chrome + kernel signature", () => {
    const identity = readFileSync(join(root, "src/components/LivingLifeOsIdentity.tsx"), "utf8");
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    const shell = readFileSync(join(root, "src/components/AppShell.tsx"), "utf8");
    const sig = readFileSync(join(root, "src/components/ActiveKernelSignature.tsx"), "utf8");
    expect(identity).toContain("living-lifeos-box");
    expect(identity).toContain("LIVING_IDENTITY_INTERVAL_MS = 3000");
    expect(css).toContain(".living-lifeos-box");
    expect(css).toMatch(/\.living-lifeos-box[\s\S]*background:\s*transparent/);
    expect(css).not.toMatch(
      /\.kernel-brand-bar--static\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--los-bg/,
    );
    expect(css).toContain(".lifeos-kernel-sig");
    expect(css).toContain("is-shell-open > .segment-topbar--glass");
    expect(shell).toContain("ActiveKernelSignature");
    expect(shell).toContain("onlineKernelPrompt");
    expect(shell).toContain("You have internet again");
    expect(sig).toContain("pointerEvents");
    expect(sig).toContain("is-suppressed");
    expect(sig).toContain("LABEL");
  });
});
