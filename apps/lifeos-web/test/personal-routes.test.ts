import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("personal consumer space wiring", () => {
  it("PersonalRoutes mounts kernel Home tabs and LearnVerse Edu", () => {
    const src = readFileSync(join(root, "src/routes/personalRoutes.tsx"), "utf8");
    expect(src).toContain("PersonalPostPage");
    expect(src).toContain("PersonalProductsPage");
    expect(src).toContain("FreePostPage");
    expect(src).toContain("OfflinePostPage");
    expect(src).toContain("LearnVerseRoutes");
  });

  it("primary nav is Home · LearnVerse · Streamify", () => {
    const src = readFileSync(join(root, "src/components/shell/nav.ts"), "utf8");
    expect(src).toContain('label: "Home"');
    expect(src).toContain('label: "LearnVerse"');
    expect(src).toContain('label: "Streamify"');
    expect(src).toContain("personalPrimaryNav");
  });

  it("LearnVerse includes Edu between Courses and Schools", () => {
    const src = readFileSync(join(root, "src/pages/personal/LearnVersePage.tsx"), "utf8");
    expect(src).toContain('label: "Edu"');
    expect(src).toContain("LearnVerseEduPage");
    expect(src).toContain('catalogByKinds(["edu"])');
    expect(src).toContain('searchTo={`${base}/search`}');
    expect(src).toContain("LearnVerseSearchPage");
    expect(src).toContain("ElComFloat");
  });

  it("App mounts personal/* routes", () => {
    const src = readFileSync(join(root, "src/App.tsx"), "utf8");
    expect(src).toContain('path="personal/*"');
    expect(src).toContain("PersonalRoutes");
  });
});
