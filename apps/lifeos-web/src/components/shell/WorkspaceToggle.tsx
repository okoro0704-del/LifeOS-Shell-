import { useCallback, useRef, type MouseEvent, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace, type WorkspaceMode } from "../../context/WorkspaceContext";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";
import { workspaceHomePath } from "./nav";

const OPTIONS: { mode: WorkspaceMode; label: string }[] = [
  { mode: "PERSONAL", label: "Personal" },
  { mode: "BUSINESS", label: "Business" },
];

export type WorkspaceToggleProps = {
  onModeChange?: (mode: WorkspaceMode) => void;
  /** Compact control for bottom nav — double-tap flips space. */
  variant?: "segmented" | "space";
};

/**
 * Personal ↔ Business space switch.
 * Double-tap (or double-click) flips to the other space and opens its home.
 */
export function WorkspaceToggle({
  onModeChange,
  variant = "segmented",
}: WorkspaceToggleProps) {
  const { mode, setMode } = useWorkspace();
  const navigate = useNavigate();
  const lastTap = useRef(0);

  const flipSpace = useCallback(() => {
    const next: WorkspaceMode = mode === "PERSONAL" ? "BUSINESS" : "PERSONAL";
    void triggerWorkspaceHaptic();
    setMode(next);
    onModeChange?.(next);
    navigate(workspaceHomePath(next));
  }, [mode, setMode, onModeChange, navigate]);

  const onDoubleTapTarget = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const now = Date.now();
      if (now - lastTap.current < 380) {
        e.preventDefault();
        lastTap.current = 0;
        flipSpace();
        return;
      }
      lastTap.current = now;
    },
    [flipSpace],
  );

  if (variant === "space") {
    return (
      <button
        type="button"
        className="bottom-item bottom-item--space"
        aria-label={`Space: ${mode === "PERSONAL" ? "Personal" : "Business"}. Double-tap to switch.`}
        title="Double-tap to switch space"
        onClick={onDoubleTapTarget}
        onDoubleClick={(e) => {
          e.preventDefault();
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
    <div
      className="workspace-toggle"
      role="group"
      aria-label="Space — double-tap to flip Personal and Business"
      onDoubleClick={(e) => {
        e.preventDefault();
        flipSpace();
      }}
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
              if (now - lastTap.current < 380) {
                lastTap.current = 0;
                flipSpace();
                return;
              }
              lastTap.current = now;
              if (opt.mode === mode) return;
              void triggerWorkspaceHaptic();
              setMode(opt.mode);
              onModeChange?.(opt.mode);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
