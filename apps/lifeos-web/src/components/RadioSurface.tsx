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
 * Radio surface — almost empty. Living sound waves radiate from center.
 * Audio plays invisibly; Control remote handles station changes.
 */
export function RadioSurface() {
  const { surface, tierOf, broadcastMode, tvChannel } = useLifeOsSurface();
  const active = surface === "RADIO";
  const tier = tierOf("RADIO");
  const audio = kernelMediaFor(["music", "podcast"]);
  const hasLocal = kernelHasLocalContent(["music", "podcast"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [energy, setEnergy] = useState(0.7);

  const station = useMemo(() => {
    if (audio.length === 0) return null;
    return audio[channelIndex(tvChannel, audio.length)] ?? null;
  }, [audio, tvChannel]);

  const brand = station ? kernelBrandOf(station) : null;
  const src = station?.mediaUrl ?? null;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!active) {
      el.pause();
      return;
    }
    if (src) {
      if (el.src !== src) {
        el.src = src;
        el.load();
      }
      void el.play().catch(() => undefined);
    } else {
      el.removeAttribute("src");
      el.load();
    }
  }, [active, src]);

  // Soft living energy when no analyser — keeps waves premium without jitter.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const wave = 0.62 + Math.sin(t * 1.15) * 0.12 + Math.sin(t * 0.37) * 0.08;
      setEnergy(wave);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div
      className={`lifeos-surface lifeos-surface--radio lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active" : ""
      }${broadcastMode ? " lifeos-surface--bare" : ""}`}
      aria-hidden={!active}
      data-surface="RADIO"
      data-kernel="lifeos-offline-kernel"
      data-radio-brand={brand ?? undefined}
    >
      {active ? (
        <div className="lifeos-surface__body lifeos-surface__body--radio-waves">
          <RadioWaveField active={active} intensity={energy} />
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
