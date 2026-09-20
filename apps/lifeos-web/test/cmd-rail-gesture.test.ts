import { describe, expect, it, vi } from "vitest";
import {
  CMD_DOUBLE_GAP_MS,
  CMD_SINGLE_DELAY_MS,
  createCmdTapRecognizer,
} from "../src/lib/cmdRailGesture";

describe("cmd rail gesture", () => {
  it("immediate mode reveals and launches on a single tap", () => {
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch, mode: "immediate" });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it("arm mode reveals after delay; same-icon double tap launches", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch, mode: "arm" });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    expect(onLaunch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CMD_SINGLE_DELAY_MS + 1);
    expect(onReveal).toHaveBeenCalledTimes(1);

    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(80);
    r.onPointerUp("home", { clientX: 12, clientY: 11 });
    expect(onLaunch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("arm mode does not treat different icons as a double tap", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch, mode: "arm" });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(80);
    r.onPointerUp("finance", { clientX: 10, clientY: 10 });
    expect(onLaunch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CMD_SINGLE_DELAY_MS + CMD_DOUBLE_GAP_MS);
    expect(onReveal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
