import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

export type NavDockVisual = "clean" | "compact" | "expanded";

type NavDockCtx = {
  visual: NavDockVisual;
  expanded: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Prefer compact rail after first open / while browsing immersive. */
  preferCompact: boolean;
  setPreferCompact: (v: boolean) => void;
};

const Ctx = createContext<NavDockCtx | null>(null);

const HINT_KEY = "lifeos.navDock.hintSeen";

export function hasSeenNavDockHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

export function markNavDockHintSeen(): void {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function NavigationDockProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [preferCompact, setPreferCompact] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("lifeos-nav-dock-open", expanded);
    if (expanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
        document.documentElement.classList.remove("lifeos-nav-dock-open");
      };
    }
    return () => document.documentElement.classList.remove("lifeos-nav-dock-open");
  }, [expanded]);

  const open = useCallback(() => {
    setPreferCompact(true);
    setExpanded(true);
    markNavDockHintSeen();
  }, []);

  const close = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => {
    setExpanded((v) => {
      if (!v) {
        setPreferCompact(true);
        markNavDockHintSeen();
      }
      return !v;
    });
  }, []);

  const visual: NavDockVisual = expanded ? "expanded" : preferCompact ? "compact" : "clean";

  const value = useMemo(
    () => ({ visual, expanded, open, close, toggle, preferCompact, setPreferCompact }),
    [visual, expanded, open, close, toggle, preferCompact],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigationDock() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      visual: "clean" as NavDockVisual,
      expanded: false,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
      preferCompact: false,
      setPreferCompact: () => undefined,
    };
  }
  return ctx;
}
