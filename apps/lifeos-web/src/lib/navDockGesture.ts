/** Shared helpers for double-tap → LifeOS shell reveal (gesture arbitration). */

const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "option",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='switch']",
  "[contenteditable='true']",
  "[data-no-nav-dock]",
  ".immersive-feed__media",
  ".immersive-feed__rail",
  ".immersive-feed__rail-btn",
  ".segment-topbar",
  ".kernel-brand-bar",
  ".living-lifeos-box",
  ".living-lifeos-box__hit",
  ".living-lifeos__hit",
  "[data-living-identity]",
  ".lifeos-kernel-sig",
  ".lifeos-nav-dock",
  ".lifeos-nav-dock__backdrop",
  ".lifeos-cmd-nav",
  ".lifeos-cmd-nav__edge",
  ".lifeos-kernel-bar",
  ".lifeos-transient-alerts",
  ".bottom-nav",
  ".command-overlay",
  ".discovery-quad__card",
  ".discovery-diamond",
  ".discovery-expanded",
  "video",
].join(",");

export function isNavDockGestureBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  // Hitlayer is a button but must allow double-tap to close the shell.
  if (target.closest(".lifeos-cmd-nav__hitlayer")) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

/**
 * Tuned for deliberate mobile double-taps (not arcade speed).
 * Hold was too tight when paired with short gap — widen both.
 */
export const TAP_HOLD_MS = 520;
/** Max gap between two taps to count as a double-tap. */
export const DOUBLE_GAP_MS = 560;
/** Max pointer travel during a press before it is treated as a scroll/drag. */
export const MOVE_CANCEL_PX = 28;
/** Max distance between the two taps' centers. */
export const TAP_SLACK_PX = 42;
/** Debounce between fires (synthetic dblclick + pointer). */
export const FIRE_DEBOUNCE_MS = 320;

type TapPoint = { x: number; y: number; t: number };

/**
 * Detect double-tap on eligible surfaces (pointer events — not dblclick-only).
 * Eligibility is judged on pointerdown; pointerup only validates movement/hold
 * so slight target drift onto a child does not drop a legitimate tap.
 */
export function attachNavDockDoubleTap(
  root: HTMLElement,
  onDoubleTap: (clientX: number, clientY: number) => void,
): () => void {
  let last: TapPoint | null = null;
  let start: TapPoint | null = null;
  let movedTooFar = false;
  let lastFire = 0;

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isNavDockGestureBlocked(e.target)) {
      last = null;
      start = null;
      movedTooFar = false;
      return;
    }
    start = { x: e.clientX, y: e.clientY, t: Date.now() };
    movedTooFar = false;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
      movedTooFar = true;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!start) return;
    const began = start;
    start = null;
    if (movedTooFar) {
      last = null;
      movedTooFar = false;
      return;
    }
    const now = Date.now();
    const moved = Math.hypot(e.clientX - began.x, e.clientY - began.y) > MOVE_CANCEL_PX;
    const held = now - began.t > TAP_HOLD_MS;
    if (moved || held) {
      last = null;
      return;
    }
    const tap: TapPoint = { x: e.clientX, y: e.clientY, t: now };
    if (
      last &&
      now - last.t <= DOUBLE_GAP_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= TAP_SLACK_PX
    ) {
      last = null;
      if (now - lastFire > FIRE_DEBOUNCE_MS) {
        lastFire = now;
        onDoubleTap(tap.x, tap.y);
      }
      return;
    }
    last = tap;
  };

  const onPointerCancel = () => {
    last = null;
    start = null;
    movedTooFar = false;
  };

  const onDblClick = (e: MouseEvent) => {
    if (isNavDockGestureBlocked(e.target)) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastFire > FIRE_DEBOUNCE_MS) {
      lastFire = now;
      onDoubleTap(e.clientX, e.clientY);
    }
  };

  root.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
  root.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
  root.addEventListener("pointerup", onPointerUp, { passive: true, capture: true });
  root.addEventListener("pointercancel", onPointerCancel, { passive: true, capture: true });
  root.addEventListener("dblclick", onDblClick, { capture: true });

  return () => {
    root.removeEventListener("pointerdown", onPointerDown, true);
    root.removeEventListener("pointermove", onPointerMove, true);
    root.removeEventListener("pointerup", onPointerUp, true);
    root.removeEventListener("pointercancel", onPointerCancel, true);
    root.removeEventListener("dblclick", onDblClick, true);
  };
}
