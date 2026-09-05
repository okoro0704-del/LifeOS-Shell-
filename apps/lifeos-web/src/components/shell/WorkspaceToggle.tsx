import { useWorkspace, type WorkspaceMode } from "../../context/WorkspaceContext";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";

const OPTIONS: { mode: WorkspaceMode; label: string }[] = [
  { mode: "PERSONAL", label: "Personal" },
  { mode: "BUSINESS", label: "Business" },
];

export type WorkspaceToggleProps = {
  /** Optional callback after mode changes (e.g. navigate to workspace home). */
  onModeChange?: (mode: WorkspaceMode) => void;
};

/** Segmented Personal / Business switcher — no full page reload. */
export function WorkspaceToggle({ onModeChange }: WorkspaceToggleProps) {
  const { mode, setMode } = useWorkspace();

  return (
    <div className="workspace-toggle" role="group" aria-label="Workspace">
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
