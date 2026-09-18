import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
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
  getKernelSwipeFingers,
  isKernelSwipeEnabled,
  kernelDisplayName,
  KERNEL_NAV_ORDER,
  setLastSelectedKernel,
} from "../../lib/kernelNavigation";

const DOUBLE_TAP_MS = 480;
const SWIPE_MIN_DX = 72;
const SWIPE_MAX_DY_RATIO = 0.65;
const SWIPE_MIN_VX = 0.35;

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
 * - Double-tap → open kernel chooser (no direct switch)
 * - Configured N-finger horizontal swipe → adjacent kernel
 */
export function PersonalKernelGestures({ children }: { children: ReactNode }) {
  const { mode } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const trustId = user?.trustId ?? null;

  const [chooserOpen, setChooserOpen] = useState(false);
  const lastTapAt = useRef(0);
  const touchHandled = useRef(false);
  const multiActive = useRef(false);
  const tracks = useRef<Map<number, TouchTrack>>(new Map());
  const edgePulse = useRef(0);

  const current = personalKernelFromPath(location.pathname) ?? "main";

  const goKernel = useCallback(
    (kernel: PersonalKernel): boolean => {
      const from = personalKernelFromPath(location.pathname) ?? "main";
      if (from === kernel) {
        setChooserOpen(false);
        return true;
      }

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
        // Preference saved after successful session landing consumes pending kernel.
        setChooserOpen(false);
        return false;
      }

      void triggerWorkspaceHaptic();
      navigate(personalKernelPath(kernel));
      setLastSelectedKernel(kernel, trustId);
      setChooserOpen(false);
      return true;
    },
    [location.pathname, navigate, trustId],
  );

  useEffect(() => {
    if (!chooserOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChooserOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooserOpen]);

  const onBodyDoubleTap = useCallback(
    (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      if (
        el?.closest(
          ".bottom-nav, .app-header, .sidebar, .page-topbar, .kernel-brand-bar, .segment-topbar, .command-overlay, .elcom-float, .live-float, .live-dock, .elcom-full, .immersive-feed__rail, .engage-sheet, .kernel-chooser, a, button, input, textarea, select, label",
        )
      ) {
        return;
      }
      if (multiActive.current) return;

      const now = Date.now();
      if (now - lastTapAt.current < DOUBLE_TAP_MS) {
        lastTapAt.current = 0;
        setChooserOpen(true);
        void triggerWorkspaceHaptic();
        return;
      }
      lastTapAt.current = now;
    },
    [],
  );

  const finishMultiSwipe = useCallback(
    (direction: "left" | "right") => {
      const next = adjacentKernel(current, direction);
      if (!next) {
        edgePulse.current = Date.now();
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
    const needed = getKernelSwipeFingers(trustId);
    if (isKernelSwipeEnabled(trustId) && tracks.current.size >= needed) {
      multiActive.current = true;
      lastTapAt.current = 0;
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
  };

  const onTouchEnd = (e: TouchEvent) => {
    const needed = getKernelSwipeFingers(trustId);
    const enabled = isKernelSwipeEnabled(trustId);
    const activeCount = tracks.current.size;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      if (!t) continue;
      // keep until all ended — evaluate on last finger of a multi gesture
    }

    // Update tracks for ended touches but keep snapshot for gesture eval
    const snapshot = [...tracks.current.values()];
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      if (t) tracks.current.delete(t.identifier);
    }

    if (enabled && multiActive.current && activeCount === needed && tracks.current.size === 0) {
      multiActive.current = false;
      if (snapshot.length === needed) {
        const avgDx =
          snapshot.reduce((s, tr) => s + (tr.x - tr.x0), 0) / snapshot.length;
        const avgDy =
          snapshot.reduce((s, tr) => s + (tr.y - tr.y0), 0) / snapshot.length;
        const dt =
          Math.max(
            16,
            Date.now() - Math.min(...snapshot.map((tr) => tr.t0)),
          );
        const vx = Math.abs(avgDx) / dt;
        const horizontal =
          Math.abs(avgDx) >= SWIPE_MIN_DX &&
          Math.abs(avgDy) <= Math.abs(avgDx) * SWIPE_MAX_DY_RATIO &&
          (Math.abs(avgDx) >= SWIPE_MIN_DX * 1.25 || vx >= SWIPE_MIN_VX);
        if (horizontal && !chooserOpen) {
          finishMultiSwipe(avgDx < 0 ? "left" : "right");
          touchHandled.current = true;
          window.setTimeout(() => {
            touchHandled.current = false;
          }, 400);
          return;
        }
      }
    }

    if (tracks.current.size === 0) multiActive.current = false;

    // Single-finger double-tap path (ignore multi)
    if (activeCount === 1 && !multiActive.current && e.changedTouches[0]) {
      const t = e.changedTouches[0];
      touchHandled.current = true;
      onBodyDoubleTap(e.target);
      window.setTimeout(() => {
        touchHandled.current = false;
      }, 400);
      void t;
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
      }}
      onClick={(e) => {
        if (touchHandled.current) return;
        onBodyDoubleTap(e.target);
      }}
    >
      {children}
      {chooserOpen ? (
        <div
          className="kernel-chooser"
          role="dialog"
          aria-modal="true"
          aria-label="Switch Kernel"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChooserOpen(false);
          }}
        >
          <div className="kernel-chooser__sheet">
            <h2 className="kernel-chooser__title">Switch Kernel</h2>
            <ul className="kernel-chooser__list">
              {KERNEL_NAV_ORDER.map((k) => {
                const active = k === current;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      className={`kernel-chooser__option${active ? " is-current" : ""}`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => goKernel(k)}
                    >
                      <span className="kernel-chooser__check" aria-hidden>
                        {active ? "✓" : ""}
                      </span>
                      <span>{kernelDisplayName(k)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="kernel-chooser__cancel"
              onClick={() => setChooserOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
