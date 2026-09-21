import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  /** 0–1 relative motion energy (procedural or audio-linked). */
  intensity?: number;
  /** Lower complexity for battery / reduced preference. */
  reduced?: boolean;
};

/**
 * Living signal field — waves radiate from a center core outward.
 * Canvas stops when inactive to avoid battery drain.
 */
export function RadioWaveField({ active, intensity = 0.75, reduced = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const energyRef = useRef(intensity);

  useEffect(() => {
    energyRef.current = Math.min(1, Math.max(0.2, intensity));
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let running = true;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const t0 = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1.25 : 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (canvas.parentElement && ro) ro.observe(canvas.parentElement);

    const drawCalm = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const e = energyRef.current;
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.1);
      const r = 4 + pulse * 3 * e;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 252, 255, ${0.55 + pulse * 0.25})`;
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const rr = 28 + i * 42 + pulse * 8;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(125, 211, 252, ${0.12 - i * 0.03})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawLive = (now: number) => {
      const t = (now - t0) / 1000;
      const e = energyRef.current;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(w, h) * 0.55;

      // Deep ambient glow (near → far)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.55);
      g.addColorStop(0, `rgba(56, 189, 248, ${0.14 * e})`);
      g.addColorStop(0.35, `rgba(34, 211, 238, ${0.05 * e})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const ringCount = reduced ? 5 : 8;
      for (let i = 0; i < ringCount; i++) {
        const phase = (t * (0.18 + i * 0.015) + i * 0.37) % 1;
        const base = 18 + phase * maxR;
        const wobble = Math.sin(t * 0.7 + i * 1.3) * (4 + i * 0.8) * e;
        const opacity = (1 - phase) * (0.42 - i * 0.03) * e;
        if (opacity <= 0.02) continue;

        ctx.beginPath();
        const steps = reduced ? 48 : 72;
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          const organic =
            Math.sin(a * 3 + t * 1.2 + i) * (2.2 + i * 0.35) +
            Math.sin(a * 5 - t * 0.9) * (1.1 + e);
          const rr = base + wobble + organic;
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a) * rr;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(165, 243, 252, ${opacity})`;
        ctx.lineWidth = Math.max(0.6, 1.35 - phase * 0.7);
        ctx.stroke();
      }

      // Curved horizontal frequency bands (mid depth)
      const bands = reduced ? 2 : 4;
      for (let b = 0; b < bands; b++) {
        const yOff = (b - (bands - 1) / 2) * (h * 0.06);
        ctx.beginPath();
        const steps = reduced ? 40 : 64;
        for (let s = 0; s <= steps; s++) {
          const x = (s / steps) * w;
          const nx = (x - cx) / w;
          const amp =
            Math.sin(nx * Math.PI * 2 + t * (1.1 + b * 0.2)) *
            (10 + e * 14) *
            Math.exp(-nx * nx * 3.2);
          const y = cy + yOff + amp + Math.sin(t * 0.55 + b) * 2;
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(103, 232, 249, ${0.1 + e * 0.08 - b * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Core source point
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
      const coreR = 2.4 + pulse * 2.2 * e;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR + 10, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.08 * pulse})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(240, 253, 255, ${0.75 + pulse * 0.2})`;
      ctx.shadowColor = "rgba(125, 211, 252, 0.85)";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const frame = (now: number) => {
      if (!running) return;
      if (reduced) drawCalm((now - t0) / 1000);
      else drawLive(now);
      rafRef.current = requestAnimationFrame(frame);
    };

    if (active) {
      rafRef.current = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      ro?.disconnect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, reduced]);

  return (
    <div
      className={`radio-wave-field${active ? " is-live" : ""}${reduced ? " is-reduced" : ""}`}
      aria-hidden
      data-no-nav-dock
    >
      <canvas ref={canvasRef} className="radio-wave-field__canvas" />
    </div>
  );
}
