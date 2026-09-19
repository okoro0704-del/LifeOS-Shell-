/** Shared helpers for double-tap → navigation dock (gesture arbitration). */

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
  ".lifeos-transient-alerts",
  ".bottom-nav",
  ".command-overlay",
  "video",
].join(",");

export function isNavDockGestureBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

const DOUBLE_MS = 320;
const MOVE_CANCEL_PX = 14;

type TapPoint = { x: number; y: number; t: number };

/**
 * Detect double-tap / double-click on eligible surfaces.
 * Media double-tap-to-like stays on ImmersiveMediaFeed (blocked selector).
 */
export function attachNavDockDoubleTap(
  root: HTMLElement,
  onDoubleTap: (clientX: number, clientY: number) => void,
): () => void {
  let last: TapPoint | null = null;
  let start: TapPoint | null = null;

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
    const moved =
      Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX;
    const now = Date.now();
    if (moved || now - start.t > DOUBLE_MS) {
      last = null;
      start = null;
      return;
    }
    const tap: TapPoint = { x: e.clientX, y: e.clientY, t: now };
    if (
      last &&
      now - last.t <= DOUBLE_MS &&
      Math.hypot(tap.x - last.x, tap.y - last.y) <= MOVE_CANCEL_PX * 2
    ) {
      last = null;
      start = null;
      onDoubleTap(tap.x, tap.y);
      return;
    }
    last = tap;
    start = null;
  };

  const onDblClick = (e: MouseEvent) => {
    if (isNavDockGestureBlocked(e.target)) return;
    e.preventDefault();
    onDoubleTap(e.clientX, e.clientY);
  };

  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointerup", onPointerUp, { passive: true });
  root.addEventListener("dblclick", onDblClick);

  return () => {
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("pointerup", onPointerUp);
    root.removeEventListener("dblclick", onDblClick);
  };
}
