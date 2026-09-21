import { useEffect, useRef } from "react";

/**
 * Center-outward living sound field for Radio.
 * Pure visual atmosphere — no cards, chrome, or player chrome.
 */
export function RadioWaveField({
  active,
  intensity = 1,
}: {
  active: boolean;
  /** 0–1 relative motion energy (optional audio-linked). */
  intensity?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--radio-wave-energy", String(0.55 + Math.min(1, Math.max(0, intensity)) * 0.45));
  }, [intensity]);

  return (
    <div
      ref={rootRef}
      className={`radio-wave-field${active ? " is-live" : ""}`}
      aria-hidden
      data-no-nav-dock
    >
      <div className="radio-wave-field__glow" />
      <div className="radio-wave-field__core" />
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className="radio-wave-field__ring"
          style={{ ["--ring-i" as string]: i }}
        />
      ))}
      <div className="radio-wave-field__ripple radio-wave-field__ripple--a" />
      <div className="radio-wave-field__ripple radio-wave-field__ripple--b" />
      <div className="radio-wave-field__ripple radio-wave-field__ripple--c" />
    </div>
  );
}
