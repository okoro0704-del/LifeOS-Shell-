import { describe, expect, it } from "vitest";
import { isNavDockGestureBlocked } from "../src/lib/navDockGesture";

describe("nav dock gesture arbitration", () => {
  it("blocks buttons and media", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    expect(isNavDockGestureBlocked(btn)).toBe(true);

    const media = document.createElement("div");
    media.className = "immersive-feed__media";
    document.body.appendChild(media);
    expect(isNavDockGestureBlocked(media)).toBe(true);

    btn.remove();
    media.remove();
  });

  it("allows plain content surfaces", () => {
    const el = document.createElement("div");
    el.className = "kernel-scroll";
    document.body.appendChild(el);
    expect(isNavDockGestureBlocked(el)).toBe(false);
    el.remove();
  });
});
