import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { hasPremium, setPremium, type MediaItem } from "../lib/personalCatalog";
import {
  getLifeOsCredits,
  isAdSaved,
  resolveTier,
  saveAdToOffline,
  spendLifeOsCredits,
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

function TierBadge({ item }: { item: MediaItem }) {
  const tier = resolveTier(item);
  if (tier === "vip") return <span className="media-feed__badge media-feed__badge--vip">VIP</span>;
  if (tier === "premium") return <span className="media-feed__badge media-feed__badge--pro">Premium</span>;
  return <span className="media-feed__badge">Free</span>;
}

function AdSlide({
  ad,
  onSaved,
}: {
  ad: AdCreative;
  onSaved: () => void;
}) {
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
        <div className="immersive-feed__meta">
          <span className="media-feed__badge media-feed__badge--ad">Ad</span>
          <span className="immersive-feed__kind">Free kernel</span>
        </div>
        <span className="immersive-feed__author">{ad.advertiser}</span>
        <strong className="immersive-feed__title">{ad.title}</strong>
        <p className="immersive-feed__detail">{ad.detail}</p>
        {ad.creatorShare ? <span className="immersive-feed__likes">{ad.creatorShare}</span> : null}
        <div className="immersive-feed__ad-actions">
          <button type="button" className="los-btn los-btn--soft los-btn--sm">
            {ad.cta}
          </button>
          <button
            type="button"
            className="los-btn los-btn--ghost los-btn--sm"
            disabled={saved}
            onClick={() => {
              if (saveAdToOffline(ad)) {
                setSaved(true);
                onSaved();
              } else {
                setSaved(true);
              }
            }}
          >
            {saved ? "Saved to Offline" : "Save to Offline"}
          </button>
        </div>
      </div>
      <div className="immersive-feed__engage immersive-feed__engage--ad" aria-label="Ad notice">
        <span className="muted small">Ads only run in Free. Main has no ads.</span>
      </div>
    </li>
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

  useEffect(() => {
    if (tier !== "vip" || lockedPremium) return;
    const id = window.setInterval(() => {
      const bal = getLifeOsCredits();
      if (bal <= 0) {
        onCredits(0);
        return;
      }
      onCredits(spendLifeOsCredits(vipRate));
    }, 4000);
    return () => window.clearInterval(id);
  }, [tier, lockedPremium, vipRate, item.id, onCredits]);

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

      <div className="immersive-feed__copy">
        <div className="immersive-feed__meta">
          <span className="immersive-feed__kind">{item.kind}</span>
          <TierBadge item={item} />
          {item.trending ? <span className="media-feed__badge media-feed__badge--trend">Trending</span> : null}
        </div>
        {item.author ? <span className="immersive-feed__author">@{item.author}</span> : null}
        <strong className="immersive-feed__title">{item.title}</strong>
        <p className="immersive-feed__detail">{item.detail}</p>
        {item.likes ? <span className="immersive-feed__likes">{item.likes} likes</span> : null}
        {tier === "vip" ? (
          <span className="immersive-feed__credits">
            VIP · {vipRate} credits / tick · balance {credits}
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
            Subscribe to Premium to play
          </button>
        ) : null}
        {lockedVip ? (
          <button
            type="button"
            className="los-btn los-btn--soft los-btn--sm"
            onClick={() => onCredits(topUpLifeOsCredits(80))}
          >
            Top up LifeOS credits
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
}

/**
 * Full-viewport snap feed for Post and Reels.
 * Free kernel: ads interrupt. Main: never ads. VIP: credits drain.
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
  /** Only Free kernel — Main must never pass true */
  showAds?: boolean;
}) {
  const premium = hasPremium();
  const [credits, setCredits] = useState(() => getLifeOsCredits());
  const [savedNote, setSavedNote] = useState(false);

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
    <>
      {showAds ? (
        <p className="immersive-feed__ad-banner muted small" role="status">
          Free kernel runs ads. Creators earn from ads here.{" "}
          <Link to="/app/personal/premium">Go Premium</Link> for Main with no ads.
        </p>
      ) : null}
      {savedNote ? (
        <p className="immersive-feed__ad-banner immersive-feed__ad-banner--ok muted small" role="status">
          Ad saved to Offline.
        </p>
      ) : null}
      <ul className={`immersive-feed immersive-feed--${mode}`} aria-label={mode === "reels" ? "Reels" : "Posts"}>
        {leading ? (
          <li className="immersive-feed__leading" aria-hidden={false}>
            {leading}
          </li>
        ) : null}
        {rows.map((row) =>
          row.type === "ad" ? (
            <AdSlide
              key={`ad-${row.ad.id}-${row.ad.title}`}
              ad={row.ad}
              onSaved={() => setSavedNote(true)}
            />
          ) : (
            <ContentSlide
              key={row.item.id}
              item={row.item}
              lockedPremium={Boolean(
                gatePremium && resolveTier(row.item) === "premium" && !premium,
              )}
              credits={credits}
              onCredits={setCredits}
            />
          ),
        )}
      </ul>
    </>
  );
}
