import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** User-facing LifeOS surfaces — only one ACTIVE at a time. */
export type LifeOsSurface = "LIVING_LIFEOS" | "TV" | "RADIO";

export type SurfaceTier = "ACTIVE" | "WARM" | "SUSPENDED";

type SurfaceCtx = {
  surface: LifeOsSurface;
  setSurface: (next: LifeOsSurface) => void;
  /** Tier for a given surface relative to the active one. */
  tierOf: (s: LifeOsSurface) => SurfaceTier;
  switcherVisible: boolean;
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
};

const Ctx = createContext<SurfaceCtx | null>(null);

export function LifeOsSurfaceProvider({ children }: { children: ReactNode }) {
  const [surface, setSurfaceState] = useState<LifeOsSurface>("LIVING_LIFEOS");
  const [prev, setPrev] = useState<LifeOsSurface | null>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);

  const setSurface = useCallback((next: LifeOsSurface) => {
    setSurfaceState((cur) => {
      if (cur === next) return cur;
      setPrev(cur);
      return next;
    });
    setSwitcherVisible(false);
  }, []);

  const tierOf = useCallback(
    (s: LifeOsSurface): SurfaceTier => {
      if (s === surface) return "ACTIVE";
      if (s === prev) return "WARM";
      return "SUSPENDED";
    },
    [surface, prev],
  );

  const openSwitcher = useCallback(() => setSwitcherVisible(true), []);
  const closeSwitcher = useCallback(() => setSwitcherVisible(false), []);
  const toggleSwitcher = useCallback(() => setSwitcherVisible((v) => !v), []);

  const value = useMemo(
    () => ({
      surface,
      setSurface,
      tierOf,
      switcherVisible,
      openSwitcher,
      closeSwitcher,
      toggleSwitcher,
    }),
    [surface, setSurface, tierOf, switcherVisible, openSwitcher, closeSwitcher, toggleSwitcher],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLifeOsSurface() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      surface: "LIVING_LIFEOS" as LifeOsSurface,
      setSurface: () => undefined,
      tierOf: () => "ACTIVE" as SurfaceTier,
      switcherVisible: false,
      openSwitcher: () => undefined,
      closeSwitcher: () => undefined,
      toggleSwitcher: () => undefined,
    };
  }
  return ctx;
}
