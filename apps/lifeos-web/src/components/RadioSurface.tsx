import { useEffect, useMemo, useRef, useState } from "react";
import { RadioWaveField } from "./RadioWaveField";
import {
  kernelBrandOf,
  kernelHasLocalContent,
  kernelMediaFor,
} from "../lib/offlineKernelRuntime";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

function channelIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/**
 * Radio — signal filling space. The broadcast remote owns interaction.
 */
export function RadioSurface() {
  const { surface, tierOf, broadcastMode, radioChannel, mediaPaused } = useLifeOsSurface();
  const active = surface === "RADIO";
  const [retained, setRetained] = useState(active);
  useEffect(() => { if (active) setRetained(true); }, [active]);
  const tier = tierOf("RADIO");
  const audio = kernelMediaFor(["music", "podcast"]);
  const hasLocal = kernelHasLocalContent(["music", "podcast"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [energy, setEnergy] = useState(0.72);
  const [reduced, setReduced] = useState(false);

  const station = useMemo(() => {
    if (audio.length === 0) return null;
    return audio[channelIndex(radioChannel, audio.length)] ?? null;
  }, [audio, radioChannel]);

  const brand = station ? kernelBrandOf(station) : null;
  const src = station?.mediaUrl ?? null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!active || mediaPaused) {
      el.pause();
      return;
    }
    if (src) {
      if (el.getAttribute("src") !== src) {
        el.src = src;
        el.load();
      }
      void el.play().catch(() => undefined);
    } else {
      el.removeAttribute("src");
      el.load();
    }
  }, [active, src, mediaPaused]);

  // Procedural living energy — never freezes; layered timings (non-obvious loop).
  useEffect(() => {
    if (!active || reduced) {
      setEnergy(0.55);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const wave =
        0.58 +
        Math.sin(t * 0.91) * 0.11 +
        Math.sin(t * 0.27 + 1.2) * 0.09 +
        Math.sin(t * 1.73) * 0.04;
      setEnergy(wave);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);

  return (
    <div
      className={`lifeos-surface lifeos-surface--radio lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active is-entering" : ""
      }${broadcastMode ? " lifeos-surface--bare" : ""}`}
      aria-hidden={!active}
      data-surface="RADIO"
      data-kernel="lifeos-offline-kernel"
      data-radio-brand={brand ?? undefined}
    >
      {active || retained ? (
        <div className="lifeos-surface__body lifeos-surface__body--radio-waves">
          <RadioWaveField active={active} intensity={energy} reduced={reduced} />
          <audio ref={audioRef} preload="metadata" playsInline loop aria-hidden />
          {audio.length === 0 ? (
            <p className="radio-wave-field__empty" role="status">
              {offline && !hasLocal ? "No locally available radio yet." : "Signal waiting…"}
            </p>
          ) : null}
          <span className="radio-wave-field__sr">
            Radio{brand ? ` · ${brand}` : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
