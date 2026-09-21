import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigationDock } from "../context/NavigationDockContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { attachNavDockDoubleTap } from "../lib/navDockGesture";

/**
 * TV/Radio: double tap on broadcast → PROGRAM_INFO_REVEALED (creator + NOW/NEXT).
 * Single tap on broadcast does nothing — remote opens only via the edge reveal handle.
 * Offline hub and Business toggle shell; Living toggles its surface switcher.
 */
export function NavigationDockGestures({ children }: { children: ReactNode }) {
  const { toggle, expanded, close } = useNavigationDock();
  const { mode } = useWorkspace();
  const {
    toggleSwitcher,
    switcherVisible,
    closeSwitcher,
    surface,
    broadcastUiMode,
    closeBroadcastUi,
    openProgramInfo,
  } = useLifeOsSurface();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const switcherRef = useRef(switcherVisible);
  switcherRef.current = switcherVisible;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const uiModeRef = useRef(broadcastUiMode);
  uiModeRef.current = broadcastUiMode;
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return attachNavDockDoubleTap(
      root,
      (x, y) => {
        setRipple({ x, y, id: Date.now() });
        if (modeRef.current === "PERSONAL") {
          if (surfaceRef.current === "TV" || surfaceRef.current === "RADIO") {
            if (expandedRef.current) close();
            openProgramInfo();
          } else if (surfaceRef.current === "OFFLINE_HUB") {
            if (switcherRef.current) closeSwitcher();
            if (uiModeRef.current !== "HIDDEN") closeBroadcastUi();
            if (expandedRef.current) close();
            else toggle();
          } else {
            if (expandedRef.current) close();
            if (uiModeRef.current !== "HIDDEN") closeBroadcastUi();
            toggleSwitcher();
          }
        } else {
          if (switcherRef.current) closeSwitcher();
          if (uiModeRef.current !== "HIDDEN") closeBroadcastUi();
          toggle();
        }
        window.setTimeout(() => setRipple(null), 420);
      },
      // No single-tap broadcast action — edge handle owns REMOTE_REVEALED.
    );
  }, [
    toggle,
    toggleSwitcher,
    close,
    closeSwitcher,
    closeBroadcastUi,
    openProgramInfo,
  ]);

  return (
    <div
      className="lifeos-nav-dock-gesture-root"
      ref={rootRef}
      data-lifeos-surface={surface}
      data-broadcast-ui={broadcastUiMode}
    >
      {children}
      {ripple ? (
        <span
          className="lifeos-cmd-nav__ripple"
          style={{ left: ripple.x, top: ripple.y }}
          key={ripple.id}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
