import { useCallback, useRef, type ReactNode, type TouchEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  PERSONAL_KERNEL_ORDER,
  personalKernelFromPath,
  personalKernelPath,
  type PersonalKernel,
} from "./nav";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";

const SWIPE_MIN_PX = 56;

/**
 * Personal-space kernel gestures:
 * - Swipe / double-tap left edge → Offline
 * - Center (login & space switch) → Main
 * - Swipe / double-tap right edge → Free
 */
export function PersonalKernelGestures({ children }: { children: ReactNode }) {
  const { mode } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const touchX = useRef<number | null>(null);
  const leftTap = useRef(0);
  const rightTap = useRef(0);

  const goKernel = useCallback(
    (kernel: PersonalKernel) => {
      const current = personalKernelFromPath(location.pathname);
      if (current === kernel) return;
      void triggerWorkspaceHaptic();
      navigate(personalKernelPath(kernel));
    },
    [location.pathname, navigate],
  );

  const shiftKernel = useCallback(
    (dir: -1 | 1) => {
      const current = personalKernelFromPath(location.pathname) ?? "main";
      const idx = PERSONAL_KERNEL_ORDER.indexOf(current);
      const next = PERSONAL_KERNEL_ORDER[idx + dir];
      if (next) goKernel(next);
    },
    [location.pathname, goKernel],
  );

  if (mode !== "PERSONAL") {
    return <>{children}</>;
  }

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const dx = end - start;
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    // Finger moves left → next kernel (toward Free); right → Offline
    shiftKernel(dx < 0 ? 1 : -1);
  };

  const onEdgePointer = (side: "left" | "right") => {
    const now = Date.now();
    const ref = side === "left" ? leftTap : rightTap;
    if (now - ref.current < 400) {
      ref.current = 0;
      goKernel(side === "left" ? "offline" : "free");
      return;
    }
    ref.current = now;
  };

  return (
    <div
      className="personal-kernel-gestures"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        className="personal-kernel-edge personal-kernel-edge--left"
        aria-label="Double-tap for Offline kernel"
        onClick={() => onEdgePointer("left")}
      />
      <button
        type="button"
        className="personal-kernel-edge personal-kernel-edge--right"
        aria-label="Double-tap for Free kernel"
        onClick={() => onEdgePointer("right")}
      />
      {children}
    </div>
  );
}
