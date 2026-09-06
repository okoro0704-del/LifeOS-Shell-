import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal consumer space wiring", () => {
  it("PersonalRoutes mounts Home Post/Reels, LearnVerse, Streamify, Plus", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("PersonalPostPage");
    expect(src).toContain("LearnVerseRoutes");
    expect(src).toContain("StreamifyRoutes");
    expect(src).toContain("PersonalPlusPage");
    expect(src).toContain('path="offline"');
    expect(src).toContain('path="free"');
  });

  it("primary nav is Home · LearnVerse · Streamify", () => {
    const src = readFileSync(join(root, "src/components/shell/nav.ts"), "utf8");
    expect(src).toContain('label: "Home"');
    expect(src).toContain('label: "LearnVerse"');
    expect(src).toContain('label: "Streamify"');
    expect(src).toContain("/app/personal/learnverse");
    expect(src).toContain("/app/personal/streamify");
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
  });
});
