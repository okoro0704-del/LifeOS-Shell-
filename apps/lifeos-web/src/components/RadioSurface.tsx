import { useMemo } from "react";
import { MediaFeed } from "./MediaFeed";
import { ImmersiveMediaFeed } from "./ImmersiveMediaFeed";
import { kernelMediaFor, kernelHasLocalContent } from "../lib/offlineKernelRuntime";
import { useLifeOsSurface } from "../context/LifeOsSurfaceContext";

function channelIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  return ((n % len) + len) % len;
}

/**
 * Radio surface — audio over shared Offline Kernel.
 * Channel zap via Control remote when in broadcast mode.
 */
export function RadioSurface() {
  const { surface, tierOf, broadcastMode, tvChannel } = useLifeOsSurface();
  const active = surface === "RADIO";
  const tier = tierOf("RADIO");
  const audio = kernelMediaFor(["music", "podcast"]);
  const visualFallback = kernelMediaFor(["reel"]);
  const hasLocal = kernelHasLocalContent(["music", "podcast"]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  const pool = audio.length > 0 ? audio : visualFallback;

  const channelId = useMemo(() => {
    if (pool.length === 0) return null;
    return pool[channelIndex(tvChannel, pool.length)]?.id ?? null;
  }, [pool, tvChannel]);

  const orderedAudio = useMemo(() => {
    if (!channelId || audio.length === 0) return audio;
    const activeItem = audio.find((a) => a.id === channelId);
    if (!activeItem) return audio;
    return [activeItem, ...audio.filter((a) => a.id !== channelId)];
  }, [audio, channelId]);

  return (
    <div
      className={`lifeos-surface lifeos-surface--radio lifeos-surface--${tier.toLowerCase()}${
        active ? " is-active" : ""
      }${broadcastMode ? " lifeos-surface--bare" : ""}`}
      aria-hidden={!active}
      data-surface="RADIO"
      data-kernel="lifeos-offline-kernel"
    >
      {active ? (
        <div className="lifeos-surface__body lifeos-surface__body--radio">
          {audio.length > 0 ? (
            <MediaFeed
              key={`radio-ch-${channelId ?? "empty"}`}
              items={orderedAudio}
              empty="Nothing on Radio yet."
              gatePremium
            />
          ) : (
            <ImmersiveMediaFeed
              key={`radio-fb-${channelId ?? "empty"}`}
              items={visualFallback}
              empty={offline && !hasLocal ? "No locally available radio yet." : "Nothing on Radio yet."}
              gatePremium
              mode="reels"
              showAds={false}
              initialPublicationId={channelId}
              seekPublicationId={channelId}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
