import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigationDock } from "../context/NavigationDockContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { attachNavDockDoubleTap } from "../lib/navDockGesture";

/**
 * TV/Radio: single tap summons remote; double tap summons Now/Next.
 * Offline hub and Business toggle shell; Living toggles its surface switcher.
 * BUSINESS: double-tap toggles unified Business shell controls.
 */
export function NavigationDockGestures({ children }: { children: ReactNode }) {
  const { toggle, expanded, close } = useNavigationDock();
  const { mode } = useWorkspace();
  const {
    toggleSwitcher,
    switcherVisible,
    closeSwitcher,
    surface,
    controlVisible,
    closeControl,
    openControl,
    openNowNext,
  } = useLifeOsSurface();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const switcherRef = useRef(switcherVisible);
  switcherRef.current = switcherVisible;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const controlRef = useRef(controlVisible);
  controlRef.current = controlVisible;
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
            openNowNext();
          } else if (surfaceRef.current === "OFFLINE_HUB") {
            if (switcherRef.current) closeSwitcher();
            if (expandedRef.current) close();
            else toggle();
          } else {
            if (expandedRef.current) close();
            if (controlRef.current) closeControl();
            toggleSwitcher();
          }
        } else {
          if (switcherRef.current) closeSwitcher();
          if (controlRef.current) closeControl();
          toggle();
        }
        window.setTimeout(() => setRipple(null), 420);
      },
      () => {
        if (
          modeRef.current === "PERSONAL" &&
          (surfaceRef.current === "TV" || surfaceRef.current === "RADIO")
        ) {
          openControl();
        }
      },
    );
  }, [toggle, toggleSwitcher, close, closeSwitcher, closeControl, openControl, openNowNext]);

  return (
    <div
      className="lifeos-nav-dock-gesture-root"
      ref={rootRef}
      data-lifeos-surface={surface}
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
