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
 * - Double-tap left half → Offline (or Main if already Offline)
 * - Double-tap right half → Free (or Main if already Free)
 * Works from every kernel — Main / Free / Offline.
 *
 * After reconnecting to the internet, the next kernel switch may launch TrustID face scan.
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

      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      const leavingOffline = current === "offline" && kernel !== "offline";
      const requireFace =
        online && !isAuthBypass() && (needsFaceOnKernelSwitch() || leavingOffline);

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
          ".bottom-nav, .app-header, .sidebar, .page-topbar, .kernel-brand-bar, .segment-topbar, .command-overlay, .elcom-float, .live-float, .live-dock, .elcom-full, .immersive-feed__rail, .engage-sheet, a, button, input, textarea, select, label",
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
        const current = personalKernelFromPath(location.pathname) ?? "main";
        if (side === "left") {
          goKernel(current === "offline" ? "main" : "offline");
        } else {
          goKernel(current === "free" ? "main" : "free");
        }
        return;
      }
      ref.current = now;
    },
    [goKernel, location.pathname],
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
