import { useMemo } from "react";
import { ImmersiveMediaFeed } from "./ImmersiveMediaFeed";
import { kernelMediaFor, kernelHasLocalContent } from "../lib/offlineKernelRuntime";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

function channelIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/**
 * TV surface — bare fullscreen when Offline Kernel broadcast is active.
 * Channel changes come from Control remote (tvChannel).
 */
export function TvSurface() {
  const { surface, tierOf, broadcastMode, tvChannel } = useLifeOsSurface();
  const active = surface === "TV";
  const tier = tierOf("TV");
  const items = kernelMediaFor(["video", "reel"]);
  const hasLocal = kernelHasLocalContent(["video", "reel"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  const channelId = useMemo(() => {
    if (items.length === 0) return null;
    return items[channelIndex(tvChannel, items.length)]?.id ?? null;
  }, [items, tvChannel]);

  return (
    <div
      className={`lifeos-surface lifeos-surface--tv lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active" : ""
      }${broadcastMode ? " lifeos-surface--bare" : ""}`}
      aria-hidden={!active}
      data-surface="TV"
      data-kernel="lifeos-offline-kernel"
      data-tv-channel={channelId ?? undefined}
    >
      {active ? (
        <div className="lifeos-surface__body">
          <ImmersiveMediaFeed
            key={`tv-ch-${channelId ?? "empty"}`}
            items={items}
            empty={
              offline && !hasLocal
                ? "No locally available TV programming yet."
                : "Nothing on TV yet."
            }
            gatePremium
            mode="reels"
            showAds={false}
            initialPublicationId={channelId}
            seekPublicationId={channelId}
          />
        </div>
      ) : null}
    </div>
  );
}
