import { describe, expect, it } from "vitest";
import {
  DOUBLE_GAP_MS,
  MOVE_CANCEL_PX,
  TAP_HOLD_MS,
  isNavDockGestureBlocked,
} from "../src/lib/navDockGesture";
import {
  buildDemoBusinesses,
  buildDemoProducts,
  buildDemoServices,
  DEMO_FIXTURE_SOURCE,
} from "../src/lib/demoDiscoveryFixtures";

describe("nav dock gesture arbitration", () => {
  it("blocks buttons, rail controls, diamonds, and edge handle — not feed canvas", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    expect(isNavDockGestureBlocked(btn)).toBe(true);

    const media = document.createElement("div");
    media.className = "immersive-feed__media";
    document.body.appendChild(media);
    expect(isNavDockGestureBlocked(media)).toBe(false);

    const diamond = document.createElement("button");
    diamond.className = "discovery-diamond";
    document.body.appendChild(diamond);
    expect(isNavDockGestureBlocked(diamond)).toBe(true);

    const edge = document.createElement("button");
    edge.className = "lifeos-cmd-nav__edge";
    document.body.appendChild(edge);
    expect(isNavDockGestureBlocked(edge)).toBe(true);

    btn.remove();
    media.remove();
    diamond.remove();
    edge.remove();
  });

  it("allows plain content surfaces", () => {
    const el = document.createElement("div");
    el.className = "kernel-scroll";
    document.body.appendChild(el);
    expect(isNavDockGestureBlocked(el)).toBe(false);
    el.remove();
  });

  it("allows hitlayer for double-tap close while blocking other buttons", () => {
    const hit = document.createElement("button");
    hit.className = "lifeos-cmd-nav__hitlayer";
    document.body.appendChild(hit);
    expect(isNavDockGestureBlocked(hit)).toBe(false);
    hit.remove();
  });

  it("uses mobile-friendly double-tap thresholds", () => {
    expect(TAP_HOLD_MS).toBeGreaterThanOrEqual(500);
    expect(DOUBLE_GAP_MS).toBeGreaterThanOrEqual(550);
    expect(MOVE_CANCEL_PX).toBeGreaterThanOrEqual(24);
  });
});

describe("demo discovery fixtures", () => {
  it("builds 24 numbered isolated businesses/services/products", () => {
    const b = buildDemoBusinesses(24);
    const s = buildDemoServices(24);
    const p = buildDemoProducts(24);
    expect(b).toHaveLength(24);
    expect(s).toHaveLength(24);
    expect(p).toHaveLength(24);
    expect(b[0]!.businessName).toBe("Business 01");
    expect(b[23]!.businessName).toBe("Business 24");
    expect(s[0]!.name).toBe("Service 01");
    expect(p[0]!.name).toBe("Product 01");
    expect(b.every((x) => x.source === DEMO_FIXTURE_SOURCE)).toBe(true);
    expect(s.every((x) => x.source === DEMO_FIXTURE_SOURCE)).toBe(true);
    expect(p.every((x) => x.source === DEMO_FIXTURE_SOURCE)).toBe(true);
  });
});
