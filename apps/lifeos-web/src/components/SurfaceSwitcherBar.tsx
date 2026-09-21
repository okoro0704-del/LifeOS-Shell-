import { useEffect, useRef } from "react";
import { useLifeOsSurface, type LifeOsSurface } from "../context/LifeOsSurfaceContext";

const SWITCHER_IDLE_MS = 4000;

const OPTIONS: { id: LifeOsSurface; label: string }[] = [
  { id: "LIVING_LIFEOS", label: "LifeOS" },
  { id: "TV", label: "TV" },
  { id: "RADIO", label: "Radio" },
];

/**
 * Top-edge surface switcher — summoned by double-tap.
 * LifeOS · TV · Radio — temporary, auto-hides on idle.
 */
export function SurfaceSwitcherBar() {
  const { surface, setSurface, switcherVisible, closeSwitcher, openSwitcher } = useLifeOsSurface();
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!switcherVisible) {
      if (idleRef.current) clearTimeout(idleRef.current);
      return;
    }
    const arm = () => {
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => closeSwitcher(), SWITCHER_IDLE_MS);
    };
    arm();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [switcherVisible, closeSwitcher, surface]);

  function pick(next: LifeOsSurface) {
    setSurface(next);
    closeSwitcher();
  }

  function noteActivity() {
    if (!switcherVisible) return;
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => closeSwitcher(), SWITCHER_IDLE_MS);
  }

  return (
    <div
      className={`lifeos-surface-switcher${switcherVisible ? " is-open" : ""}`}
      role="toolbar"
      aria-label="LifeOS surfaces"
      aria-hidden={!switcherVisible}
      data-no-nav-dock
      onPointerDown={noteActivity}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`lifeos-surface-switcher__btn${surface === o.id ? " is-active" : ""}`}
          aria-label={o.label === "LifeOS" ? "Living LifeOS" : o.label}
          aria-pressed={surface === o.id}
          data-no-nav-dock
          onClick={() => pick(o.id)}
        >
          {o.label}
        </button>
      ))}
      {/* Keep for a11y when closed — edge affordance via double-tap; no persistent chrome */}
      <button
        type="button"
        className="lifeos-surface-switcher__a11y"
        aria-label={switcherVisible ? "Hide surface switcher" : "Show surface switcher"}
        onClick={() => (switcherVisible ? closeSwitcher() : openSwitcher())}
      >
        Surfaces
      </button>
    </div>
  );
}

export const SURFACE_SWITCHER_IDLE_MS = SWITCHER_IDLE_MS;
