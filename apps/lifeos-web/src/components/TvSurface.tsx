import { ImmersiveMediaFeed } from "./ImmersiveMediaFeed";
import { kernelMediaFor, kernelHasLocalContent } from "../lib/offlineKernelRuntime";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

/**
 * TV surface — visual broadcast presentation over the shared Offline Kernel.
 * Owns the screen when ACTIVE; Living LifeOS stays mounted underneath (WARM/SUSPENDED).
 */
export function TvSurface() {
  const { surface, tierOf } = useLifeOsSurface();
  const active = surface === "TV";
  const tier = tierOf("TV");
  const items = kernelMediaFor(["video", "reel"]);
  const hasLocal = kernelHasLocalContent(["video", "reel"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div
      className={`lifeos-surface lifeos-surface--tv lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active" : ""
      }`}
      aria-hidden={!active}
      data-surface="TV"
      data-kernel="lifeos-offline-kernel"
    >
      {active ? (
        <>
          <header className="lifeos-surface__chrome" data-no-nav-dock>
            <h1 className="lifeos-surface__title">TV</h1>
            {offline ? (
              <span className="lifeos-surface__hint muted small">
                {hasLocal ? "Local programming" : "No local stations yet"}
              </span>
            ) : null}
          </header>
          <div className="lifeos-surface__body">
            <ImmersiveMediaFeed
              items={items}
              empty={
                offline
                  ? "No locally available TV programming yet."
                  : "Nothing on TV yet."
              }
              gatePremium
              mode="reels"
              showAds={false}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
