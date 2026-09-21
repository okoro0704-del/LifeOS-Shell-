import { personalKernelFromPath } from "./shell/nav";
import { useLocation } from "react-router-dom";
import { useNavigationDock } from "../context/NavigationDockContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

const LABEL = {
  main: "Main",
  free: "Free",
  offline: "Offline",
} as const;

/**
 * Persistent flat kernel signature — Personal Living LifeOS only.
 * Offline is infrastructure (not user-facing). Hidden on TV/Radio surfaces.
 */
export function ActiveKernelSignature() {
  const location = useLocation();
  const { mode } = useWorkspace();
  const { shellControlsVisible } = useNavigationDock();
  const { surface } = useLifeOsSurface();
  const kernel = personalKernelFromPath(location.pathname) ?? "main";

  if (mode === "BUSINESS") return null;
  if (surface !== "LIVING_LIFEOS") return null;

  const label = LABEL[kernel];
  if (!label) return null;
  const hide = shellControlsVisible;

  return (
    <div
      className={`lifeos-kernel-sig${hide ? " is-suppressed" : ""}`}
      data-kernel-sig={label.toLowerCase()}
      aria-hidden="true"
      role="presentation"
      style={{ pointerEvents: "none" }}
    >
      <span className="lifeos-kernel-sig__text">{label}</span>
    </div>
  );
}
