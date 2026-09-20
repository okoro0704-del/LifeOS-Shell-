import { useCallback, useEffect, useRef, useState } from "react";
import { useCommandLayer } from "../hooks/useCommandLayer";

export type LivingIdentityPhase = "lifeos" | "ask" | "task";

export const LIVING_IDENTITY_PHASES: LivingIdentityPhase[] = ["lifeos", "ask", "task"];
/** Dwell time per identity phase (ms). */
export const LIVING_IDENTITY_INTERVAL_MS = 3000;

const PHASE_LABEL: Record<LivingIdentityPhase, string> = {
  lifeos: "LifeOS",
  ask: "ASK ME",
  task: "TASK ME",
};

/**
 * Living LifeOS identity — LifeOS → ASK ME → TASK ME.
 * ONE shared component for Personal / Business / all kernels.
 * Position is always the same shell-end anchor (no space mirroring).
 */
export function LivingLifeOsIdentity({ hidden = false }: { hidden?: boolean }) {
  const { openCommand } = useCommandLayer();
  const [phase, setPhase] = useState<LivingIdentityPhase>("lifeos");
  const phaseRef = useRef<LivingIdentityPhase>("lifeos");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    const idx = LIVING_IDENTITY_PHASES.indexOf(phaseRef.current);
    const next = LIVING_IDENTITY_PHASES[(idx + 1) % LIVING_IDENTITY_PHASES.length]!;
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    // Fresh mount always starts on LifeOS — do not resume mid-cycle from elsewhere.
    phaseRef.current = "lifeos";
    setPhase("lifeos");

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(advance, LIVING_IDENTITY_INTERVAL_MS);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };

    if (document.visibilityState !== "hidden") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [advance]);

  function onActivate() {
    if (phase === "ask") {
      openCommand(undefined, "ask");
      return;
    }
    if (phase === "task") {
      openCommand(undefined, "tell");
    }
  }

  const actionable = phase === "ask" || phase === "task";
  const label = PHASE_LABEL[phase];
  const ariaLabel =
    phase === "ask"
      ? "ASK ME — Ask LifeOS"
      : phase === "task"
        ? "TASK ME — Tell LifeOS a task"
        : "LifeOS";

  return (
    <header
      className={`kernel-brand-bar kernel-brand-bar--static kernel-brand-bar--living${
        hidden ? " is-hidden" : ""
      }`}
      aria-label="LifeOS identity"
      data-living-identity
      data-living-phase={phase}
    >
      <button
        type="button"
        className={`living-lifeos__hit${actionable ? " is-actionable" : ""}`}
        aria-label={ariaLabel}
        disabled={!actionable}
        onClick={onActivate}
        data-no-nav-dock
      >
        <span className="living-lifeos__slot" aria-hidden>
          {/* Ghost widest label — locks width so CLS stays ~0 */}
          <span className="living-lifeos__ghost">TASK ME</span>
          <span className={`living-lifeos__text living-lifeos__text--${phase}`}>{label}</span>
        </span>
      </button>
    </header>
  );
}

/** @deprecated Prefer LivingLifeOsIdentity — kept as alias for existing imports. */
export function KernelBrandBar({
  hidden,
}: {
  hidden?: boolean;
  align?: "center" | "end";
  kernel?: unknown;
}) {
  return <LivingLifeOsIdentity hidden={hidden} />;
}
