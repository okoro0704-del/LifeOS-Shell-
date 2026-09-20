import { describe, expect, it, vi } from "vitest";
import {
  CMD_DOUBLE_GAP_MS,
  CMD_SINGLE_DELAY_MS,
  createCmdTapRecognizer,
} from "../src/lib/cmdRailGesture";

describe("cmd rail gesture", () => {
  it("reveals after single tap delay", async () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    expect(onReveal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CMD_SINGLE_DELAY_MS + 1);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onLaunch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("launches on same-target double tap and cancels reveal", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(120);
    r.onPointerUp("home", { clientX: 12, clientY: 11 });
    expect(onLaunch).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(CMD_SINGLE_DELAY_MS + CMD_DOUBLE_GAP_MS);
    expect(onReveal).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does not treat different icons as a double tap", () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    const onLaunch = vi.fn();
    const r = createCmdTapRecognizer({ onReveal, onLaunch });
    r.onPointerUp("home", { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(80);
    r.onPointerUp("live", { clientX: 10, clientY: 10 });
    expect(onLaunch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CMD_SINGLE_DELAY_MS + 1);
    expect(onReveal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
