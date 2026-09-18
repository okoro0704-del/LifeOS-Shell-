import { useCallback, useRef, type ReactNode, type TouchEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import { personalKernelFromPath, personalKernelPath, type PersonalKernel } from "./nav";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";
import { authClient } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import {
  isAuthBypass,
  markNeedsFaceOnKernelSwitch,
  needsFaceOnKernelSwitch,
  setPendingKernel,
} from "../../lib/personalConnectivity";
import {
  adjacentKernel,
  evaluateKernelSwipe,
  getKernelSwipeFingers,
  isKernelSwipeEnabled,
  setLastSelectedKernel,
} from "../../lib/kernelNavigation";

type TouchTrack = {
  id: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t0: number;
};

/**
 * Personal kernel body gestures:
 * Configured N-finger horizontal swipe → adjacent Free ↔ Offline ↔ Main.
 * No double-tap chooser; kernels are peer positions (no close-to-Main UX).
 */
export function PersonalKernelGestures({ children }: { children: ReactNode }) {
  const { mode } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const trustId = user?.trustId ?? null;

  const multiActive = useRef(false);
  const peakPointers = useRef(0);
  const tracks = useRef<Map<number, TouchTrack>>(new Map());
  const swipeConsumed = useRef(false);

  const current = personalKernelFromPath(location.pathname) ?? "main";

  const goKernel = useCallback(
    (kernel: PersonalKernel): boolean => {
      const from = personalKernelFromPath(location.pathname) ?? "main";
      if (from === kernel) return true;

      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      const leavingOffline = from === "offline" && kernel !== "offline";
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
        return false;
      }

      void triggerWorkspaceHaptic();
      navigate(personalKernelPath(kernel));
      setLastSelectedKernel(kernel, trustId);
      return true;
    },
    [location.pathname, navigate, trustId],
  );

  const finishMultiSwipe = useCallback(
    (direction: "left" | "right") => {
      const next = adjacentKernel(current, direction);
      if (!next) {
        void triggerWorkspaceHaptic();
        return;
      }
      goKernel(next);
    },
    [current, goKernel],
  );

  const onTouchStart = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      if (!t) continue;
      tracks.current.set(t.identifier, {
        id: t.identifier,
        x0: t.clientX,
        y0: t.clientY,
        x: t.clientX,
        y: t.clientY,
        t0: Date.now(),
      });
    }
    peakPointers.current = Math.max(peakPointers.current, tracks.current.size);
    const needed = getKernelSwipeFingers(trustId);
    if (isKernelSwipeEnabled(trustId) && tracks.current.size >= needed) {
      multiActive.current = true;
      swipeConsumed.current = false;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      if (!t) continue;
      const tr = tracks.current.get(t.identifier);
      if (!tr) continue;
      tr.x = t.clientX;
      tr.y = t.clientY;
    }
    // Claim the gesture only once N fingers are clearly horizontal — avoids fighting 1-finger scroll.
    if (multiActive.current && !swipeConsumed.current) {
      const needed = getKernelSwipeFingers(trustId);
      const snapshot = [...tracks.current.values()];
      if (snapshot.length >= needed) {
        const samples = snapshot.slice(0, needed).map((tr) => ({
          dx: tr.x - tr.x0,
          dy: tr.y - tr.y0,
          dtMs: Math.max(16, Date.now() - tr.t0),
        }));
        const dir = evaluateKernelSwipe(samples, needed);
        if (dir) {
          // Soft claim: preventDefault only after recognition threshold so vertical scroll stays natural.
          if (e.cancelable) e.preventDefault();
        }
      }
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    const needed = getKernelSwipeFingers(trustId);
    const enabled = isKernelSwipeEnabled(trustId);

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      if (!t) continue;
      const tr = tracks.current.get(t.identifier);
      if (tr) {
        tr.x = t.clientX;
        tr.y = t.clientY;
      }
    }

    const snapshot = [...tracks.current.values()];
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      if (t) tracks.current.delete(t.identifier);
    }

    // Evaluate when the last finger lifts (fingers often lift sequentially on Android).
    if (
      enabled &&
      multiActive.current &&
      !swipeConsumed.current &&
      tracks.current.size === 0 &&
      peakPointers.current >= needed &&
      snapshot.length >= needed
    ) {
      const samples = snapshot.slice(0, needed).map((tr) => ({
        dx: tr.x - tr.x0,
        dy: tr.y - tr.y0,
        dtMs: Math.max(16, Date.now() - tr.t0),
      }));
      const dir = evaluateKernelSwipe(samples, needed);
      if (dir) {
        swipeConsumed.current = true;
        finishMultiSwipe(dir);
      }
    }

    if (tracks.current.size === 0) {
      multiActive.current = false;
      peakPointers.current = 0;
      swipeConsumed.current = false;
    }
  };

  if (mode !== "PERSONAL") {
    return <>{children}</>;
  }

  return (
    <div
      className="personal-kernel-gestures"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        tracks.current.clear();
        multiActive.current = false;
        peakPointers.current = 0;
        swipeConsumed.current = false;
      }}
    >
      {children}
    </div>
  );
}
