import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { IconBroadcast, IconTv } from "@lifeos/ui";
import { useLifeOsSurface, type LifeOsSurface } from "../context/LifeOsSurfaceContext";

const SWITCHER_IDLE_MS = 4000;

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const LIVING_OPTIONS: { id: LifeOsSurface; label: string; aria: string; Icon?: IconComp }[] = [
  { id: "LIVING_LIFEOS", label: "LifeOS", aria: "Living LifeOS" },
  { id: "TV", label: "TV", aria: "TV", Icon: IconTv },
  { id: "RADIO", label: "Radio", aria: "Radio", Icon: IconBroadcast },
];

const BROADCAST_OPTIONS: { id: LifeOsSurface; label: string; aria: string; Icon?: IconComp }[] = [
  { id: "TV", label: "TV", aria: "TV", Icon: IconTv },
  { id: "RADIO", label: "Radio", aria: "Radio", Icon: IconBroadcast },
];

/**
 * Temporary projected energy — floating remote over physical content.
 * Double-tap summons; inactivity / selection dismisses. No layout shift.
 */
export function SurfaceSwitcherBar() {
  const {
    surface,
    setSurface,
    broadcastMode,
    switcherVisible,
    closeSwitcher,
    openSwitcher,
  } = useLifeOsSurface();
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = broadcastMode ? BROADCAST_OPTIONS : LIVING_OPTIONS;

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
      className={`lifeos-ghost-remote${switcherVisible ? " is-open" : ""}${
        broadcastMode ? " lifeos-ghost-remote--broadcast" : ""
      }`}
      role="toolbar"
      aria-label={broadcastMode ? "TV and Radio" : "LifeOS surfaces"}
      aria-hidden={!switcherVisible}
      data-no-nav-dock
      data-ghost-remote
      onPointerDown={noteActivity}
    >
      <div className="lifeos-ghost-remote__glass" aria-hidden />
      <div className="lifeos-ghost-remote__row" role="group" aria-label="Surfaces">
        {options.map((o) => {
          const Icon = o.Icon;
          const active = surface === o.id;
          return (
            <button
              key={o.id}
              type="button"
              className={`lifeos-ghost-remote__btn lifeos-ghost-remote__btn--${o.id.toLowerCase()}${
                active ? " is-active" : ""
              }`}
              aria-label={o.aria}
              aria-pressed={active}
              data-no-nav-dock
              onClick={() => pick(o.id)}
            >
              {Icon ? (
                <span className="lifeos-ghost-remote__glyph" aria-hidden>
                  <Icon size={22} />
                  {o.id === "TV" && active ? (
                    <span className="lifeos-ghost-remote__pulse lifeos-ghost-remote__pulse--tv" />
                  ) : null}
                  {o.id === "RADIO" && active ? (
                    <span className="lifeos-ghost-remote__pulse lifeos-ghost-remote__pulse--radio" />
                  ) : null}
                </span>
              ) : null}
              <span className="lifeos-ghost-remote__label">{o.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="lifeos-ghost-remote__a11y"
        aria-label={switcherVisible ? "Hide surface remote" : "Show surface remote"}
        onClick={() => (switcherVisible ? closeSwitcher() : openSwitcher())}
      >
        Surfaces
      </button>
    </div>
  );
}

export const SURFACE_SWITCHER_IDLE_MS = SWITCHER_IDLE_MS;
