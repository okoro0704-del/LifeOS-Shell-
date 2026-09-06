import { useCallback, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { personalKernelFromPath, personalKernelPath, type PersonalKernel } from "./nav";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";
import { authClient } from "../../lib/api";
import {
  isAuthBypass,
  markNeedsFaceOnKernelSwitch,
  needsFaceOnKernelSwitch,
  setPendingKernel,
} from "../../lib/personalConnectivity";

const DOUBLE_TAP_MS = 480;

/**
 * Personal kernel body gestures (not bottom tabs):
 * - Double-tap left half of the app body → Offline
 * - Double-tap right half of the app body → Free
 * - Main is default on login / online
 *
 * After reconnecting to the internet, the next kernel switch launches TrustID face scan.
 */
export function PersonalKernelGestures({ children }: { children: ReactNode }) {
  const { mode } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const leftTap = useRef(0);
  const rightTap = useRef(0);
  const touchHandled = useRef(false);

  const goKernel = useCallback(
    (kernel: PersonalKernel) => {
      const current = personalKernelFromPath(location.pathname) ?? "main";
      if (current === kernel) return;
      // Enter Free/Offline only from Main. Leaving a kernel is via the Home × only.
      if (current !== "main") return;

      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      const requireFace = online && !isAuthBypass() && needsFaceOnKernelSwitch();

      if (requireFace) {
        setPendingKernel(kernel);
        markNeedsFaceOnKernelSwitch(false);
        void triggerWorkspaceHaptic();
        void authClient.beginLogin({
          preferPasskey: true,
          silentUi: true,
          prompt: "login",
        });
        return;
      }

      void triggerWorkspaceHaptic();
      navigate(personalKernelPath(kernel));
    },
    [location.pathname, navigate],
  );

  const onBodyActivate = useCallback(
    (clientX: number, target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      if (
        el?.closest(
          ".bottom-nav, .app-header, .sidebar, .page-topbar, .kernel-brand-bar, .command-overlay, a, button, input, textarea, select, label",
        )
      ) {
        return;
      }

      const width = typeof window !== "undefined" ? window.innerWidth : 0;
      if (!width) return;
      const side: "left" | "right" = clientX < width / 2 ? "left" : "right";
      const now = Date.now();
      const ref = side === "left" ? leftTap : rightTap;
      const other = side === "left" ? rightTap : leftTap;
      other.current = 0;

      if (now - ref.current < DOUBLE_TAP_MS) {
        ref.current = 0;
        goKernel(side === "left" ? "offline" : "free");
        return;
      }
      ref.current = now;
    },
    [goKernel],
  );

  if (mode !== "PERSONAL") {
    return <>{children}</>;
  }

  return (
    <div
      className="personal-kernel-gestures"
      onTouchEnd={(e) => {
        const t = e.changedTouches[0];
        if (!t) return;
        touchHandled.current = true;
        onBodyActivate(t.clientX, e.target);
        window.setTimeout(() => {
          touchHandled.current = false;
        }, 400);
      }}
      onClick={(e) => {
        if (touchHandled.current) return;
        onBodyActivate(e.clientX, e.target);
      }}
    >
      {children}
    </div>
  );
}
