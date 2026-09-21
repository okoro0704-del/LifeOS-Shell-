import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** User-facing LifeOS surfaces — only one ACTIVE at a time. */
export type LifeOsSurface = "LIVING_LIFEOS" | "OFFLINE_HUB" | "TV" | "RADIO";

export type SurfaceTier = "ACTIVE" | "WARM" | "SUSPENDED";

type SurfaceCtx = {
  surface: LifeOsSurface;
  setSurface: (next: LifeOsSurface) => void;
  tierOf: (s: LifeOsSurface) => SurfaceTier;
  /** Enter Offline without interrupting an active TV/Radio station. */
  enterOffline: () => void;
  enterBroadcast: () => void;
  exitBroadcast: () => void;
  broadcastMode: boolean;
  switcherVisible: boolean;
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  controlVisible: boolean;
  openControl: () => void;
  closeControl: () => void;
  toggleControl: () => void;
  nowNextVisible: boolean;
  openNowNext: () => void;
  closeNowNext: () => void;
  mediaPaused: boolean;
  toggleMediaPaused: () => void;
  setMediaPaused: (paused: boolean) => void;
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
  const [lastStation, setLastStation] = useState<"TV" | "RADIO" | null>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [controlVisible, setControlVisible] = useState(false);
  const [nowNextVisible, setNowNextVisible] = useState(false);
  const [mediaPaused, setMediaPaused] = useState(false);
  const [tvChannel, setTvChannelState] = useState(0);

  const setSurface = useCallback((next: LifeOsSurface) => {
    setSurfaceState((cur) => {
      if (cur === next) return cur;
      setPrev(cur);
      return next;
    });
    if (next === "TV" || next === "RADIO") setLastStation(next);
    setSwitcherVisible(false);
    setNowNextVisible(false);
    if (next !== "TV" && next !== "RADIO") {
      setControlVisible(false);
    }
  }, []);

  const enterOffline = useCallback(() => {
    setSurfaceState((cur) => {
      if (cur === "TV" || cur === "RADIO") return cur;
      setPrev(cur);
      return lastStation ?? "OFFLINE_HUB";
    });
    setSwitcherVisible(false);
    setControlVisible(false);
    setNowNextVisible(false);
  }, [lastStation]);
  const enterBroadcast = enterOffline;

  const exitBroadcast = useCallback(() => {
    setControlVisible(false);
    setNowNextVisible(false);
    setSurfaceState("LIVING_LIFEOS");
    setSwitcherVisible(false);
  }, []);
  const broadcastMode = surface !== "LIVING_LIFEOS";

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
    setNowNextVisible(false);
    setControlVisible(true);
  }, []);
  const closeControl = useCallback(() => setControlVisible(false), []);
  const toggleControl = useCallback(() => {
    setControlVisible((v) => {
      if (!v) setSwitcherVisible(false);
      return !v;
    });
  }, []);
  const openNowNext = useCallback(() => {
    setSwitcherVisible(false);
    setControlVisible(false);
    setNowNextVisible(true);
  }, []);
  const closeNowNext = useCallback(() => setNowNextVisible(false), []);
  const toggleMediaPaused = useCallback(() => setMediaPaused((paused) => !paused), []);

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
      enterOffline,
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
      nowNextVisible,
      openNowNext,
      closeNowNext,
      mediaPaused,
      toggleMediaPaused,
      setMediaPaused,
      tvChannel,
      channelUp,
      channelDown,
      setTvChannel,
    }),
    [
      surface,
      setSurface,
      tierOf,
      enterOffline,
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
      nowNextVisible,
      openNowNext,
      closeNowNext,
      mediaPaused,
      toggleMediaPaused,
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
      enterOffline: () => undefined,
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
      nowNextVisible: false,
      openNowNext: () => undefined,
      closeNowNext: () => undefined,
      mediaPaused: false,
      toggleMediaPaused: () => undefined,
      setMediaPaused: () => undefined,
      tvChannel: 0,
      channelUp: () => undefined,
      channelDown: () => undefined,
      setTvChannel: () => undefined,
    };
  }
  return ctx;
}
