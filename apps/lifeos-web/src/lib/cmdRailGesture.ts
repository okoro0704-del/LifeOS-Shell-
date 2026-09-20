/** Command rail tap grammar. */

/** How long a revealed label stays visible. */
export const CMD_LABEL_HOLD_MS = 2400;
/** Max gap between taps to count as double-tap on the same command. */
export const CMD_DOUBLE_GAP_MS = 420;
/** Max movement between taps. */
export const CMD_TAP_SLACK_PX = 28;
/** Delay before treating a lone tap as "reveal only" (arm mode). */
export const CMD_SINGLE_DELAY_MS = 260;

export type CmdTapMode = "immediate" | "arm";

export type CmdTapPoint = { id: string; x: number; y: number; t: number };

/**
 * Pointer recognizer for command rail icons.
 *
 * immediate — one tap reveals + launches (Personal Space).
 * arm — one tap reveals; same-icon double tap launches (Business Space).
 * Keyboard/SR should call `onLaunch` directly.
 */
export function createCmdTapRecognizer(opts: {
  onReveal: () => void;
  onLaunch: () => void;
  mode?: CmdTapMode;
}) {
  const mode: CmdTapMode = opts.mode ?? "immediate";
  let pending: ReturnType<typeof setTimeout> | null = null;
  let last: CmdTapPoint | null = null;
  let lastLaunch = 0;

  function clearPending() {
    if (pending) {
      clearTimeout(pending);
      pending = null;
    }
  }

  function onPointerUp(id: string, e: Pick<PointerEvent, "clientX" | "clientY">) {
    const now = Date.now();
    const tap: CmdTapPoint = { id, x: e.clientX, y: e.clientY, t: now };

    if (mode === "immediate") {
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
      return;
    }

    // arm mode — reveal on first tap; launch on same-id double tap
    if (
      last &&
      last.id === id &&
      now - last.t <= CMD_DOUBLE_GAP_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= CMD_TAP_SLACK_PX
    ) {
      clearPending();
      last = null;
      lastLaunch = now;
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
