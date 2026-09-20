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
import { useWorkspace } from "./WorkspaceContext";

export type NavSide = "left" | "right";

/** First-visit shell peek (aligned with idle dismiss). */
export const SHELL_INTRO_MS = 3000;
/** Summoned shell with no meaningful action → auto-hide. */
export const SHELL_IDLE_MS = 3000;
/** After successful section/command selection → confirmation hold then hide. */
export const SHELL_CONFIRM_MS = 1000;

const INTRO_KEY = "lifeos.shell.introSeen";
const HINT_KEY = "lifeos.navDock.hintSeen";

export type ShellDismissReason = "idle" | "confirm" | "manual" | "intro" | null;

type NavDockCtx = {
  /** ONE source of truth: top section + side rail + bottom kernel/biz dock. */
  shellControlsVisible: boolean;
  /** @deprecated alias of shellControlsVisible */
  expanded: boolean;
  shellDismissReason: ShellDismissReason;
  handleSide: NavSide;
  railSide: NavSide;
  /** @deprecated use handleSide */
  side: NavSide;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Reset 3s idle while shell is visible (ignored during confirm hold). */
  noteShellActivity: () => void;
  /**
   * Successful section/command selection: navigate already happened —
   * keep shell visible ~1s then dismiss. Cancels idle / prior confirm.
   */
  confirmSelection: () => void;
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
  const { mode } = useWorkspace();
  const introDone = useRef(hasSeenShellIntro());
  const [shellControlsVisible, setVisible] = useState(() => !introDone.current);
  const [shellDismissReason, setDismissReason] = useState<ShellDismissReason>(null);
  const handleSide: NavSide = mode === "BUSINESS" ? "left" : "right";
  const railSide: NavSide = handleSide === "right" ? "left" : "right";

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<"hidden" | "idle" | "confirm">("hidden");
  const genRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideShell = useCallback(
    (reason: ShellDismissReason) => {
      clearTimer();
      phaseRef.current = "hidden";
      setDismissReason(reason);
      setVisible(false);
    },
    [clearTimer],
  );

  const scheduleIdle = useCallback(() => {
    clearTimer();
    phaseRef.current = "idle";
    setDismissReason(null);
    const gen = ++genRef.current;
    timerRef.current = setTimeout(() => {
      if (gen !== genRef.current) return;
      if (phaseRef.current !== "idle") return;
      hideShell("idle");
    }, SHELL_IDLE_MS);
  }, [clearTimer, hideShell]);

  const showShell = useCallback(
    (opts?: { idle?: boolean }) => {
      clearTimer();
      setVisible(true);
      setDismissReason(null);
      markNavDockHintSeen();
      if (opts?.idle === false) {
        phaseRef.current = "idle";
        return;
      }
      scheduleIdle();
    },
    [clearTimer, scheduleIdle],
  );

  // First visit: briefly show unified shell, then immersive auto-hide once per session.
  useEffect(() => {
    if (introDone.current) return;
    setVisible(true);
    phaseRef.current = "idle";
    const gen = ++genRef.current;
    timerRef.current = setTimeout(() => {
      if (gen !== genRef.current) return;
      markShellIntroSeen();
      introDone.current = true;
      hideShell("intro");
    }, SHELL_INTRO_MS);
    return () => clearTimer();
  }, [clearTimer, hideShell]);

  // Space switch: do not steal an in-flight confirmation hold.
  const modeRef = useRef(mode);
  useEffect(() => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;
    if (!introDone.current) return;
    if (phaseRef.current === "confirm") return;
    clearTimer();
    if (shellControlsVisible) {
      scheduleIdle();
    } else {
      phaseRef.current = "hidden";
    }
  }, [mode, shellControlsVisible, clearTimer, scheduleIdle]);

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

  useEffect(() => () => clearTimer(), [clearTimer]);

  const open = useCallback(() => {
    showShell();
  }, [showShell]);

  const close = useCallback(() => {
    hideShell("manual");
  }, [hideShell]);

  const toggle = useCallback(() => {
    if (shellControlsVisible) {
      hideShell("manual");
    } else {
      showShell();
    }
  }, [shellControlsVisible, hideShell, showShell]);

  const noteShellActivity = useCallback(() => {
    if (!shellControlsVisible) return;
    // Confirm hold takes precedence — do not let idle steal the confirmation window.
    if (phaseRef.current === "confirm") return;
    scheduleIdle();
  }, [shellControlsVisible, scheduleIdle]);

  const confirmSelection = useCallback(() => {
    clearTimer();
    setVisible(true);
    phaseRef.current = "confirm";
    setDismissReason("confirm");
    const gen = ++genRef.current;
    timerRef.current = setTimeout(() => {
      if (gen !== genRef.current) return;
      if (phaseRef.current !== "confirm") return;
      hideShell("confirm");
    }, SHELL_CONFIRM_MS);
  }, [clearTimer, hideShell]);

  const value = useMemo(
    () => ({
      shellControlsVisible,
      expanded: shellControlsVisible,
      shellDismissReason,
      handleSide,
      railSide,
      side: handleSide,
      open,
      close,
      toggle,
      noteShellActivity,
      confirmSelection,
    }),
    [
      shellControlsVisible,
      shellDismissReason,
      handleSide,
      railSide,
      open,
      close,
      toggle,
      noteShellActivity,
      confirmSelection,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNavigationDock() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      shellControlsVisible: false,
      expanded: false,
      shellDismissReason: null as ShellDismissReason,
      handleSide: "right" as NavSide,
      railSide: "left" as NavSide,
      side: "right" as NavSide,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
      noteShellActivity: () => undefined,
      confirmSelection: () => undefined,
    };
  }
  return ctx;
}
