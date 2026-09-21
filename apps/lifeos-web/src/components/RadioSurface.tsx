import { MediaFeed } from "./MediaFeed";
import { ImmersiveMediaFeed } from "./ImmersiveMediaFeed";
import { kernelMediaFor, kernelHasLocalContent } from "../lib/offlineKernelRuntime";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

/**
 * Radio surface — audio broadcast presentation over the shared Offline Kernel.
 */
export function RadioSurface() {
  const { surface, tierOf } = useLifeOsSurface();
  const active = surface === "RADIO";
  const tier = tierOf("RADIO");
  const audio = kernelMediaFor(["music", "podcast"]);
  const visualFallback = kernelMediaFor(["reel"]);
  const hasLocal = kernelHasLocalContent(["music", "podcast"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div
      className={`lifeos-surface lifeos-surface--radio lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active" : ""
      }`}
      aria-hidden={!active}
      data-surface="RADIO"
      data-kernel="lifeos-offline-kernel"
    >
      {active ? (
        <>
          <header className="lifeos-surface__chrome" data-no-nav-dock>
            <h1 className="lifeos-surface__title">Radio</h1>
            {offline ? (
              <span className="lifeos-surface__hint muted small">
                {hasLocal ? "Local stations" : "No local audio yet"}
              </span>
            ) : null}
          </header>
          <div className="lifeos-surface__body lifeos-surface__body--radio">
            {audio.length > 0 ? (
              <MediaFeed items={audio} empty="Nothing on Radio yet." gatePremium />
            ) : (
              <ImmersiveMediaFeed
                items={visualFallback}
                empty={offline ? "No locally available radio yet." : "Nothing on Radio yet."}
                gatePremium
                mode="reels"
                showAds={false}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
