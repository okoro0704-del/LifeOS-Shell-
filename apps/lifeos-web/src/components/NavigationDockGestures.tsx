import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigationDock } from "../context/NavigationDockContext";
import { attachNavDockDoubleTap } from "../lib/navDockGesture";

/**
 * Shell-level double-tap toggles unified LifeOS controls (side nav + kernel bar).
 */
export function NavigationDockGestures({ children }: { children: ReactNode }) {
  const { toggle, expanded } = useNavigationDock();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return attachNavDockDoubleTap(root, (x, y) => {
      setRipple({ x, y, id: Date.now() });
      toggle();
      window.setTimeout(() => setRipple(null), 420);
    });
  }, [toggle]);

  return (
    <div className="lifeos-nav-dock-gesture-root" ref={rootRef}>
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
