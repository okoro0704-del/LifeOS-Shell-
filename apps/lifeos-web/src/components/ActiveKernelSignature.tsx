import { personalKernelFromPath } from "./shell/nav";
import { useLocation } from "react-router-dom";
import { useNavigationDock } from "../context/NavigationDockContext";
import { useWorkspace } from "../context/WorkspaceContext";

const LABEL = {
  main: "Main",
  free: "Free",
  offline: "Offline",
} as const;

/**
 * Persistent flat kernel signature — Personal Space only.
 * Business Space must not show Main/Free/Offline ambient labels.
 */
export function ActiveKernelSignature() {
  const location = useLocation();
  const { mode } = useWorkspace();
  const { shellControlsVisible } = useNavigationDock();
  const kernel = personalKernelFromPath(location.pathname) ?? "main";

  if (mode === "BUSINESS") return null;

  const label = LABEL[kernel];
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
