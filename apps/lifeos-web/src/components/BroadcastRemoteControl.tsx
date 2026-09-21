import { useEffect, useRef } from "react";
import { IconBroadcast, IconHome } from "@lifeos/ui";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

const IDLE_MS = 4000;

/**
 * Ephemeral glyph-only remote. Overlays content — never changes layout.
 * Hidden until single-tap; auto-hides after idle.
 */
export function BroadcastRemoteControl() {
  const {
    surface,
    controlVisible,
    closeControl,
    setSurface,
    channelUp,
    channelDown,
    mediaPaused,
    toggleMediaPaused,
    setMediaPaused,
  } = useLifeOsSurface();
  const onAir = surface === "TV" || surface === "RADIO";
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function armIdle() {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => closeControl(), IDLE_MS);
  }

  useEffect(() => {
    if (!controlVisible || !onAir) {
      if (idleRef.current) clearTimeout(idleRef.current);
      return;
    }
    armIdle();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlVisible, onAir, closeControl]);

  if (!onAir || !controlVisible) return null;

  return (
    <nav
      className="lifeos-ghost-controls"
      aria-label="Broadcast remote"
      data-no-nav-dock
      onPointerDown={armIdle}
    >
      <button
        type="button"
        aria-label="Previous"
        title="Previous"
        data-no-nav-dock
        onClick={() => {
          channelDown();
          armIdle();
        }}
      >
        <span aria-hidden>‹</span>
      </button>
      <button
        type="button"
        aria-label={mediaPaused ? "Play" : "Pause"}
        title={mediaPaused ? "Play" : "Pause"}
        data-no-nav-dock
        onClick={() => {
          toggleMediaPaused();
          armIdle();
        }}
      >
        <span aria-hidden>{mediaPaused ? "▶" : "Ⅱ"}</span>
      </button>
      <button
        type="button"
        aria-label="Next"
        title="Next"
        data-no-nav-dock
        onClick={() => {
          channelUp();
          armIdle();
        }}
      >
        <span aria-hidden>›</span>
      </button>
      <button
        type="button"
        aria-label="Live"
        title="Live"
        data-no-nav-dock
        onClick={() => {
          setMediaPaused(false);
          armIdle();
        }}
      >
        <IconBroadcast size={20} />
      </button>
      <button
        type="button"
        aria-label="Offline hub"
        title="Offline"
        data-no-nav-dock
        onClick={() => setSurface("OFFLINE_HUB")}
      >
        <IconHome size={20} />
      </button>
    </nav>
  );
}
