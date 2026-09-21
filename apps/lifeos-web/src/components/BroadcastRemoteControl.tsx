import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { IconBroadcast } from "@lifeos/ui";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";
import {
  kernelAdjacentCreatorIndex,
  kernelBrandOf,
  kernelCreatorsFor,
  kernelIndexForBrand,
  kernelMediaFor,
} from "../lib/offlineKernelRuntime";
import { personalKernelPath } from "./shell/nav";
import { setLastSelectedKernel } from "../lib/kernelNavigation";
import { useAuth } from "../hooks/useAuth";

type ControlMode = "auto" | "manual";

function channelIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

function kindsForSurface(surface: string): Array<"video" | "reel" | "music" | "podcast"> {
  return surface === "RADIO" ? ["music", "podcast"] : ["video", "reel"];
}

/**
 * Control for Offline TV / Radio.
 * Hidden at launch — a small bottom peek icon summons Auto / Manual tuning.
 */
export function BroadcastRemoteControl() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const panelId = useId();
  const {
    surface,
    broadcastMode,
    controlVisible,
    openControl,
    closeControl,
    exitBroadcast,
    tvChannel,
    setTvChannel,
  } = useLifeOsSurface();

  const [mode, setMode] = useState<ControlMode>("auto");
  const [brandQuery, setBrandQuery] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const onAir = broadcastMode && (surface === "TV" || surface === "RADIO");
  const kinds = kindsForSurface(surface);
  const channels = useMemo(() => kernelMediaFor(kindsForSurface(surface)), [surface]);
  const creators = useMemo(() => kernelCreatorsFor(kindsForSurface(surface)), [surface]);
  const idx = channelIndex(tvChannel, Math.max(1, channels.length));
  const station = channels[idx];
  const brand = station ? kernelBrandOf(station) : "—";

  useEffect(() => {
    if (!controlVisible) {
      setManualError(null);
      setBrandQuery("");
      setMode("auto");
    }
  }, [controlVisible]);

  if (!onAir) return null;

  function leaveOffline() {
    closeControl();
    exitBroadcast();
    setLastSelectedKernel("main", user?.trustId);
    navigate(personalKernelPath("main"));
  }

  function autoNext() {
    setTvChannel(kernelAdjacentCreatorIndex(kinds, tvChannel, "next"));
  }

  function autoPrev() {
    setTvChannel(kernelAdjacentCreatorIndex(kinds, tvChannel, "prev"));
  }

  function tuneManual(e: FormEvent) {
    e.preventDefault();
    const hit = kernelIndexForBrand(kinds, brandQuery);
    if (hit < 0) {
      setManualError("No creator TV matches that brand name.");
      return;
    }
    setManualError(null);
    setTvChannel(hit);
  }

  return (
    <>
      <button
        type="button"
        className={`lifeos-remote-peek${controlVisible ? " is-hidden" : ""}`}
        aria-label="Open Control"
        aria-expanded={controlVisible}
        aria-controls={panelId}
        data-no-nav-dock
        hidden={controlVisible}
        onClick={() => openControl()}
      >
        <IconBroadcast size={20} />
        <span className="lifeos-remote-peek__label">Control</span>
      </button>

      {controlVisible ? (
        <div
          className="lifeos-remote is-open"
          role="dialog"
          aria-modal="true"
          aria-label="Control remote"
          id={panelId}
          data-no-nav-dock
        >
          <button
            type="button"
            className="lifeos-remote__backdrop"
            aria-label="Close Control"
            data-no-nav-dock
            onClick={() => closeControl()}
          />
          <div className="lifeos-remote__panel" data-no-nav-dock>
            <header className="lifeos-remote__head">
              <strong>Control</strong>
              <span className="lifeos-remote__ch muted small">
                {surface === "RADIO" ? "Radio" : "TV"} · {brand}
              </span>
            </header>

            <div className="lifeos-remote__modes" role="tablist" aria-label="Control mode">
              <button
                type="button"
                role="tab"
                className={`lifeos-remote__mode${mode === "auto" ? " is-active" : ""}`}
                aria-selected={mode === "auto"}
                data-no-nav-dock
                onClick={() => setMode("auto")}
              >
                Auto
              </button>
              <button
                type="button"
                role="tab"
                className={`lifeos-remote__mode${mode === "manual" ? " is-active" : ""}`}
                aria-selected={mode === "manual"}
                data-no-nav-dock
                onClick={() => setMode("manual")}
              >
                Manual
              </button>
            </div>

            {mode === "auto" ? (
              <div className="lifeos-remote__auto" role="tabpanel" aria-label="Auto Control">
                <p className="lifeos-remote__hint muted small">
                  Move from one creator&apos;s {surface === "RADIO" ? "station" : "TV"} to the next.
                  {creators.length > 0 ? ` ${creators.length} creators.` : ""}
                </p>
                <div className="lifeos-remote__pad" role="group" aria-label="Creator channel">
                  <button
                    type="button"
                    className="lifeos-remote__key lifeos-remote__key--ch"
                    aria-label="Previous creator"
                    data-no-nav-dock
                    onClick={() => autoPrev()}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="lifeos-remote__key lifeos-remote__key--ch"
                    aria-label="Next creator"
                    data-no-nav-dock
                    onClick={() => autoNext()}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <form
                className="lifeos-remote__manual"
                role="tabpanel"
                aria-label="Manual Control"
                onSubmit={tuneManual}
              >
                <p className="lifeos-remote__hint muted small">
                  Type a creator&apos;s brand name to open their {surface === "RADIO" ? "station" : "TV"}.
                </p>
                <label className="lifeos-remote__field">
                  <span className="visually-hidden">Creator brand name</span>
                  <input
                    type="text"
                    name="brand"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Creator brand name"
                    value={brandQuery}
                    data-no-nav-dock
                    onChange={(e) => {
                      setBrandQuery(e.target.value);
                      setManualError(null);
                    }}
                  />
                </label>
                {manualError ? (
                  <p className="lifeos-remote__error" role="alert">
                    {manualError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="lifeos-remote__key lifeos-remote__key--go"
                  data-no-nav-dock
                >
                  Go to TV
                </button>
              </form>
            )}

            <button
              type="button"
              className="lifeos-remote__leave"
              data-no-nav-dock
              onClick={() => leaveOffline()}
            >
              Leave Offline
            </button>
            <button
              type="button"
              className="lifeos-remote__done"
              data-no-nav-dock
              onClick={() => closeControl()}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
