import { useEffect } from "react";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { broadcastSchedule } from "../lib/broadcastSchedule";

const NOW_NEXT_IDLE_MS = 4000;

export function BroadcastNowNext() {
  const { surface, tvChannel, nowNextVisible, closeNowNext } = useLifeOsSurface();
  const onAir = surface === "TV" || surface === "RADIO";
  const schedule = onAir ? broadcastSchedule(surface, tvChannel) : null;

  useEffect(() => {
    if (!nowNextVisible || !onAir) return;
    const timeout = window.setTimeout(closeNowNext, NOW_NEXT_IDLE_MS);
    return () => window.clearTimeout(timeout);
  }, [nowNextVisible, onAir, surface, tvChannel, closeNowNext]);

  if (!onAir || !nowNextVisible || !schedule) return null;

  return (
    <aside className="broadcast-now-next" aria-label="Broadcast schedule" aria-live="polite">
      <div>
        <span>NOW</span>
        <strong>{schedule.now.title}</strong>
        {schedule.now.creator ? <small>{schedule.now.creator}</small> : null}
      </div>
      <div>
        <span>NEXT</span>
        <strong>{schedule.next.title}</strong>
        {schedule.next.creator ? <small>{schedule.next.creator}</small> : null}
      </div>
    </aside>
  );
}

export const BROADCAST_NOW_NEXT_IDLE_MS = NOW_NEXT_IDLE_MS;
