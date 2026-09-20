import { describe, expect, it, vi } from "vitest";
import {
  CMD_DOUBLE_GAP_MS,
  createCmdTapRecognizer,
} from "../src/lib/cmdRailGesture";

describe("cmd rail gesture", () => {
  it("reveals and launches on a single tap", () => {
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("debounces a rapid second tap on the same icon", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    r.onPointerUp("home", { clientX: 12, clientY: 11 });
    expect(onLaunch).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(CMD_DOUBLE_GAP_MS + 1);
    r.onPointerUp("home", { clientX: 12, clientY: 11 });
    expect(onLaunch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("launches independently for different icons", () => {
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    r.onPointerUp("live", { clientX: 10, clientY: 10 });
    expect(onLaunch).toHaveBeenCalledTimes(2);
    expect(onReveal).toHaveBeenCalledTimes(2);
  });
});
