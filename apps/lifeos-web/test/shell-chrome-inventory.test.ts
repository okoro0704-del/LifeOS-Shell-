import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("shell chrome command inventory", () => {
  it("side rail commands each have a real launch handler", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    const required = [
      ["notifications", "goNotifications"],
      ["live", "goLive"],
      ["comments", "goComments"],
      ["streamify", "goStreamify"],
      ["learnverse", "goLearnVerse"],
      ["explore", "goExplorePlus"],
      ["home", "goHome"],
      ["space-switch", "flipSpace"],
    ] as const;
    for (const [id, handler] of required) {
      expect(src).toContain(`id="${id}"`);
      expect(src).toContain(`onLaunch={${handler}}`);
      expect(src).toContain(`function ${handler}`);
    }
    expect(src.match(/id="home"/g)?.length).toBe(1);
    expect(src).not.toContain("IconStay");
    expect(src).toContain("navigate(\"/app/notifications\")");
    expect(src).toContain("navigate(\"/app/live\")");
    expect(src).toContain("/learnverse");
    expect(src).toContain("/streamify");
    expect(src).toContain("/plus");
    expect(src).toContain("workspaceHomePath");
  });

  it("kernel bar wires Offline Main Free to selectKernel", () => {
    const src = readFileSync(join(root, "src/components/LifeOsCommandNavigation.tsx"), "utf8");
    expect(src).toContain('selectKernel("offline")');
    expect(src).toContain('selectKernel("main")');
    expect(src).toContain('selectKernel("free")');
    expect(src).toContain("lifeos-kernel-bar__label");
    expect(src).toContain(">Offline<");
    expect(src).toContain(">Main<");
    expect(src).toContain(">Free<");
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
