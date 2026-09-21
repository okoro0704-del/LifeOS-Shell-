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
  tierOf: (s: LifeOsSurface) => SurfaceTier;
  /** Offline Kernel broadcast session — TV/Radio only switcher + Control. */
  broadcastMode: boolean;
  enterBroadcast: () => void;
  exitBroadcast: () => void;
  switcherVisible: boolean;
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  controlVisible: boolean;
  openControl: () => void;
  closeControl: () => void;
  toggleControl: () => void;
  /** Zero-based TV channel index (station zap). */
  tvChannel: number;
  channelUp: () => void;
  channelDown: () => void;
  setTvChannel: (n: number) => void;
};

const Ctx = createContext<SurfaceCtx | null>(null);

export function LifeOsSurfaceProvider({ children }: { children: ReactNode }) {
  const [surface, setSurfaceState] = useState<LifeOsSurface>("LIVING_LIFEOS");
  const [prev, setPrev] = useState<LifeOsSurface | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [controlVisible, setControlVisible] = useState(false);
  const [tvChannel, setTvChannelState] = useState(0);

  const setSurface = useCallback((next: LifeOsSurface) => {
    setSurfaceState((cur) => {
      if (cur === next) return cur;
      setPrev(cur);
      return next;
    });
    setSwitcherVisible(false);
    if (next === "LIVING_LIFEOS") {
      setControlVisible(false);
    }
  }, []);

  const enterBroadcast = useCallback(() => {
    setBroadcastMode(true);
    setSurfaceState((cur) => {
      if (cur === "TV" || cur === "RADIO") return cur;
      setPrev(cur);
      return "TV";
    });
    setSwitcherVisible(false);
    setControlVisible(false);
  }, []);

  const exitBroadcast = useCallback(() => {
    setBroadcastMode(false);
    setControlVisible(false);
    setSurfaceState("LIVING_LIFEOS");
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

  const openSwitcher = useCallback(() => {
    setControlVisible(false);
    setSwitcherVisible(true);
  }, []);
  const closeSwitcher = useCallback(() => setSwitcherVisible(false), []);
  const toggleSwitcher = useCallback(() => {
    setSwitcherVisible((v) => {
      if (!v) setControlVisible(false);
      return !v;
    });
  }, []);

  const openControl = useCallback(() => {
    setSwitcherVisible(false);
    setControlVisible(true);
  }, []);
  const closeControl = useCallback(() => setControlVisible(false), []);
  const toggleControl = useCallback(() => {
    setControlVisible((v) => {
      if (!v) setSwitcherVisible(false);
      return !v;
    });
  }, []);

  const channelUp = useCallback(() => {
    setTvChannelState((n) => n + 1);
  }, []);
  const channelDown = useCallback(() => {
    setTvChannelState((n) => n - 1);
  }, []);
  const setTvChannel = useCallback((n: number) => {
    setTvChannelState(Math.floor(n));
  }, []);

  const value = useMemo(
    () => ({
      surface,
      setSurface,
      tierOf,
      broadcastMode,
      enterBroadcast,
      exitBroadcast,
      switcherVisible,
      openSwitcher,
      closeSwitcher,
      toggleSwitcher,
      controlVisible,
      openControl,
      closeControl,
      toggleControl,
      tvChannel,
      channelUp,
      channelDown,
      setTvChannel,
    }),
    [
      surface,
      setSurface,
      tierOf,
      broadcastMode,
      enterBroadcast,
      exitBroadcast,
      switcherVisible,
      openSwitcher,
      closeSwitcher,
      toggleSwitcher,
      controlVisible,
      openControl,
      closeControl,
      toggleControl,
      tvChannel,
      channelUp,
      channelDown,
      setTvChannel,
    ],
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
      broadcastMode: false,
      enterBroadcast: () => undefined,
      exitBroadcast: () => undefined,
      switcherVisible: false,
      openSwitcher: () => undefined,
      closeSwitcher: () => undefined,
      toggleSwitcher: () => undefined,
      controlVisible: false,
      openControl: () => undefined,
      closeControl: () => undefined,
      toggleControl: () => undefined,
      tvChannel: 0,
      channelUp: () => undefined,
      channelDown: () => undefined,
      setTvChannel: () => undefined,
    };
  }
  return ctx;
}
