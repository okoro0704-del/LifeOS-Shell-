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

export type WorkspaceToggleProps = {
  onModeChange?: (mode: WorkspaceMode) => void;
  /** Compact control for bottom nav — tap (or double-tap) flips space. */
  variant?: "segmented" | "space";
};

/**
 * Personal ↔ Business space switch.
 * Mobile: one tap flips. Desktop Space: one tap or double-click flips.
 * Lands on Personal Main or Business Home.
 */
export function WorkspaceToggle({
  onModeChange,
  variant = "segmented",
}: WorkspaceToggleProps) {
  const { mode, setMode } = useWorkspace();
  const navigate = useNavigate();
  const lastFlipAt = useRef(0);
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
        aria-label={`Switch space. Now ${mode === "PERSONAL" ? "Personal" : "Business"}.`}
        title="Tap to switch space"
        onTouchEnd={(e) => {
          // Prefer touchend on mobile — more reliable than click/dblclick.
          e.preventDefault();
          touchHandled.current = true;
          flipSpace();
          window.setTimeout(() => {
            touchHandled.current = false;
          }, 400);
        }}
        onClick={() => {
          if (touchHandled.current) return;
          flipSpace();
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
            onTouchEnd={(e) => {
              e.preventDefault();
              touchHandled.current = true;
              if (opt.mode === mode) {
                flipSpace();
              } else {
                goToMode(opt.mode);
              }
              window.setTimeout(() => {
                touchHandled.current = false;
              }, 400);
            }}
            onClick={() => {
              if (touchHandled.current) return;
              if (opt.mode === mode) {
                flipSpace();
                return;
              }
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
