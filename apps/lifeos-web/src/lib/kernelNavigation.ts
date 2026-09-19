import type { PersonalKernel } from "../components/shell/nav";

/** Canonical spatial order: Free ↔ Offline ↔ Main */
export const KERNEL_NAV_ORDER: PersonalKernel[] = ["free", "offline", "main"];

export type KernelSwipeFingers = 2;

const LAST_KERNEL_KEY = "lifeos.last_selected_kernel";
const SWIPE_ENABLED_KEY = "lifeos.kernel_swipe_enabled";
const SWIPE_FINGERS_KEY = "lifeos.kernel_swipe_fingers";

function scopeKey(base: string, trustId?: string | null): string {
  const id = (trustId || "").trim();
  return id ? `${base}.${id}` : base;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function kernelDisplayName(kernel: PersonalKernel): string {
  if (kernel === "free") return "Free";
  if (kernel === "offline") return "Offline";
  return "Main";
}

export function getLastSelectedKernel(trustId?: string | null): PersonalKernel | null {
  const raw = readRaw(scopeKey(LAST_KERNEL_KEY, trustId));
  if (raw === "free" || raw === "offline" || raw === "main") return raw;
  // Migrate unscoped legacy key into current scope when present.
  if (trustId) {
    const legacy = readRaw(LAST_KERNEL_KEY);
    if (legacy === "free" || legacy === "offline" || legacy === "main") {
      writeRaw(scopeKey(LAST_KERNEL_KEY, trustId), legacy);
      return legacy;
    }
  }
  return null;
}

/** Persist only after a successful deliberate kernel transition. */
export function setLastSelectedKernel(kernel: PersonalKernel, trustId?: string | null) {
  writeRaw(scopeKey(LAST_KERNEL_KEY, trustId), kernel);
}

export function isKernelSwipeEnabled(trustId?: string | null): boolean {
  const raw = readRaw(scopeKey(SWIPE_ENABLED_KEY, trustId));
  if (raw === "0" || raw === "false") return false;
  return true;
}

export function setKernelSwipeEnabled(enabled: boolean, trustId?: string | null) {
  writeRaw(scopeKey(SWIPE_ENABLED_KEY, trustId), enabled ? "1" : "0");
}

/** Kernel swipe is always 2 fingers (avoids Android 3-finger screenshot). */
export function getKernelSwipeFingers(_trustId?: string | null): KernelSwipeFingers {
  return 2;
}

export function setKernelSwipeFingers(fingers: KernelSwipeFingers, trustId?: string | null) {
  writeRaw(scopeKey(SWIPE_FINGERS_KEY, trustId), String(fingers));
}

export function adjacentKernel(
  current: PersonalKernel,
  direction: "left" | "right",
): PersonalKernel | null {
  const idx = KERNEL_NAV_ORDER.indexOf(current);
  if (idx < 0) return null;
  // Swipe left → move toward right neighbor (higher index).
  if (direction === "left") {
    return idx >= KERNEL_NAV_ORDER.length - 1 ? null : KERNEL_NAV_ORDER[idx + 1]!;
  }
  // Swipe right → move toward left neighbor (lower index).
  return idx <= 0 ? null : KERNEL_NAV_ORDER[idx - 1]!;
}

export const KERNEL_SWIPE_MIN_DX = 72;
export const KERNEL_SWIPE_MAX_DY_RATIO = 0.65;
export const KERNEL_SWIPE_MIN_VX = 0.35;

/** Pure recognizer: average of `needed` pointer samples → left/right or null. */
export function evaluateKernelSwipe(
  samples: Array<{ dx: number; dy: number; dtMs: number }>,
  needed: number,
): "left" | "right" | null {
  if (samples.length < needed) return null;
  const used = samples.slice(0, needed);
  const avgDx = used.reduce((s, t) => s + t.dx, 0) / used.length;
  const avgDy = used.reduce((s, t) => s + t.dy, 0) / used.length;
  const dt = Math.max(16, ...used.map((t) => t.dtMs));
  const vx = Math.abs(avgDx) / dt;
  const horizontal =
    Math.abs(avgDx) >= KERNEL_SWIPE_MIN_DX &&
    Math.abs(avgDy) <= Math.abs(avgDx) * KERNEL_SWIPE_MAX_DY_RATIO &&
    (Math.abs(avgDx) >= KERNEL_SWIPE_MIN_DX * 1.25 || vx >= KERNEL_SWIPE_MIN_VX);
  if (!horizontal) return null;
  return avgDx < 0 ? "left" : "right";
}
