import type { ReactNode } from "react";
import { hasPremium, setPremium, type MediaItem } from "../lib/personalCatalog";

function mediaTone(id: string): string {
  const tones = [
    "linear-gradient(160deg, #0f766e 0%, #134e4a 45%, #042f2e 100%)",
    "linear-gradient(160deg, #1d4ed8 0%, #1e3a8a 50%, #0f172a 100%)",
    "linear-gradient(160deg, #b45309 0%, #7c2d12 50%, #1c1917 100%)",
    "linear-gradient(160deg, #be123c 0%, #881337 50%, #1f0610 100%)",
    "linear-gradient(160deg, #15803d 0%, #14532d 45%, #052e16 100%)",
    "linear-gradient(160deg, #6d28d9 0%, #4c1d95 50%, #1e1b4b 100%)",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[h]!;
}

/**
 * Full-viewport snap feed for Post and Reels.
 * Optional leading chrome (section tabs) scrolls away with the body.
 */
export function ImmersiveMediaFeed({
  items,
  empty,
  gatePremium,
  mode = "post",
  leading,
}: {
  items: MediaItem[];
  empty: string;
  gatePremium?: boolean;
  mode?: "post" | "reels";
  leading?: ReactNode;
}) {
  const premium = hasPremium();

  if (!items.length) {
    return (
      <div className="immersive-feed immersive-feed--empty">
        {leading}
        <p className="muted immersive-feed__empty">{empty}</p>
      </div>
    );
  }

  return (
    <ul className={`immersive-feed immersive-feed--${mode}`} aria-label={mode === "reels" ? "Reels" : "Posts"}>
      {leading ? (
        <li className="immersive-feed__leading" aria-hidden={false}>
          {leading}
        </li>
      ) : null}
      {items.map((item) => {
        const locked = Boolean(gatePremium && item.premiumRequired && !premium);
        const isVideo = item.kind === "video" || item.kind === "reel";
        return (
          <li key={item.id} className={`immersive-feed__slide${locked ? " is-locked" : ""}`}>
            <div className="immersive-feed__media" style={{ background: mediaTone(item.id) }}>
              {item.posterUrl || item.mediaUrl ? (
                isVideo && item.mediaUrl && !locked ? (
                  <video
                    className="immersive-feed__asset"
                    src={item.mediaUrl}
                    poster={item.posterUrl}
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                  />
                ) : (
                  <img
                    className="immersive-feed__asset"
                    src={item.posterUrl || item.mediaUrl}
                    alt=""
                    loading="lazy"
                  />
                )
              ) : null}
              <div className="immersive-feed__scrim" aria-hidden />
            </div>

            <div className="immersive-feed__copy">
              <div className="immersive-feed__meta">
                <span className="immersive-feed__kind">{item.kind}</span>
                {item.trending ? <span className="media-feed__badge media-feed__badge--trend">Trending</span> : null}
                {item.free ? <span className="media-feed__badge">Free</span> : null}
                {item.premiumRequired ? (
                  <span className="media-feed__badge media-feed__badge--pro">Premium</span>
                ) : null}
              </div>
              {item.author ? <span className="immersive-feed__author">@{item.author}</span> : null}
              <strong className="immersive-feed__title">{item.title}</strong>
              <p className="immersive-feed__detail">{item.detail}</p>
              {item.likes ? <span className="immersive-feed__likes">{item.likes} likes</span> : null}

              {locked ? (
                <button
                  type="button"
                  className="los-btn los-btn--soft los-btn--sm"
                  onClick={() => {
                    setPremium(true);
                    window.location.reload();
                  }}
                >
                  Subscribe to Premium to play
                </button>
              ) : null}
            </div>

            <div className="immersive-feed__engage" aria-label="Engagement">
              <button type="button" className="immersive-feed__engage-btn">
                Like
              </button>
              <button type="button" className="immersive-feed__engage-btn">
                Comment
              </button>
              <button type="button" className="immersive-feed__engage-btn">
                Reuse
              </button>
              <button type="button" className="immersive-feed__engage-btn">
                Reshare
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
