import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import { IconBroadcast, IconKernel, IconTv } from "@lifeos/ui";
import { useAuth } from "../hooks/useAuth";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useLifeOsSurface, type LifeOsSurface } from "../context/LifeOsSurfaceContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { personalKernelPath } from "./shell/nav";

const SWITCHER_IDLE_MS = 4000;
export const BROADCAST_REMOTE_IDLE_MS = SWITCHER_IDLE_MS;

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const LIVING_OPTIONS: { id: LifeOsSurface; label: string; aria: string; Icon?: IconComp }[] = [
  { id: "LIVING_LIFEOS", label: "LifeOS", aria: "Living LifeOS" },
];

/**
 * Living: temporary LifeOS surface picker.
 * TV/Radio REMOTE_REVEALED: Online · TV · Radio at the top.
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
    exitBroadcast,
  } = useLifeOsSurface();
  const { setMode } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  function goOnline() {
    closeBroadcastUi();
    setMode("PERSONAL");
    setLastSelectedKernel("main", user?.trustId);
    exitBroadcast();
    setSurface("LIVING_LIFEOS");
    navigate(personalKernelPath("main"));
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
        <div className="lifeos-ghost-remote__row" role="group" aria-label="Online TV Radio">
          <button
            type="button"
            className="lifeos-ghost-remote__btn lifeos-ghost-remote__btn--online"
            aria-label="Online"
            data-no-nav-dock
            onClick={goOnline}
          >
            <span className="lifeos-ghost-remote__glyph" aria-hidden>
              <IconKernel size={22} />
            </span>
            <span className="lifeos-ghost-remote__label">Online</span>
          </button>
          <button
            type="button"
            className={`lifeos-ghost-remote__btn lifeos-ghost-remote__btn--icon lifeos-ghost-remote__btn--tv${
              surface === "TV" ? " is-active" : ""
            }`}
            aria-label="TV"
            aria-pressed={surface === "TV"}
            data-no-nav-dock
            onClick={() => pick("TV")}
          >
            <span className="lifeos-ghost-remote__glyph" aria-hidden>
              <IconTv size={24} />
              {surface === "TV" ? (
                <span className="lifeos-ghost-remote__pulse lifeos-ghost-remote__pulse--tv" />
              ) : null}
            </span>
          </button>
          <button
            type="button"
            className={`lifeos-ghost-remote__btn lifeos-ghost-remote__btn--icon lifeos-ghost-remote__btn--radio${
              surface === "RADIO" ? " is-active" : ""
            }`}
            aria-label="Radio"
            aria-pressed={surface === "RADIO"}
            data-no-nav-dock
            onClick={() => pick("RADIO")}
          >
            <span className="lifeos-ghost-remote__glyph" aria-hidden>
              <IconBroadcast size={24} />
              {surface === "RADIO" ? (
                <span className="lifeos-ghost-remote__pulse lifeos-ghost-remote__pulse--radio" />
              ) : null}
            </span>
          </button>
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
