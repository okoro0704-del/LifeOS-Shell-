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
  ".lifeos-nav-dock",
  ".lifeos-nav-dock__backdrop",
  ".lifeos-cmd-nav",
  ".lifeos-cmd-nav__hitlayer",
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
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

/** Max press duration for a tap (finger down → up). Was 320ms — too tight on mobile. */
export const TAP_HOLD_MS = 420;
/** Max gap between two taps to count as a double-tap. */
export const DOUBLE_GAP_MS = 480;
/** Max pointer travel during a press before it is treated as a scroll/drag. */
export const MOVE_CANCEL_PX = 22;
/** Max distance between the two taps' centers. */
export const TAP_SLACK_PX = 36;

type TapPoint = { x: number; y: number; t: number };

/**
 * Detect double-tap on eligible surfaces (pointer events — not dblclick-only).
 * Media double-tap-to-like stays on ImmersiveMediaFeed (blocked selector).
 */
export function attachNavDockDoubleTap(
  root: HTMLElement,
  onDoubleTap: (clientX: number, clientY: number) => void,
): () => void {
  let last: TapPoint | null = null;
  let start: TapPoint | null = null;
  let lastFire = 0;

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isNavDockGestureBlocked(e.target)) {
      last = null;
      start = null;
      return;
    }
    start = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!start) return;
    if (isNavDockGestureBlocked(e.target)) {
      last = null;
      start = null;
      return;
    }
    const now = Date.now();
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX;
    const held = now - start.t > TAP_HOLD_MS;
    if (moved || held) {
      // Scroll / long-press — clear streak.
      last = null;
      start = null;
      return;
    }
    const tap: TapPoint = { x: e.clientX, y: e.clientY, t: now };
    if (
      last &&
      now - last.t <= DOUBLE_GAP_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= TAP_SLACK_PX
    ) {
      last = null;
      start = null;
      // Debounce synthetic dblclick + pointer double-fire.
      if (now - lastFire > 280) {
        lastFire = now;
        onDoubleTap(tap.x, tap.y);
      }
      return;
    }
    last = tap;
    start = null;
  };

  const onPointerCancel = () => {
    last = null;
    start = null;
  };

  const onDblClick = (e: MouseEvent) => {
    if (isNavDockGestureBlocked(e.target)) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastFire > 280) {
      lastFire = now;
      onDoubleTap(e.clientX, e.clientY);
    }
  };

  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerup", onPointerUp, { passive: true });
  root.addEventListener("pointercancel", onPointerCancel, { passive: true });
  root.addEventListener("dblclick", onDblClick);

  return () => {
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("pointerup", onPointerUp);
    root.removeEventListener("pointercancel", onPointerCancel);
    root.removeEventListener("dblclick", onDblClick);
  };
}
