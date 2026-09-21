import { useEffect, useRef } from "react";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { broadcastKinds } from "../lib/broadcastSchedule";
import { kernelAdjacentCreatorIndex } from "../lib/offlineKernelRuntime";
import { BROADCAST_REMOTE_IDLE_MS } from "./SurfaceSwitcherBar";

/**
 * Minimal creator-station zapper. Overlays content — never changes layout.
 * Visible only in REMOTE_REVEALED; auto-hides after idle.
 */
export function BroadcastRemoteControl() {
  const {
    surface,
    broadcastUiMode,
    closeBroadcastUi,
    tvChannel,
    radioChannel,
    setTvChannel,
    setRadioChannel,
  } = useLifeOsSurface();
  const onAir = surface === "TV" || surface === "RADIO";
  const visible = onAir && broadcastUiMode === "REMOTE_REVEALED";
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = surface === "RADIO" ? radioChannel : tvChannel;

  function armIdle() {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => closeBroadcastUi(), BROADCAST_REMOTE_IDLE_MS);
  }

  useEffect(() => {
    if (!visible) {
      if (idleRef.current) clearTimeout(idleRef.current);
      return;
    }
    armIdle();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, closeBroadcastUi, surface, channel]);

  function zap(direction: "next" | "prev") {
    if (!onAir) return;
    const kinds = broadcastKinds(surface);
    const from = surface === "RADIO" ? radioChannel : tvChannel;
    const next = kernelAdjacentCreatorIndex(kinds, from, direction);
    if (surface === "RADIO") setRadioChannel(next);
    else setTvChannel(next);
    armIdle();
  }

  if (!visible) return null;

  return (
    <nav
      className="lifeos-ghost-controls lifeos-ghost-controls--stations"
      aria-label="Station remote"
      data-no-nav-dock
      data-broadcast-ui={broadcastUiMode}
      onPointerDown={armIdle}
    >
      <button
        type="button"
        aria-label="Previous station"
        title="Previous station"
        data-no-nav-dock
        onClick={() => zap("prev")}
      >
        <span aria-hidden>‹</span>
      </button>
      <span className="lifeos-ghost-controls__dot" aria-hidden>
        ●
      </span>
      <button
        type="button"
        aria-label="Next station"
        title="Next station"
        data-no-nav-dock
        onClick={() => zap("next")}
      >
        <span aria-hidden>›</span>
      </button>
      <span className="lifeos-ghost-controls__caption" aria-hidden>
        Control
      </span>
    </nav>
  );
}
