import { useEffect } from "react";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { broadcastSchedule } from "../lib/broadcastSchedule";
import { BROADCAST_REMOTE_IDLE_MS } from "./SurfaceSwitcherBar";

export function BroadcastNowNext() {
  const {
    surface,
    tvChannel,
    radioChannel,
    broadcastUiMode,
    closeBroadcastUi,
  } = useLifeOsSurface();
  const onAir = surface === "TV" || surface === "RADIO";
  const visible = onAir && broadcastUiMode === "PROGRAM_INFO_REVEALED";
  const channel = surface === "RADIO" ? radioChannel : tvChannel;
  const schedule = onAir ? broadcastSchedule(surface, channel) : null;

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(closeBroadcastUi, BROADCAST_REMOTE_IDLE_MS);
    return () => window.clearTimeout(timeout);
  }, [visible, surface, channel, closeBroadcastUi]);

  if (!visible || !schedule) return null;

  const nowLabel = schedule.now.live
    ? `LIVE — ${schedule.now.title}`
    : schedule.now.title;

  return (
    <div
      className="broadcast-program-info"
      aria-label="Broadcast schedule"
      aria-live="polite"
      data-broadcast-ui={broadcastUiMode}
      data-no-nav-dock
    >
      <header className="broadcast-program-info__station">
        <strong>{schedule.stationName}</strong>
      </header>
      <aside className="broadcast-program-info__schedule">
        <div>
          <span>NOW</span>
          <strong className={schedule.now.live ? "is-live" : undefined}>{nowLabel}</strong>
        </div>
        <div>
          <span>NEXT</span>
          <strong>{schedule.next.title}</strong>
        </div>
      </aside>
    </div>
  );
}

export const BROADCAST_NOW_NEXT_IDLE_MS = BROADCAST_REMOTE_IDLE_MS;
