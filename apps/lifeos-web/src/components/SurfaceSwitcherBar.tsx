import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { IconBroadcast, IconTv } from "@lifeos/ui";
import { useLifeOsSurface, type LifeOsSurface } from "../context/LifeOsSurfaceContext";

const SWITCHER_IDLE_MS = 4000;
export const BROADCAST_REMOTE_IDLE_MS = SWITCHER_IDLE_MS;

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const LIVING_OPTIONS: { id: LifeOsSurface; label: string; aria: string; Icon?: IconComp }[] = [
  { id: "LIVING_LIFEOS", label: "LifeOS", aria: "Living LifeOS" },
];

/** Icons-only mode switch — never show TV/Radio text labels. */
const BROADCAST_MODE_OPTIONS: {
  id: "TV" | "RADIO";
  aria: string;
  Icon: IconComp;
}[] = [
  { id: "TV", aria: "TV", Icon: IconTv },
  { id: "RADIO", aria: "Radio", Icon: IconBroadcast },
];

/**
 * Living: temporary LifeOS surface picker.
 * TV/Radio REMOTE_REVEALED: floating TV/Radio icons only (no labels, no glass sheet).
 */
export function SurfaceSwitcherBar() {
  const {
    surface,
    setSurface,
    broadcastMode,
    broadcastUiMode,
    switcherVisible,
    closeSwitcher,
    openSwitcher,
    closeBroadcastUi,
  } = useLifeOsSurface();
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAir = surface === "TV" || surface === "RADIO";
  const remoteOpen = onAir && broadcastUiMode === "REMOTE_REVEALED";
  const livingOpen = !onAir && switcherVisible;
  const open = remoteOpen || livingOpen;

  useEffect(() => {
    if (!open) {
      if (idleRef.current) clearTimeout(idleRef.current);
      return;
    }
    const dismiss = () => {
      if (onAir) closeBroadcastUi();
      else closeSwitcher();
    };
    const arm = () => {
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(dismiss, SWITCHER_IDLE_MS);
    };
    arm();
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [open, onAir, closeBroadcastUi, closeSwitcher, surface, broadcastUiMode]);

  function pick(next: LifeOsSurface) {
    setSurface(next);
    if (onAir) closeBroadcastUi();
    else closeSwitcher();
  }

  function noteActivity() {
    if (!open) return;
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => {
      if (onAir) closeBroadcastUi();
      else closeSwitcher();
    }, SWITCHER_IDLE_MS);
  }

  if (onAir) {
    return (
      <div
        className={`lifeos-ghost-remote lifeos-ghost-remote--broadcast-modes${
          remoteOpen ? " is-open" : ""
        }`}
        role="toolbar"
        aria-label="Broadcast mode"
        aria-hidden={!remoteOpen}
        data-no-nav-dock
        data-ghost-remote
        data-broadcast-ui={broadcastUiMode}
        onPointerDown={noteActivity}
      >
        <div className="lifeos-ghost-remote__row" role="group" aria-label="TV or Radio">
          {BROADCAST_MODE_OPTIONS.map((o) => {
            const Icon = o.Icon;
            const active = surface === o.id;
            return (
              <button
                key={o.id}
                type="button"
                className={`lifeos-ghost-remote__btn lifeos-ghost-remote__btn--icon lifeos-ghost-remote__btn--${o.id.toLowerCase()}${
                  active ? " is-active" : ""
                }`}
                aria-label={o.aria}
                aria-pressed={active}
                data-no-nav-dock
                onClick={() => pick(o.id)}
              >
                <span className="lifeos-ghost-remote__glyph" aria-hidden>
                  <Icon size={24} />
                  {o.id === "TV" && active ? (
                    <span className="lifeos-ghost-remote__pulse lifeos-ghost-remote__pulse--tv" />
                  ) : null}
                  {o.id === "RADIO" && active ? (
                    <span className="lifeos-ghost-remote__pulse lifeos-ghost-remote__pulse--radio" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`lifeos-ghost-remote${livingOpen ? " is-open" : ""}${
        broadcastMode ? " lifeos-ghost-remote--broadcast" : ""
      }`}
      role="toolbar"
      aria-label="LifeOS surfaces"
      aria-hidden={!livingOpen}
      data-no-nav-dock
      data-ghost-remote
      onPointerDown={noteActivity}
    >
      <div className="lifeos-ghost-remote__row" role="group" aria-label="Surfaces">
        {LIVING_OPTIONS.map((o) => {
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
              <span className="lifeos-ghost-remote__label">{o.label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="lifeos-ghost-remote__a11y"
        aria-label={livingOpen ? "Hide surface remote" : "Show surface remote"}
        onClick={() => (livingOpen ? closeSwitcher() : openSwitcher())}
      >
        Surfaces
      </button>
    </div>
  );
}

export const SURFACE_SWITCHER_IDLE_MS = SWITCHER_IDLE_MS;
