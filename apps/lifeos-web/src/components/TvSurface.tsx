import { useEffect, useMemo, useRef, useState } from "react";
import { ImmersiveMediaFeed } from "./ImmersiveMediaFeed";
import { kernelMediaFor, kernelHasLocalContent } from "../lib/offlineKernelRuntime";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

function channelIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/**
 * TV — fullscreen program owns the screen.
 * Channel changes use a restrained broadcast dip, not a slideshow.
 */
export function TvSurface() {
  const { surface, tierOf, broadcastMode, tvChannel } = useLifeOsSurface();
  const active = surface === "TV";
  const tier = tierOf("TV");
  const items = kernelMediaFor(["video", "reel"]);
  const hasLocal = kernelHasLocalContent(["video", "reel"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const [dip, setDip] = useState(false);
  const prevChannel = useRef(tvChannel);

  const channelId = useMemo(() => {
    if (items.length === 0) return null;
    return items[channelIndex(tvChannel, items.length)]?.id ?? null;
  }, [items, tvChannel]);

  useEffect(() => {
    if (prevChannel.current === tvChannel) return;
    prevChannel.current = tvChannel;
    if (!active) return;
    setDip(true);
    const t = window.setTimeout(() => setDip(false), 280);
    return () => window.clearTimeout(t);
  }, [tvChannel, active]);

  return (
    <div
      className={`lifeos-surface lifeos-surface--tv lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active is-entering" : ""
      }${broadcastMode ? " lifeos-surface--bare" : ""}${dip ? " is-program-dip" : ""}`}
      aria-hidden={!active}
      data-surface="TV"
      data-kernel="lifeos-offline-kernel"
      data-tv-channel={channelId ?? undefined}
    >
      {active ? (
        <div className="lifeos-surface__body">
          <ImmersiveMediaFeed
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
