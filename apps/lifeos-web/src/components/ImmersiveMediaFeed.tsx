import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { hasPremium, setPremium, type MediaItem } from "../lib/personalCatalog";
import { openCreatorApp } from "../lib/mybrandOS";
import {
  addComment,
  getReuseCount,
  isLoved,
  listComments,
  markReused,
  shareItem,
  toggleLove,
} from "../lib/engage";
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
    <li className="immersive-feed__slide immersive-feed__slide--overlay immersive-feed__slide--ad">
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
        <div className="immersive-feed__copy immersive-feed__copy--on">
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
      </div>
    </li>
  );
}

function RailIcon({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  );
}

function SideRail({
  loved,
  commentCount,
  reuseCount,
  onLove,
  onComment,
  onReuse,
  onShare,
  onOpenCreator,
  initial,
  slug,
}: {
  loved: boolean;
  commentCount: number;
  reuseCount: number;
  onLove: () => void;
  onComment: () => void;
  onReuse: () => void;
  onShare: () => void;
  onOpenCreator: () => void;
  initial: string;
  slug: string;
}) {
  return (
    <aside className="immersive-feed__rail" aria-label="Actions">
      <button type="button" className="immersive-feed__avatar" aria-label={`Open ${slug}`} onClick={onOpenCreator}>
        {initial}
      </button>
      <button
        type="button"
        className={`immersive-feed__rail-btn immersive-feed__rail-btn--love${loved ? " is-on" : ""}`}
        aria-label="Love"
        aria-pressed={loved}
        onClick={onLove}
      >
        <RailIcon>
          <path
            d="M12 20.5s-7.2-4.35-9.2-8.2C1.2 9.4 2.4 6.2 5.4 5.4c1.7-.45 3.5.15 4.6 1.5 1.1-1.35 2.9-1.95 4.6-1.5 3 .8 4.2 4 2.6 7-2 3.85-9.2 8.1-9.2 8.1z"
            fill="currentColor"
            stroke="none"
          />
        </RailIcon>
      </button>
      <button type="button" className="immersive-feed__rail-btn" aria-label="Comment" onClick={onComment}>
        <RailIcon>
          <path
            d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v8a1.5 1.5 0 0 1-1.5 1.5H13l-4 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </RailIcon>
        {commentCount > 0 ? <span className="immersive-feed__rail-count">{commentCount}</span> : null}
      </button>
      <button type="button" className="immersive-feed__rail-btn" aria-label="Reuse" onClick={onReuse}>
        <RailIcon>
          <path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </RailIcon>
        {reuseCount > 0 ? <span className="immersive-feed__rail-count">{reuseCount}</span> : null}
      </button>
      <button type="button" className="immersive-feed__rail-btn" aria-label="Share" onClick={onShare}>
        <RailIcon>
          <circle cx="18" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="18" cy="19" r="2.4" stroke="currentColor" strokeWidth="1.75" />
          <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" stroke="currentColor" strokeWidth="1.75" />
        </RailIcon>
      </button>
    </aside>
  );
}

function ContentSlide({
  item,
  lockedPremium,
  credits,
  onCredits,
  overlayCaption,
}: {
  item: MediaItem;
  lockedPremium: boolean;
  credits: number;
  onCredits: (n: number) => void;
  overlayCaption: boolean;
}) {
  const tier = resolveTier(item);
  const vipRate = vipRateFor(item);
  const isVideo = item.kind === "video" || item.kind === "reel";
  const lockedVip = tier === "vip" && credits <= 0;
  const locked = lockedPremium || lockedVip;
  const creator = creatorSlug(item.author);
  const [loved, setLoved] = useState(() => isLoved(item.id));
  const [comments, setComments] = useState(() => listComments(item.id));
  const [reuses, setReuses] = useState(() => getReuseCount(item.id));
  const [commentOpen, setCommentOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const lastTap = useRef(0);

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

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }

  function love() {
    setLoved(toggleLove(item.id));
  }

  function onMediaActivate() {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      love();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
  }

  const caption = (
    <>
      {item.author ? (
        <button type="button" className="immersive-feed__author-btn" onClick={() => openCreatorApp(creator)}>
          @{creator}
        </button>
      ) : null}
      <strong className="immersive-feed__title">{item.title}</strong>
      {item.detail ? <p className="immersive-feed__detail">{item.detail}</p> : null}
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
        <button type="button" className="los-btn los-btn--soft los-btn--sm" onClick={() => onCredits(topUpLifeOsCredits(80))}>
          Buy credits
        </button>
      ) : null}
    </>
  );

  return (
    <li
      className={`immersive-feed__slide${overlayCaption ? " immersive-feed__slide--overlay" : " immersive-feed__slide--split"}${
        locked ? " is-locked" : ""
      }`}
    >
      <div
        className="immersive-feed__media"
        style={{ background: mediaTone(item.id) }}
        onClick={onMediaActivate}
        onDoubleClick={(e) => {
          e.preventDefault();
          love();
        }}
        role="presentation"
      >
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
            <img className="immersive-feed__asset" src={item.posterUrl || item.mediaUrl} alt="" loading="lazy" />
          )
        ) : null}
        {overlayCaption ? <div className="immersive-feed__scrim" aria-hidden /> : null}
        <SideRail
          loved={loved}
          commentCount={comments.length}
          reuseCount={reuses}
          initial={(item.author || "C").replace(/^@/, "").slice(0, 1).toUpperCase()}
          slug={creator}
          onOpenCreator={() => openCreatorApp(creator)}
          onLove={love}
          onComment={() => setCommentOpen(true)}
          onReuse={() => {
            setReuses(markReused(item.id));
            flash("Reused to your drafts");
          }}
          onShare={() => {
            void shareItem({ title: item.title, text: item.detail || item.title }).then((r) => {
              flash(r === "shared" ? "Shared" : r === "copied" ? "Link copied" : "Couldn't share");
            });
          }}
        />
        {overlayCaption ? <div className="immersive-feed__copy immersive-feed__copy--on">{caption}</div> : null}
        {toast ? (
          <div className="immersive-feed__toast" role="status">
            {toast}
          </div>
        ) : null}
      </div>

      {!overlayCaption ? <div className="immersive-feed__meta-block">{caption}</div> : null}

      {commentOpen ? (
        <div className="engage-sheet" role="dialog" aria-label="Comments">
          <div className="engage-sheet__panel">
            <header className="engage-sheet__head">
              <strong>Comments</strong>
              <button type="button" className="text-link" onClick={() => setCommentOpen(false)}>
                Close
              </button>
            </header>
            <ul className="engage-sheet__list">
              {comments.length === 0 ? (
                <li className="muted small">Be the first to comment.</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id}>
                    <strong>You</strong>
                    <span>{c.text}</span>
                  </li>
                ))
              )}
            </ul>
            <form
              className="engage-sheet__form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                setComments(addComment(item.id, draft));
                setDraft("");
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                aria-label="Add a comment"
              />
              <button type="submit" className="los-btn los-btn--soft los-btn--sm">
                Post
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </li>
  );
}

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
  const listRef = useRef<HTMLUListElement>(null);
  const overlayCaption = true;

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
    <ul
      ref={listRef}
      className={`immersive-feed immersive-feed--${mode}`}
      aria-label={mode === "reels" ? "Reels" : "Posts"}
    >
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
            overlayCaption={overlayCaption}
          />
        ),
      )}
    </ul>
  );
}
