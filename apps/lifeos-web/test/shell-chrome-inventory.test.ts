import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("shell chrome command inventory", () => {
  it("Personal side rail commands each have a real launch handler", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    const required = [
      ["notifications", "goNotifications"],
      ["live", "goLive"],
      ["comments", "goComments"],
      ["streamify", "goStreamify"],
      ["learnverse", "goLearnVerse"],
      ["explore", "goExplorePlus"],
      ["home", "goPersonalHome"],
      ["space-switch", "flipSpace"],
    ] as const;
    for (const [id, handler] of required) {
      expect(src).toContain(`id="${id}"`);
      expect(src).toContain(handler);
    }
    expect(src).toContain("function goPersonalHome");
    expect(src).not.toContain("IconStay");
  });

  it("kernel bar is exactly Offline / Main / Free", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain('selectKernel("offline")');
    expect(src).toContain('selectKernel("main")');
    expect(src).toContain('selectKernel("free")');
    expect(src).toContain('aria-label="Offline"');
    expect(src).not.toContain('aria-label="My TV"');
    expect(src).not.toContain('aria-label="My Radio"');
    expect(src.match(/lifeos-kernel-bar__label/g)).toHaveLength(3);
    expect(src).toContain("lifeos-kernel-bar__label");
  });

  it("section bar uses explicit navigate for Post Reels Products Communities Search", () => {
    const bar = readFileSync(join(root, "src/components/SegmentGlassBar.tsx"), "utf8");
    const home = readFileSync(join(root, "src/pages/personal/PersonalHomePage.tsx"), "utf8");
    expect(bar).toContain("navigate(to)");
    expect(bar).toContain('role="tab"');
    expect(home).toContain('id: "post"');
    expect(home).toContain('id: "reels"');
    expect(home).toContain('id: "products"');
    expect(home).toContain('id: "communities"');
    expect(home).toContain("searchTo={`${base}/search`}");
    expect(home).toContain("activeId={section}");
  });

  it("hitlayer leaves chrome bands uncovered", () => {
    const css = readFileSync(join(root, "src/styles.css"), "utf8");
    expect(css).toMatch(/\.lifeos-cmd-nav__hitlayer\s*\{[^}]*top:\s*max\(/s);
    expect(css).toMatch(/\.lifeos-cmd-nav__hitlayer\s*\{[^}]*bottom:\s*calc\(/s);
  });
});
