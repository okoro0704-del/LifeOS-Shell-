import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigationDock } from "../context/NavigationDockContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { attachNavDockDoubleTap } from "../lib/navDockGesture";

/**
 * PERSONAL: double-tap summons LifeOS · TV · Radio surface switcher.
 * BUSINESS: double-tap toggles unified Business shell controls.
 * Double-tap while switcher/shell open closes it (canonical toggle).
 */
export function NavigationDockGestures({ children }: { children: ReactNode }) {
  const { toggle, expanded, close } = useNavigationDock();
  const { mode } = useWorkspace();
  const { toggleSwitcher, switcherVisible, closeSwitcher, surface } = useLifeOsSurface();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const switcherRef = useRef(switcherVisible);
  switcherRef.current = switcherVisible;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return attachNavDockDoubleTap(root, (x, y) => {
      setRipple({ x, y, id: Date.now() });
      if (modeRef.current === "PERSONAL") {
        // Close shell if it was open — surface switcher is the Personal summon.
        if (expandedRef.current) close();
        toggleSwitcher();
      } else {
        if (switcherRef.current) closeSwitcher();
        toggle();
      }
      window.setTimeout(() => setRipple(null), 420);
    });
  }, [toggle, toggleSwitcher, close, closeSwitcher]);

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
