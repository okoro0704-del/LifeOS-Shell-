/** Command rail tap grammar — reliable mobile launch with brief label feedback. */

/** Brief label flash after a launch tap. */
export const CMD_LABEL_HOLD_MS = 2400;
/** Max gap between taps to count as double-tap (second tap is a no-op launch). */
export const CMD_DOUBLE_GAP_MS = 420;
/** Max movement between taps. */
export const CMD_TAP_SLACK_PX = 28;
/** @deprecated kept for tests / callers — single tap launches immediately now. */
export const CMD_SINGLE_DELAY_MS = 0;

export type CmdTapPoint = { id: string; x: number; y: number; t: number };

/**
 * Pointer recognizer for command rail icons.
 * One tap → reveal label + launch (commands must work on ordinary clicks).
 * Double tap on the same icon → launch once (debounce second fire).
 * Keyboard/SR should call `onLaunch` directly.
 */
export function createCmdTapRecognizer(opts: {
  onReveal: () => void;
  onLaunch: () => void;
}) {
  let last: CmdTapPoint | null = null;
  let lastLaunch = 0;

  function onPointerUp(id: string, e: Pick<PointerEvent, "clientX" | "clientY">) {
    const now = Date.now();
    const tap: CmdTapPoint = { id, x: e.clientX, y: e.clientY, t: now };

    // Debounce rapid double-fire on the same icon.
    if (
      last &&
      last.id === id &&
      now - last.t <= CMD_DOUBLE_GAP_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= CMD_TAP_SLACK_PX &&
      now - lastLaunch < CMD_DOUBLE_GAP_MS
    ) {
      last = tap;
      return;
    }

    last = tap;
    lastLaunch = now;
    opts.onReveal();
    opts.onLaunch();
  }

  function cancel() {
    last = null;
  }

  return { onPointerUp, cancel };
}
