import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigationDock } from "../context/NavigationDockContext";
import { attachNavDockDoubleTap } from "../lib/navDockGesture";

/**
 * Shell-level double-tap → summon LifeOS command navigation.
 * Skips interactive controls and immersive media (double-tap-to-like).
 */
export function NavigationDockGestures({ children }: { children: ReactNode }) {
  const { open, expanded } = useNavigationDock();
  const rootRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return attachNavDockDoubleTap(root, (x, y) => {
      if (expanded) return;
      setRipple({ x, y, id: Date.now() });
      open();
      window.setTimeout(() => setRipple(null), 420);
    });
  }, [open, expanded]);

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
