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
 * Persistent flat kernel signature — environmental context only.
 * Suppressed while the interactive kernel switcher is revealed.
 */
export function ActiveKernelSignature() {
  const location = useLocation();
  const { mode } = useWorkspace();
  const { shellControlsVisible } = useNavigationDock();
  const kernel = personalKernelFromPath(location.pathname) ?? "main";

  // Business space has no Offline/Main/Free personal kernels — still show Main as ambient OS context.
  const label = mode === "BUSINESS" ? "Main" : LABEL[kernel];
  const hide = shellControlsVisible && mode === "PERSONAL";

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
