/** Single-tap reveal / double-tap launch for LifeOS command rail icons. */

/** Wait after first tap before revealing the label (allows second tap). */
export const CMD_SINGLE_DELAY_MS = 260;
/** Max gap between taps to count as double-tap on the same command. */
export const CMD_DOUBLE_GAP_MS = 420;
/** Max movement between taps. */
export const CMD_TAP_SLACK_PX = 28;
/** How long a revealed label stays visible. */
export const CMD_LABEL_HOLD_MS = 2400;

export type CmdTapPoint = { id: string; x: number; y: number; t: number };

/**
 * Pointer double-tap recognizer for one command control.
 * Keyboard/SR activation should call `onLaunch` directly (not this helper).
 */
export function createCmdTapRecognizer(opts: {
  onReveal: () => void;
  onLaunch: () => void;
}) {
  let pending: ReturnType<typeof setTimeout> | null = null;
  let last: CmdTapPoint | null = null;

  function clearPending() {
    if (pending) {
      clearTimeout(pending);
      pending = null;
    }
  }

  function onPointerUp(id: string, e: Pick<PointerEvent, "clientX" | "clientY">) {
    const now = Date.now();
    const tap: CmdTapPoint = { id, x: e.clientX, y: e.clientY, t: now };
    if (
      last &&
      last.id === id &&
      now - last.t <= CMD_DOUBLE_GAP_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= CMD_TAP_SLACK_PX
    ) {
      clearPending();
      last = null;
      opts.onLaunch();
      return;
    }
    last = tap;
    clearPending();
    pending = setTimeout(() => {
      pending = null;
      last = null;
      opts.onReveal();
    }, CMD_SINGLE_DELAY_MS);
  }

  function cancel() {
    clearPending();
    last = null;
  }

  return { onPointerUp, cancel };
}
