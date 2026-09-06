import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { hasPremium, setPremium, type MediaItem } from "../lib/personalCatalog";
import {
  getLifeOsCredits,
  isAdSaved,
  markWatchedOffline,
  resolveTier,
  saveAdToOffline,
  spendCreditsWatching,
  topUpLifeOsCredits,
  vipRateFor,
  withFreeKernelAds,
  type AdCreative,
} from "../lib/personalMonetization";

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

function creatorSlug(author?: string) {
  return (author || "creator").replace(/^@/, "");
}

function AdSlide({ ad, onSaved }: { ad: AdCreative; onSaved: () => void }) {
  const [saved, setSaved] = useState(() => isAdSaved(ad.id));

  return (
    <li className="immersive-feed__slide immersive-feed__slide--ad">
      <div className="immersive-feed__media" style={{ background: mediaTone(ad.id) }}>
        {ad.mediaUrl ? (
          <video
            className="immersive-feed__asset"
            src={ad.mediaUrl}
            poster={ad.posterUrl}
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
          />
        ) : ad.posterUrl ? (
          <img className="immersive-feed__asset" src={ad.posterUrl} alt="" loading="lazy" />
        ) : null}
        <div className="immersive-feed__scrim" aria-hidden />
      </div>
      <div className="immersive-feed__copy">
        <span className="media-feed__badge media-feed__badge--ad">Ad</span>
        <strong className="immersive-feed__title">{ad.title}</strong>
        <span className="immersive-feed__author">{ad.advertiser}</span>
        <div className="immersive-feed__ad-actions">
          <button type="button" className="los-btn los-btn--soft los-btn--sm">
            {ad.cta}
          </button>
          <button
            type="button"
            className="los-btn los-btn--ghost los-btn--sm"
            disabled={saved}
            onClick={() => {
              saveAdToOffline(ad);
              setSaved(true);
              onSaved();
            }}
          >
            {saved ? "Saved" : "Save Offline"}
          </button>
        </div>
      </div>
    </li>
  );
}

function SideRail({ item }: { item: MediaItem }) {
  const navigate = useNavigate();
  const slug = creatorSlug(item.author);
  const initial = (item.author || "C").replace(/^@/, "").slice(0, 1).toUpperCase();

  return (
    <aside className="immersive-feed__rail" aria-label="Actions">
      <button
        type="button"
        className="immersive-feed__avatar"
        aria-label={`Open ${slug} creator app`}
        onClick={() => navigate(`/app/personal/creator/${encodeURIComponent(slug)}`)}
      >
        {initial}
      </button>
      <button type="button" className="immersive-feed__rail-btn">
        Like
      </button>
      <button type="button" className="immersive-feed__rail-btn">
        Comment
      </button>
      <button type="button" className="immersive-feed__rail-btn">
        Reuse
      </button>
      <button type="button" className="immersive-feed__rail-btn">
        Reshare
      </button>
    </aside>
  );
}

function ContentSlide({
  item,
  lockedPremium,
  credits,
  onCredits,
}: {
  item: MediaItem;
  lockedPremium: boolean;
  credits: number;
  onCredits: (n: number) => void;
}) {
  const tier = resolveTier(item);
  const vipRate = vipRateFor(item);
  const isVideo = item.kind === "video" || item.kind === "reel";
  const lockedVip = tier === "vip" && credits <= 0;
  const locked = lockedPremium || lockedVip;
  const creator = creatorSlug(item.author);

  useEffect(() => {
    if (locked) return;
    if (isVideo) markWatchedOffline(item);
  }, [item, isVideo, locked]);

  useEffect(() => {
    if (tier !== "vip" || lockedPremium || locked) return;
    const id = window.setInterval(() => {
      const bal = getLifeOsCredits();
      if (bal <= 0) {
        onCredits(0);
        return;
      }
      onCredits(spendCreditsWatching(vipRate, creator));
      markWatchedOffline(item);
    }, 4000);
    return () => window.clearInterval(id);
  }, [tier, lockedPremium, locked, vipRate, item, creator, onCredits]);

  return (
    <li className={`immersive-feed__slide${locked ? " is-locked" : ""}`}>
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

      <SideRail item={item} />

      <div className="immersive-feed__copy">
        {item.author ? <span className="immersive-feed__author">@{creator}</span> : null}
        <strong className="immersive-feed__title">{item.title}</strong>
        {tier === "vip" ? (
          <span className="immersive-feed__credits">
            {vipRate} cr · {credits} left · 80% to creator
          </span>
        ) : null}
        {lockedPremium ? (
          <button
            type="button"
            className="los-btn los-btn--soft los-btn--sm"
            onClick={() => {
              setPremium(true);
              window.location.reload();
            }}
          >
            Go Premium
          </button>
        ) : null}
        {lockedVip ? (
          <button
            type="button"
            className="los-btn los-btn--soft los-btn--sm"
            onClick={() => onCredits(topUpLifeOsCredits(80))}
          >
            Buy credits
          </button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Full-viewport snap feed. Free: ads. Main: no ads. VIP: credits (80/20).
 */
export function ImmersiveMediaFeed({
  items,
  empty,
  gatePremium,
  mode = "post",
  leading,
  showAds = false,
}: {
  items: MediaItem[];
  empty: string;
  gatePremium?: boolean;
  mode?: "post" | "reels";
  leading?: ReactNode;
  showAds?: boolean;
}) {
  const premium = hasPremium();
  const [credits, setCredits] = useState(() => getLifeOsCredits());

  const rows = useMemo(() => {
    if (showAds) return withFreeKernelAds(items, 2);
    return items.map((item) => ({ type: "content" as const, item }));
  }, [items, showAds]);

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
      {leading ? <li className="immersive-feed__leading">{leading}</li> : null}
      {rows.map((row) =>
        row.type === "ad" ? (
          <AdSlide key={`ad-${row.ad.id}`} ad={row.ad} onSaved={() => undefined} />
        ) : (
          <ContentSlide
            key={row.item.id}
            item={row.item}
            lockedPremium={Boolean(gatePremium && resolveTier(row.item) === "premium" && !premium)}
            credits={credits}
            onCredits={setCredits}
          />
        ),
      )}
    </ul>
  );
}
