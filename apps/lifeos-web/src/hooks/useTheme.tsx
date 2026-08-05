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
import type { LifeOsPreferences } from "@lifeos/shared";

export type ThemePreference = LifeOsPreferences["theme"];

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "lifeos.theme";

function applyTheme(theme: ThemePreference) {
  document.documentElement.setAttribute("data-theme", theme);
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  const color = resolved === "dark" ? "#0f1419" : "#0d7a6f";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

export function ThemeProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: ThemePreference | null;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (initial) return initial;
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const syncedInitial = useRef<ThemePreference | null | undefined>(undefined);

  useEffect(() => {
    if (!initial) return;
    if (syncedInitial.current === initial) return;
    syncedInitial.current = initial;
    setThemeState(initial);
  }, [initial]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
