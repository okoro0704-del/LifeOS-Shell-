import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace, type WorkspaceMode } from "../../context/WorkspaceContext";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";
import { personalLandingPath } from "../../lib/personalConnectivity";
import { workspaceHomePath } from "./nav";

const OPTIONS: { mode: WorkspaceMode; label: string }[] = [
  { mode: "PERSONAL", label: "Personal" },
  { mode: "BUSINESS", label: "Business" },
];

const COOLDOWN_MS = 350;
const DOUBLE_TAP_MS = 420;

export type WorkspaceToggleProps = {
  onModeChange?: (mode: WorkspaceMode) => void;
  /** Compact control for bottom nav — double-tap flips space. */
  variant?: "segmented" | "space";
};

/**
 * Personal ↔ Business space switch.
 * Bottom Space control: double-tap only (avoids accidental flips).
 * Segmented control: explicit Personal / Business buttons.
 */
export function WorkspaceToggle({
  onModeChange,
  variant = "segmented",
}: WorkspaceToggleProps) {
  const { mode, setMode } = useWorkspace();
  const navigate = useNavigate();
  const lastFlipAt = useRef(0);
  const lastTapAt = useRef(0);
  /** Ignore the synthetic click that follows touchend on mobile. */
  const touchHandled = useRef(false);

  const flipSpace = useCallback(() => {
    const now = Date.now();
    if (now - lastFlipAt.current < COOLDOWN_MS) return;
    lastFlipAt.current = now;

    const next: WorkspaceMode = mode === "PERSONAL" ? "BUSINESS" : "PERSONAL";
    void triggerWorkspaceHaptic();
    setMode(next);
    onModeChange?.(next);
    navigate(next === "PERSONAL" ? personalLandingPath() : workspaceHomePath(next));
  }, [mode, setMode, onModeChange, navigate]);

  const onDoubleActivate = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAt.current < DOUBLE_TAP_MS) {
      lastTapAt.current = 0;
      flipSpace();
      return;
    }
    lastTapAt.current = now;
  }, [flipSpace]);

  const goToMode = useCallback(
    (next: WorkspaceMode) => {
      if (next === mode) return;
      const now = Date.now();
      if (now - lastFlipAt.current < COOLDOWN_MS) return;
      lastFlipAt.current = now;
      void triggerWorkspaceHaptic();
      setMode(next);
      onModeChange?.(next);
      navigate(next === "PERSONAL" ? personalLandingPath() : workspaceHomePath(next));
    },
    [mode, setMode, onModeChange, navigate],
  );

  if (variant === "space") {
    return (
      <button
        type="button"
        className="bottom-item bottom-item--space"
        aria-label={`Double-tap to switch space. Now ${mode === "PERSONAL" ? "Personal" : "Business"}.`}
        title="Double-tap to switch space"
        onTouchEnd={(e) => {
          e.preventDefault();
          touchHandled.current = true;
          onDoubleActivate();
          window.setTimeout(() => {
            touchHandled.current = false;
          }, 450);
        }}
        onClick={() => {
          if (touchHandled.current) return;
          onDoubleActivate();
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          if (touchHandled.current) return;
          flipSpace();
        }}
      >
        <span className="bottom-icon bottom-icon--space" aria-hidden>
          {mode === "PERSONAL" ? "◎" : "◈"}
        </span>
        <span>Space</span>
        <span className="bottom-item__sub">
          {mode === "PERSONAL" ? "Personal" : "Business"}
        </span>
      </button>
    );
  }

  return (
    <div className="workspace-toggle" role="group" aria-label="Space switch">
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            className={`workspace-toggle__btn${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => {
              if (opt.mode === mode) return;
              goToMode(opt.mode);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
