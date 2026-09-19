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
import { useWorkspace } from "./WorkspaceContext";

export type NavSide = "left" | "right";

type NavDockCtx = {
  expanded: boolean;
  /** PERSONAL → left, BUSINESS → right (from activeSpace/mode, not pathname). */
  side: NavSide;
  open: () => void;
  close: () => void;
  toggle: () => void;
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
  const { mode } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const side: NavSide = mode === "BUSINESS" ? "left" : "right";

  useEffect(() => {
    setExpanded(false);
  }, [location.pathname, mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("lifeos-nav-dock-open", expanded);
    document.documentElement.dataset.navSide = side;
    if (expanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
        document.documentElement.classList.remove("lifeos-nav-dock-open");
      };
    }
    return () => document.documentElement.classList.remove("lifeos-nav-dock-open");
  }, [expanded, side]);

  const open = useCallback(() => {
    setExpanded(true);
    markNavDockHintSeen();
  }, []);

  const close = useCallback(() => setExpanded(false), []);

  const toggle = useCallback(() => {
    setExpanded((v) => {
      if (!v) markNavDockHintSeen();
      return !v;
    });
  }, []);

  const value = useMemo(
    () => ({ expanded, side, open, close, toggle }),
    [expanded, side, open, close, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigationDock() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      expanded: false,
      side: "left" as NavSide,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
    };
  }
  return ctx;
}
