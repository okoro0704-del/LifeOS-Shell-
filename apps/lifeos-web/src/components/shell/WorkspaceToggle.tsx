import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace, type WorkspaceMode } from "../../context/WorkspaceContext";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";
import { workspaceHomePath } from "./nav";

const OPTIONS: { mode: WorkspaceMode; label: string }[] = [
  { mode: "PERSONAL", label: "Personal" },
  { mode: "BUSINESS", label: "Business" },
];

/** Forgiving window so mobile double-taps register. */
const DOUBLE_TAP_MS = 650;
const COOLDOWN_MS = 400;

export type WorkspaceToggleProps = {
  onModeChange?: (mode: WorkspaceMode) => void;
  /** Compact control for bottom nav — double-tap flips space. */
  variant?: "segmented" | "space";
};

/**
 * Personal ↔ Business space switch.
 * Double-tap flips space and lands on that space's home (Personal → Main kernel).
 */
export function WorkspaceToggle({
  onModeChange,
  variant = "segmented",
}: WorkspaceToggleProps) {
  const { mode, setMode } = useWorkspace();
  const navigate = useNavigate();
  const lastTapAt = useRef(0);
  const lastFlipAt = useRef(0);
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<number | null>(null);

  const flipSpace = useCallback(() => {
    const now = Date.now();
    if (now - lastFlipAt.current < COOLDOWN_MS) return;
    lastFlipAt.current = now;
    lastTapAt.current = 0;
    setArmed(false);
    if (armTimer.current) window.clearTimeout(armTimer.current);

    const next: WorkspaceMode = mode === "PERSONAL" ? "BUSINESS" : "PERSONAL";
    void triggerWorkspaceHaptic();
    setMode(next);
    onModeChange?.(next);
    navigate(workspaceHomePath(next), { replace: false });
  }, [mode, setMode, onModeChange, navigate]);

  const onSpaceActivate = useCallback(() => {
    const now = Date.now();
    if (now - lastFlipAt.current < COOLDOWN_MS) return;

    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      flipSpace();
      return;
    }

    lastTapAt.current = now;
    setArmed(true);
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => {
      setArmed(false);
      lastTapAt.current = 0;
    }, DOUBLE_TAP_MS);
  }, [flipSpace]);

  useEffect(() => {
    return () => {
      if (armTimer.current) window.clearTimeout(armTimer.current);
    };
  }, []);

  if (variant === "space") {
    return (
      <button
        type="button"
        className={`bottom-item bottom-item--space${armed ? " is-armed" : ""}`}
        aria-label={`Space: ${mode === "PERSONAL" ? "Personal" : "Business"}. Double-tap to switch.`}
        title="Double-tap to switch space"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSpaceActivate();
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          flipSpace();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSpaceActivate();
          }
        }}
      >
        <span className="bottom-icon bottom-icon--space" aria-hidden>
          {mode === "PERSONAL" ? "◎" : "◈"}
        </span>
        <span>Space</span>
        <span className="bottom-item__sub">
          {armed ? "Tap again" : mode === "PERSONAL" ? "Personal" : "Business"}
        </span>
      </button>
    );
  }

  return (
    <div
      className="workspace-toggle"
      role="group"
      aria-label="Space — tap a side, or double-tap to flip"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            className={`workspace-toggle__btn${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => {
              const now = Date.now();
              if (now - lastTapAt.current < DOUBLE_TAP_MS) {
                lastTapAt.current = 0;
                flipSpace();
                return;
              }
              lastTapAt.current = now;
              if (opt.mode === mode) return;
              void triggerWorkspaceHaptic();
              setMode(opt.mode);
              onModeChange?.(opt.mode);
              navigate(workspaceHomePath(opt.mode));
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              flipSpace();
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
