import { useEffect, useState } from "react";
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
 * Module-level living cycle — survives shell open/close, section changes,
 * and remounts of LivingLifeOsIdentity across Personal/Business surfaces.
 */
let sharedPhase: LivingIdentityPhase = "lifeos";
let sharedTimer: ReturnType<typeof setInterval> | null = null;
let sharedSubs = 0;
const listeners = new Set<(p: LivingIdentityPhase) => void>();

function emitPhase(next: LivingIdentityPhase) {
  sharedPhase = next;
  listeners.forEach((fn) => fn(next));
}

function advanceShared() {
  const idx = LIVING_IDENTITY_PHASES.indexOf(sharedPhase);
  emitPhase(LIVING_IDENTITY_PHASES[(idx + 1) % LIVING_IDENTITY_PHASES.length]!);
}

function ensureSharedTimer() {
  if (sharedTimer) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  sharedTimer = setInterval(advanceShared, LIVING_IDENTITY_INTERVAL_MS);
}

function stopSharedTimer() {
  if (!sharedTimer) return;
  clearInterval(sharedTimer);
  sharedTimer = null;
}

function onDocVisibility() {
  if (document.visibilityState === "hidden") stopSharedTimer();
  else if (sharedSubs > 0) ensureSharedTimer();
}

function retainSharedCycle(onPhase: (p: LivingIdentityPhase) => void) {
  listeners.add(onPhase);
  sharedSubs += 1;
  if (sharedSubs === 1 && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onDocVisibility);
  }
  ensureSharedTimer();
  return () => {
    listeners.delete(onPhase);
    sharedSubs = Math.max(0, sharedSubs - 1);
    if (sharedSubs === 0) {
      stopSharedTimer();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onDocVisibility);
      }
    }
  };
}

/**
 * Living LifeOS Box — one persistent container; LifeOS → ASK ME → TASK ME.
 * Same shell-end anchor in Personal and Business. Transparent top chrome.
 */
export function LivingLifeOsIdentity({ hidden = false }: { hidden?: boolean }) {
  const { openCommand } = useCommandLayer();
  const [phase, setPhase] = useState<LivingIdentityPhase>(() => sharedPhase);

  useEffect(() => retainSharedCycle(setPhase), []);

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
