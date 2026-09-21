import { useNavigate } from "react-router-dom";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { kernelMediaFor } from "../lib/offlineKernelRuntime";
import { personalKernelPath } from "./shell/nav";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useAuth } from "../hooks/useAuth";

function channelIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/**
 * Remote Control — summoned under TV/Radio in Offline broadcast.
 * Channel up/down zaps TV stations (shared offline kernel catalog).
 */
export function BroadcastRemoteControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    surface,
    broadcastMode,
    controlVisible,
    closeControl,
    exitBroadcast,
    tvChannel,
    channelUp,
    channelDown,
  } = useLifeOsSurface();

  if (!broadcastMode || !controlVisible) return null;

  const channels = kernelMediaFor(surface === "RADIO" ? ["music", "podcast"] : ["video", "reel"]);
  const count = Math.max(1, channels.length);
  const idx = channelIndex(tvChannel, count);
  const ch = idx + 1;
  const station = channels[idx];

  function leaveOffline() {
    closeControl();
    exitBroadcast();
    setLastSelectedKernel("main", user?.trustId);
    navigate(personalKernelPath("main"));
  }

  return (
    <div
      className="lifeos-remote is-open"
      role="dialog"
      aria-modal="true"
      aria-label="Control remote"
      data-no-nav-dock
    >
      <button
        type="button"
        className="lifeos-remote__backdrop"
        aria-label="Close Control"
        data-no-nav-dock
        onClick={() => closeControl()}
      />
      <div className="lifeos-remote__panel" data-no-nav-dock>
        <header className="lifeos-remote__head">
          <strong>Control</strong>
          <span className="lifeos-remote__ch muted small">
            CH {ch}
            {station ? ` · ${station.title}` : ""}
          </span>
        </header>
        <div className="lifeos-remote__pad" role="group" aria-label="Channel">
          <button
            type="button"
            className="lifeos-remote__key lifeos-remote__key--ch"
            aria-label="Channel up"
            data-no-nav-dock
            onClick={() => channelUp()}
          >
            CH +
          </button>
          <button
            type="button"
            className="lifeos-remote__key lifeos-remote__key--ch"
            aria-label="Channel down"
            data-no-nav-dock
            onClick={() => channelDown()}
          >
            CH −
          </button>
        </div>
        <button
          type="button"
          className="lifeos-remote__leave"
          data-no-nav-dock
          onClick={() => leaveOffline()}
        >
          Leave Offline
        </button>
        <button
          type="button"
          className="lifeos-remote__done"
          data-no-nav-dock
          onClick={() => closeControl()}
        >
          Done
        </button>
      </div>
    </div>
  );
}
