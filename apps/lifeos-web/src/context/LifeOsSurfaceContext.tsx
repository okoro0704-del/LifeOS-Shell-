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

/**
 * TV/Radio overlay machine — mutually exclusive reveals.
 * HIDDEN: broadcast only + edge reveal handle.
 * REMOTE_REVEALED: TV/Radio icons + station remote.
 * PROGRAM_INFO_REVEALED: creator + NOW/NEXT.
 */
export type BroadcastUiMode = "HIDDEN" | "REMOTE_REVEALED" | "PROGRAM_INFO_REVEALED";

type SurfaceCtx = {
  surface: LifeOsSurface;
  setSurface: (next: LifeOsSurface) => void;
  tierOf: (s: LifeOsSurface) => SurfaceTier;
  /** Enter Offline without interrupting an active TV/Radio station. */
  enterOffline: () => void;
  enterBroadcast: () => void;
  exitBroadcast: () => void;
  broadcastMode: boolean;
  broadcastUiMode: BroadcastUiMode;
  openRemoteReveal: () => void;
  openProgramInfo: () => void;
  closeBroadcastUi: () => void;
  toggleRemoteReveal: () => void;
  /** Living LifeOS surface switcher (not used on bare TV/Radio). */
  switcherVisible: boolean;
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  /** @deprecated prefer broadcastUiMode — true when REMOTE_REVEALED */
  controlVisible: boolean;
  openControl: () => void;
  closeControl: () => void;
  toggleControl: () => void;
  /** @deprecated prefer broadcastUiMode — true when PROGRAM_INFO_REVEALED */
  nowNextVisible: boolean;
  openNowNext: () => void;
  closeNowNext: () => void;
  mediaPaused: boolean;
  toggleMediaPaused: () => void;
  setMediaPaused: (paused: boolean) => void;
  /** Zero-based catalog index for the active TV station program. */
  tvChannel: number;
  /** Zero-based catalog index for the active Radio station program. */
  radioChannel: number;
  channelUp: () => void;
  channelDown: () => void;
  setTvChannel: (n: number) => void;
  setRadioChannel: (n: number) => void;
};

const Ctx = createContext<SurfaceCtx | null>(null);

export function LifeOsSurfaceProvider({ children }: { children: ReactNode }) {
  const [surface, setSurfaceState] = useState<LifeOsSurface>("LIVING_LIFEOS");
  const [prev, setPrev] = useState<LifeOsSurface | null>(null);
  const [lastStation, setLastStation] = useState<"TV" | "RADIO" | null>(null);
  const [broadcastUiMode, setBroadcastUiMode] = useState<BroadcastUiMode>("HIDDEN");
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [mediaPaused, setMediaPaused] = useState(false);
  const [tvChannel, setTvChannelState] = useState(0);
  const [radioChannel, setRadioChannelState] = useState(0);

  const controlVisible = broadcastUiMode === "REMOTE_REVEALED";
  const nowNextVisible = broadcastUiMode === "PROGRAM_INFO_REVEALED";

  const setSurface = useCallback((next: LifeOsSurface) => {
    setSurfaceState((cur) => {
      if (cur === next) return cur;
      setPrev(cur);
      return next;
    });
    if (next === "TV" || next === "RADIO") setLastStation(next);
    setSwitcherVisible(false);
    setBroadcastUiMode("HIDDEN");
  }, []);

  const enterOffline = useCallback(() => {
    setSurfaceState((cur) => {
      if (cur === "TV" || cur === "RADIO") return cur;
      setPrev(cur);
      return lastStation ?? "OFFLINE_HUB";
    });
    setSwitcherVisible(false);
    setBroadcastUiMode("HIDDEN");
  }, [lastStation]);
  const enterBroadcast = enterOffline;

  const exitBroadcast = useCallback(() => {
    setBroadcastUiMode("HIDDEN");
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

  const openRemoteReveal = useCallback(() => {
    setSwitcherVisible(false);
    setBroadcastUiMode("REMOTE_REVEALED");
  }, []);
  const openProgramInfo = useCallback(() => {
    setSwitcherVisible(false);
    setBroadcastUiMode("PROGRAM_INFO_REVEALED");
  }, []);
  const closeBroadcastUi = useCallback(() => setBroadcastUiMode("HIDDEN"), []);
  const toggleRemoteReveal = useCallback(() => {
    setSwitcherVisible(false);
    setBroadcastUiMode((m) => (m === "REMOTE_REVEALED" ? "HIDDEN" : "REMOTE_REVEALED"));
  }, []);

  const openSwitcher = useCallback(() => {
    setBroadcastUiMode("HIDDEN");
    setSwitcherVisible(true);
  }, []);
  const closeSwitcher = useCallback(() => setSwitcherVisible(false), []);
  const toggleSwitcher = useCallback(() => {
    setSwitcherVisible((v) => {
      if (!v) setBroadcastUiMode("HIDDEN");
      return !v;
    });
  }, []);

  const openControl = openRemoteReveal;
  const closeControl = closeBroadcastUi;
  const toggleControl = toggleRemoteReveal;
  const openNowNext = openProgramInfo;
  const closeNowNext = closeBroadcastUi;

  const toggleMediaPaused = useCallback(() => setMediaPaused((paused) => !paused), []);

  const channelUp = useCallback(() => {
    /* Catalog index bumps are handled by BroadcastRemoteControl via creator zap. */
    setTvChannelState((n) => n + 1);
  }, []);
  const channelDown = useCallback(() => {
    setTvChannelState((n) => n - 1);
  }, []);
  const setTvChannel = useCallback((n: number) => {
    setTvChannelState(Math.floor(n));
  }, []);
  const setRadioChannel = useCallback((n: number) => {
    setRadioChannelState(Math.floor(n));
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
      broadcastUiMode,
      openRemoteReveal,
      openProgramInfo,
      closeBroadcastUi,
      toggleRemoteReveal,
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
      radioChannel,
      channelUp,
      channelDown,
      setTvChannel,
      setRadioChannel,
    }),
    [
      surface,
      setSurface,
      tierOf,
      enterOffline,
      broadcastMode,
      enterBroadcast,
      exitBroadcast,
      broadcastUiMode,
      openRemoteReveal,
      openProgramInfo,
      closeBroadcastUi,
      toggleRemoteReveal,
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
      radioChannel,
      channelUp,
      channelDown,
      setTvChannel,
      setRadioChannel,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const FALLBACK: SurfaceCtx = {
  surface: "LIVING_LIFEOS",
  setSurface: () => undefined,
  tierOf: () => "ACTIVE",
  enterOffline: () => undefined,
  broadcastMode: false,
  enterBroadcast: () => undefined,
  exitBroadcast: () => undefined,
  broadcastUiMode: "HIDDEN",
  openRemoteReveal: () => undefined,
  openProgramInfo: () => undefined,
  closeBroadcastUi: () => undefined,
  toggleRemoteReveal: () => undefined,
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
  radioChannel: 0,
  channelUp: () => undefined,
  channelDown: () => undefined,
  setTvChannel: () => undefined,
  setRadioChannel: () => undefined,
};

export function useLifeOsSurface() {
  return useContext(Ctx) ?? FALLBACK;
}
