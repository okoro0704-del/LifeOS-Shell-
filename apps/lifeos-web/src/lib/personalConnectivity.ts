import type { PersonalKernel } from "../components/shell/nav";
import { personalKernelPath } from "../components/shell/nav";

const PENDING_KERNEL_KEY = "lifeos.pending_kernel";
const NEEDS_FACE_KEY = "lifeos.needs_face_on_kernel";
const AUTH_BYPASS = (import.meta.env.VITE_AUTH_BYPASS ?? "").toLowerCase() === "true";

export function isAuthBypass(): boolean {
  return AUTH_BYPASS;
}

export function setPendingKernel(kernel: PersonalKernel) {
  try {
    sessionStorage.setItem(PENDING_KERNEL_KEY, kernel);
  } catch {
    /* private mode */
  }
}

export function consumePendingKernel(): PersonalKernel | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KERNEL_KEY);
    sessionStorage.removeItem(PENDING_KERNEL_KEY);
    if (raw === "offline" || raw === "main" || raw === "free") return raw;
  } catch {
    /* */
  }
  return null;
}

export function peekPendingKernelPath(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KERNEL_KEY);
    if (raw === "offline" || raw === "main" || raw === "free") {
      return personalKernelPath(raw);
    }
  } catch {
    /* */
  }
  return null;
}

export function markNeedsFaceOnKernelSwitch(needs: boolean) {
  try {
    if (needs) sessionStorage.setItem(NEEDS_FACE_KEY, "1");
    else sessionStorage.removeItem(NEEDS_FACE_KEY);
  } catch {
    /* */
  }
}

export function needsFaceOnKernelSwitch(): boolean {
  try {
    return sessionStorage.getItem(NEEDS_FACE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Default personal landing path after login /app redirect. */
export function personalLandingPath(): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "/app/personal/offline";
  }
  const pending = peekPendingKernelPath();
  if (pending) return pending;
  return "/app/personal/post";
}
