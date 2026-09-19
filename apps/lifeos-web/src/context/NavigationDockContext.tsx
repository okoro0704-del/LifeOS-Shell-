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
  /** Unified shell reveal — side nav + kernel switcher together. */
  shellControlsVisible: boolean;
  /** @deprecated alias of shellControlsVisible */
  expanded: boolean;
  /** PERSONAL → right, BUSINESS → left (from activeSpace/mode). */
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
  const [shellControlsVisible, setVisible] = useState(false);
  const side: NavSide = mode === "BUSINESS" ? "left" : "right";

  useEffect(() => {
    setVisible(false);
  }, [location.pathname, mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("lifeos-nav-dock-open", shellControlsVisible);
    document.documentElement.dataset.navSide = side;
    if (shellControlsVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
        document.documentElement.classList.remove("lifeos-nav-dock-open");
      };
    }
    return () => document.documentElement.classList.remove("lifeos-nav-dock-open");
  }, [shellControlsVisible, side]);

  const open = useCallback(() => {
    setVisible(true);
    markNavDockHintSeen();
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const toggle = useCallback(() => {
    setVisible((v) => {
      if (!v) markNavDockHintSeen();
      return !v;
    });
  }, []);

  const value = useMemo(
    () => ({
      shellControlsVisible,
      expanded: shellControlsVisible,
      side,
      open,
      close,
      toggle,
    }),
    [shellControlsVisible, side, open, close, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigationDock() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      shellControlsVisible: false,
      expanded: false,
      side: "right" as NavSide,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
    };
  }
  return ctx;
}
