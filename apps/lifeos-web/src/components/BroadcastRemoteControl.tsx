import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import { broadcastKinds } from "../lib/broadcastSchedule";
import {
  kernelAdjacentCreatorIndex,
  kernelIndexForBrand,
} from "../lib/offlineKernelRuntime";
import { BROADCAST_REMOTE_IDLE_MS } from "./SurfaceSwitcherBar";

/**
 * Minimal creator-station zapper. Overlays content — never changes layout.
 * Middle control: type a creator name → jump to that creator's TV or Radio station.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const channel = surface === "RADIO" ? radioChannel : tvChannel;
  const [typing, setTyping] = useState(false);
  const [query, setQuery] = useState("");
  const [miss, setMiss] = useState(false);

  function clearIdle() {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = null;
  }

  function armIdle() {
    clearIdle();
    if (typing) return;
    idleRef.current = setTimeout(() => closeBroadcastUi(), BROADCAST_REMOTE_IDLE_MS);
  }

  useEffect(() => {
    if (!visible) {
      clearIdle();
      setTyping(false);
      setQuery("");
      setMiss(false);
      return;
    }
    armIdle();
    return () => clearIdle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, closeBroadcastUi, surface, channel, typing]);

  useEffect(() => {
    if (!typing) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [typing]);

  function zap(direction: "next" | "prev") {
    if (!onAir) return;
    const kinds = broadcastKinds(surface);
    const from = surface === "RADIO" ? radioChannel : tvChannel;
    const next = kernelAdjacentCreatorIndex(kinds, from, direction);
    if (surface === "RADIO") setRadioChannel(next);
    else setTvChannel(next);
    setTyping(false);
    setQuery("");
    setMiss(false);
    armIdle();
  }

  function openCreatorType() {
    clearIdle();
    setTyping(true);
    setMiss(false);
  }

  function cancelTyping() {
    setTyping(false);
    setQuery("");
    setMiss(false);
    armIdle();
  }

  function jumpToCreator(raw: string) {
    if (!onAir) return;
    const q = raw.trim();
    if (!q) {
      cancelTyping();
      return;
    }
    const kinds = broadcastKinds(surface);
    const idx = kernelIndexForBrand(kinds, q);
    if (idx < 0) {
      setMiss(true);
      return;
    }
    if (surface === "RADIO") setRadioChannel(idx);
    else setTvChannel(idx);
    setTyping(false);
    setQuery("");
    setMiss(false);
    armIdle();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    jumpToCreator(query);
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelTyping();
    }
  }

  if (!visible) return null;

  return (
    <nav
      className={`lifeos-ghost-controls lifeos-ghost-controls--stations${
        typing ? " is-typing" : ""
      }`}
      aria-label="Station remote"
      data-no-nav-dock
      data-broadcast-ui={broadcastUiMode}
      onPointerDown={() => {
        if (!typing) armIdle();
      }}
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

      {typing ? (
        <form className="lifeos-ghost-controls__seek" onSubmit={onSubmit} data-no-nav-dock>
          <input
            ref={inputRef}
            type="text"
            name="creator"
            value={query}
            placeholder={surface === "RADIO" ? "Creator radio…" : "Creator TV…"}
            aria-label={
              surface === "RADIO" ? "Type creator radio station" : "Type creator TV station"
            }
            aria-invalid={miss || undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-no-nav-dock
            onChange={(e) => {
              setQuery(e.target.value);
              setMiss(false);
            }}
            onKeyDown={onInputKey}
            onBlur={() => {
              if (!query.trim()) cancelTyping();
            }}
          />
          <button type="submit" aria-label="Go to creator" data-no-nav-dock>
            Go
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="lifeos-ghost-controls__dot-btn"
          aria-label="Type creator station"
          title="Type creator name"
          data-no-nav-dock
          onClick={openCreatorType}
        >
          <span aria-hidden>●</span>
        </button>
      )}

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
      {miss ? (
        <span className="lifeos-ghost-controls__miss" role="status">
          Station not found
        </span>
      ) : null}
    </nav>
  );
}
