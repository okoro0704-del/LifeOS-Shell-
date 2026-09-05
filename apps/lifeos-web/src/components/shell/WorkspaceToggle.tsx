import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace, type WorkspaceMode } from "../../context/WorkspaceContext";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";
import { workspaceHomePath } from "./nav";

const OPTIONS: { mode: WorkspaceMode; label: string }[] = [
  { mode: "PERSONAL", label: "Personal" },
  { mode: "BUSINESS", label: "Business" },
];

const DOUBLE_TAP_MS = 450;

export type WorkspaceToggleProps = {
  onModeChange?: (mode: WorkspaceMode) => void;
  /** Compact control for bottom nav — double-tap flips space. */
  variant?: "segmented" | "space";
};

/**
 * Personal ↔ Business space switch.
 * Double-tap (or double-click) flips to the other space and opens its home (Personal → Main).
 */
export function WorkspaceToggle({
  onModeChange,
  variant = "segmented",
}: WorkspaceToggleProps) {
  const { mode, setMode } = useWorkspace();
  const navigate = useNavigate();
  const lastTap = useRef(0);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<number | null>(null);

  const flipSpace = useCallback(() => {
    const next: WorkspaceMode = mode === "PERSONAL" ? "BUSINESS" : "PERSONAL";
    void triggerWorkspaceHaptic();
    setMode(next);
    onModeChange?.(next);
    navigate(workspaceHomePath(next));
    setHint(false);
  }, [mode, setMode, onModeChange, navigate]);

  const registerTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      flipSpace();
      return true;
    }
    lastTap.current = now;
    setHint(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(false), DOUBLE_TAP_MS + 50);
    return false;
  }, [flipSpace]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
    };
  }, []);

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      // Ignore secondary buttons / pen barrels
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      registerTap();
    },
    [registerTap],
  );

  if (variant === "space") {
    return (
      <button
        type="button"
        className={`bottom-item bottom-item--space${hint ? " is-armed" : ""}`}
        aria-label={`Space: ${mode === "PERSONAL" ? "Personal" : "Business"}. Double-tap to switch.`}
        title="Double-tap to switch space"
        onPointerUp={onPointerUp}
        onDoubleClick={(e) => {
          e.preventDefault();
          lastTap.current = 0;
          flipSpace();
        }}
      >
        <span className="bottom-icon bottom-icon--space" aria-hidden>
          {mode === "PERSONAL" ? "◎" : "◈"}
        </span>
        <span>Space</span>
        <span className="bottom-item__sub">
          {hint ? "Tap again" : mode === "PERSONAL" ? "Personal" : "Business"}
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
            onPointerUp={(e) => {
              if (e.button !== 0 && e.pointerType === "mouse") return;
              const now = Date.now();
              if (now - lastTap.current < DOUBLE_TAP_MS) {
                lastTap.current = 0;
                flipSpace();
                return;
              }
              lastTap.current = now;
              if (opt.mode === mode) return;
              void triggerWorkspaceHaptic();
              setMode(opt.mode);
              onModeChange?.(opt.mode);
              navigate(workspaceHomePath(opt.mode));
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
