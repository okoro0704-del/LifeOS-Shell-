import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useWorkspace } from "./WorkspaceContext";

export type NavSide = "left" | "right";

/** First-visit shell peek duration before immersive auto-hide. */
export const SHELL_INTRO_MS = 2800;
const INTRO_KEY = "lifeos.shell.introSeen";
const HINT_KEY = "lifeos.navDock.hintSeen";

type NavDockCtx = {
  /** ONE source of truth: top section + side rail + bottom kernel bar. */
  shellControlsVisible: boolean;
  /** @deprecated alias of shellControlsVisible */
  expanded: boolean;
  handleSide: NavSide;
  railSide: NavSide;
  /** @deprecated use handleSide */
  side: NavSide;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const Ctx = createContext<NavDockCtx | null>(null);

export function hasSeenShellIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function markShellIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* ignore */
  }
}

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
  const introDone = useRef(hasSeenShellIntro());
  const [shellControlsVisible, setVisible] = useState(() => !introDone.current);
  const handleSide: NavSide = mode === "BUSINESS" ? "left" : "right";
  const railSide: NavSide = handleSide === "right" ? "left" : "right";

  // First visit: briefly show unified shell, then immersive auto-hide once per session.
  useEffect(() => {
    if (introDone.current) return;
    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      markShellIntroSeen();
      introDone.current = true;
    }, SHELL_INTRO_MS);
    return () => window.clearTimeout(t);
  }, []);

  // After intro, route/space changes close the shell together (all three bars).
  useEffect(() => {
    if (!introDone.current) return;
    setVisible(false);
  }, [location.pathname, mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("lifeos-nav-dock-open", shellControlsVisible);
    document.documentElement.dataset.navSide = handleSide;
    document.documentElement.dataset.railSide = railSide;
    document.documentElement.dataset.shellControls = shellControlsVisible ? "1" : "0";
    if (shellControlsVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
        document.documentElement.classList.remove("lifeos-nav-dock-open");
      };
    }
    return () => document.documentElement.classList.remove("lifeos-nav-dock-open");
  }, [shellControlsVisible, handleSide, railSide]);

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
      handleSide,
      railSide,
      side: handleSide,
      open,
      close,
      toggle,
    }),
    [shellControlsVisible, handleSide, railSide, open, close, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigationDock() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      shellControlsVisible: false,
      expanded: false,
      handleSide: "right" as NavSide,
      railSide: "left" as NavSide,
      side: "right" as NavSide,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
    };
  }
  return ctx;
}
