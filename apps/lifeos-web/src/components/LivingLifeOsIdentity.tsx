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
 * Living LifeOS Box — one persistent container; LifeOS → ASK ME → TASK ME.
 * Same shell-end anchor in Personal and Business. Transparent top chrome.
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
  // Stable accessible name — avoid announcing every 3s phase change.
  const ariaLabel =
    phase === "ask"
      ? "ASK ME — Ask LifeOS"
      : phase === "task"
        ? "TASK ME — Tell LifeOS a task"
        : "LifeOS living identity";

  return (
    <header
      className={`living-lifeos-box${hidden ? " is-hidden" : ""}`}
      aria-label="LifeOS"
      data-living-identity
      data-living-phase={phase}
    >
      <button
        type="button"
        className={`living-lifeos-box__hit${actionable ? " is-actionable" : ""}`}
        aria-label={ariaLabel}
        aria-live="off"
        disabled={!actionable}
        onClick={onActivate}
        data-no-nav-dock
      >
        <span className="living-lifeos-box__frame" aria-hidden>
          <span className="living-lifeos-box__ghost">TASK ME</span>
          <span className={`living-lifeos-box__text living-lifeos-box__text--${phase}`}>{label}</span>
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
