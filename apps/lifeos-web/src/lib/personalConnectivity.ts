import type { PersonalKernel } from "../components/shell/nav";
import { personalKernelPath } from "../components/shell/nav";
import { isMobileApp } from "./mobileBridge";
import { setLastSelectedKernel } from "./kernelNavigation";

const PENDING_KERNEL_KEY = "lifeos.pending_kernel";
const NEEDS_FACE_KEY = "lifeos.needs_face_on_kernel";
const ENV_AUTH_BYPASS = (import.meta.env.VITE_AUTH_BYPASS ?? "").toLowerCase() === "true";

/** TrustID OAuth skipped when env flag is on, or on native Capacitor APK/IPA builds. */
export function isAuthBypass(): boolean {
  if (ENV_AUTH_BYPASS) return true;
  try {
    return isMobileApp();
  } catch {
    return false;
  }
}

export function setPendingKernel(kernel: PersonalKernel) {
  try {
    sessionStorage.setItem(PENDING_KERNEL_KEY, kernel);
  } catch {
    /* private mode */
  }
}

export function consumePendingKernel(trustId?: string | null): PersonalKernel | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KERNEL_KEY);
    sessionStorage.removeItem(PENDING_KERNEL_KEY);
    if (raw === "offline" || raw === "main" || raw === "free") {
      setLastSelectedKernel(raw, trustId);
      return raw;
    }
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

/** Landing after login /app redirect.
 * Online → Main. Offline → Offline (saved media).
 * Pending face-gate kernel still wins when present.
 */
export function personalLandingPath(trustId?: string | null): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setLastSelectedKernel("offline", trustId);
    return "/app/personal/offline/post";
  }
  const pending = peekPendingKernelPath();
  if (pending) return pending;
  setLastSelectedKernel("main", trustId);
  return "/app/personal/post";
}

/** When login cannot reach the network, enter Offline instead of failing. */
export function offlineLoginFallbackPath(trustId?: string | null): string {
  setLastSelectedKernel("offline", trustId);
  return "/app/personal/offline/post";
}
