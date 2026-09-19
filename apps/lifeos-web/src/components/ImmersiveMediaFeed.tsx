import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import {
  activeIndexFromScroll,
  immersiveScrollBehavior,
  isEditableKeyboardTarget,
  nextFeedIndex,
  previousFeedIndex,
  resolveInitialIndex,
  shouldMountSlide,
  shouldRequestNextPage,
} from "../lib/immersiveFeedController";
import { useChromeVisibility } from "../context/ChromeVisibilityContext";

function isWritingItem(item: MediaItem): boolean {
  return item.kind === "post" && Boolean(item.detail) && !item.mediaUrl && !item.posterUrl;
}

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

function AdSlide({ ad, active, onSaved }: { ad: AdCreative; active: boolean; onSaved: () => void }) {
  const [saved, setSaved] = useState(() => isAdSaved(ad.id));
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (active) {
      el.muted = true;
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [active]);

  return (
    <li
      className="immersive-feed__slide immersive-feed__slide--overlay immersive-feed__slide--ad"
      data-active={active ? "true" : undefined}
      aria-hidden={!active}
    >
      <div className="immersive-feed__media" style={{ background: mediaTone(ad.id) }}>
        {ad.mediaUrl ? (
          <video
            ref={videoRef}
            className="immersive-feed__asset"
            src={ad.mediaUrl}
            poster={ad.posterUrl}
            muted
            playsInline
            loop
            preload={active ? "auto" : "metadata"}
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
  active,
  lockedPremium,
  credits,
  onCredits,
  overlayCaption,
}: {
  item: MediaItem;
  active: boolean;
  lockedPremium: boolean;
  credits: number;
  onCredits: (n: number) => void;
  overlayCaption: boolean;
}) {
  const tier = resolveTier(item);
  const vipRate = vipRateFor(item);
  const isVideo = item.kind === "video" || item.kind === "reel";
  const writing = isWritingItem(item);
  const lockedVip = tier === "vip" && credits <= 0;
  const locked = lockedPremium || lockedVip;
  const creator = creatorSlug(item.author);
  const [loved, setLoved] = useState(() => isLoved(item.id));
  const [comments, setComments] = useState(() => listComments(item.id));
  const [reuses, setReuses] = useState(() => getReuseCount(item.id));
  const [commentOpen, setCommentOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [readOpen, setReadOpen] = useState(false);
  const lastTap = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (locked) return;
    if (isVideo && active) markWatchedOffline(item);
  }, [item, isVideo, locked, active]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo || locked) return;
    if (active) {
      el.muted = true;
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [active, isVideo, locked, item.mediaUrl]);

  useEffect(() => {
    if (!active) setReadOpen(false);
  }, [active]);

  useEffect(() => {
    if (tier !== "vip" || lockedPremium || locked || !active) return;
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
  }, [tier, lockedPremium, locked, vipRate, item, creator, onCredits, active]);

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
      {item.detail ? (
        writing ? (
          <button
            type="button"
            className="immersive-feed__detail immersive-feed__detail--expand"
            onClick={() => setReadOpen(true)}
          >
            {item.detail}
          </button>
        ) : (
          <p className="immersive-feed__detail">{item.detail}</p>
        )
      ) : null}
      {writing ? (
        <button type="button" className="los-btn los-btn--ghost los-btn--sm" onClick={() => setReadOpen(true)}>
          Read
        </button>
      ) : null}
      {tier === "vip" ? (
        <span className="immersive-feed__credits">
          {vipRate} cr · {credits} left · 80% to creator
        </span>
      ) : null}
      {item.sourceUrl ? (
        <a
          className="los-btn los-btn--soft los-btn--sm immersive-feed__source"
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {item.sourceLabel || "Open source"}
        </a>
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
      }${writing ? " immersive-feed__slide--writing" : ""}`}
      data-active={active ? "true" : undefined}
      data-publication-id={item.id}
      aria-hidden={!active}
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
        {writing && !item.posterUrl && !item.mediaUrl ? (
          <div className="immersive-feed__writing" aria-hidden={!active}>
            <p>{item.detail || item.title}</p>
          </div>
        ) : item.posterUrl || item.mediaUrl ? (
          isVideo && item.mediaUrl && !locked ? (
            <video
              ref={videoRef}
              className="immersive-feed__asset"
              src={item.mediaUrl}
              poster={item.posterUrl}
              muted
              playsInline
              loop
              preload={active ? "auto" : "metadata"}
            />
          ) : (
            <img
              className="immersive-feed__asset"
              src={item.posterUrl || item.mediaUrl}
              alt=""
              loading={active ? "eager" : "lazy"}
            />
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

      {readOpen ? (
        <div className="engage-sheet immersive-feed__read-sheet" role="dialog" aria-label="Read">
          <div className="engage-sheet__panel">
            <header className="engage-sheet__head">
              <strong>{item.title}</strong>
              <button type="button" className="text-link" onClick={() => setReadOpen(false)}>
                Close
              </button>
            </header>
            <div className="immersive-feed__read-body">
              <p>{item.detail}</p>
            </div>
          </div>
        </div>
      ) : null}

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

type FeedRow =
  | { type: "content"; item: MediaItem; key: string }
  | { type: "ad"; ad: AdCreative; key: string };

export function ImmersiveMediaFeed({
  items,
  empty,
  gatePremium,
  mode = "post",
  leading,
  showAds = false,
  initialPublicationId,
  hasMore = false,
  onNearEnd,
}: {
  items: MediaItem[];
  empty: string;
  gatePremium?: boolean;
  mode?: "post" | "reels";
  leading?: ReactNode;
  showAds?: boolean;
  /** Deep-link: start with this canonical MediaItem.id as active. */
  initialPublicationId?: string | null;
  hasMore?: boolean;
  onNearEnd?: () => void;
}) {
  const premium = hasPremium();
  const [credits, setCredits] = useState(() => getLifeOsCredits());
  const listRef = useRef<HTMLUListElement>(null);
  const overlayCaption = true;
  const leadingOffset = leading ? 1 : 0;
  const { setChromeHidden } = useChromeVisibility();

  const rows = useMemo<FeedRow[]>(() => {
    if (showAds) {
      return withFreeKernelAds(items, 2).map((row) =>
        row.type === "ad"
          ? { type: "ad" as const, ad: row.ad, key: `ad-${row.ad.id}` }
          : { type: "content" as const, item: row.item, key: row.item.id },
      );
    }
    return items.map((item) => ({ type: "content" as const, item, key: item.id }));
  }, [items, showAds]);

  const contentIds = useMemo(
    () => rows.filter((r): r is Extract<FeedRow, { type: "content" }> => r.type === "content").map((r) => r.item.id),
    [rows],
  );

  const initialContentIndex = resolveInitialIndex(contentIds, initialPublicationId);
  const initialRowIndex = useMemo(() => {
    if (!initialPublicationId) return 0;
    const i = rows.findIndex((r) => r.type === "content" && r.item.id === initialPublicationId);
    return i >= 0 ? i : 0;
  }, [rows, initialPublicationId]);

  const [activeRowIndex, setActiveRowIndex] = useState(initialRowIndex);
  const activeRowIndexRef = useRef(activeRowIndex);
  activeRowIndexRef.current = activeRowIndex;
  const didInitScroll = useRef(false);
  const nearEndSent = useRef(false);

  const activePublicationId =
    rows[activeRowIndex]?.type === "content" ? rows[activeRowIndex].item.id : null;

  const snapToRow = useCallback(
    (rowIndex: number) => {
      const root = listRef.current;
      if (!root) return;
      const slides = root.querySelectorAll<HTMLElement>(".immersive-feed__slide");
      const target = slides[rowIndex];
      if (!target) return;
      root.scrollTo({ top: target.offsetTop, behavior: immersiveScrollBehavior() });
    },
    [],
  );

  useLayoutEffect(() => {
    if (didInitScroll.current) return;
    if (!initialPublicationId || initialRowIndex <= 0) {
      didInitScroll.current = true;
      return;
    }
    const root = listRef.current;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>(".immersive-feed__slide");
    const target = slides[initialRowIndex];
    if (target) {
      root.scrollTop = target.offsetTop;
      setActiveRowIndex(initialRowIndex);
      didInitScroll.current = true;
    }
  }, [initialPublicationId, initialRowIndex]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const h = root.clientHeight || 1;
        const next = activeIndexFromScroll(
          root.scrollTop,
          h,
          rows.length + leadingOffset,
          activeRowIndexRef.current + leadingOffset,
        );
        const contentIdx = Math.max(0, next - leadingOffset);
        if (contentIdx !== activeRowIndexRef.current && contentIdx < rows.length) {
          setActiveRowIndex(contentIdx);
        }
      });
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [rows.length, leadingOffset]);

  useEffect(() => {
    // Content mode once the feed owns a row past the landing slide.
    setChromeHidden(activeRowIndex >= 1);
    return () => setChromeHidden(false);
  }, [activeRowIndex, setChromeHidden]);

  useEffect(() => {
    if (!onNearEnd) return;
    if (shouldRequestNextPage(activeRowIndex, rows.length, hasMore)) {
      if (!nearEndSent.current) {
        nearEndSent.current = true;
        onNearEnd();
      }
    } else {
      nearEndSent.current = false;
    }
  }, [activeRowIndex, rows.length, hasMore, onNearEnd]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableKeyboardTarget(e.target)) return;
      const root = listRef.current;
      if (!root) return;
      const focusOk =
        root.contains(document.activeElement) ||
        document.activeElement === document.body ||
        root.matches(":focus-within");
      if (!focusOk) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        const next = nextFeedIndex(activeRowIndexRef.current, rows.length);
        setActiveRowIndex(next);
        snapToRow(next);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const prev = previousFeedIndex(activeRowIndexRef.current, rows.length);
        setActiveRowIndex(prev);
        snapToRow(prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows.length, snapToRow]);

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
      tabIndex={0}
      data-active-publication-id={activePublicationId ?? undefined}
      data-active-index={String(activeRowIndex)}
      data-initial-content-index={String(initialContentIndex)}
    >
      {leading ? <li className="immersive-feed__leading">{leading}</li> : null}
      {rows.map((row, index) => {
        const active = index === activeRowIndex;
        const mount = shouldMountSlide(index, activeRowIndex, rows.length);
        if (!mount) {
          return (
            <li
              key={row.key}
              className="immersive-feed__slide immersive-feed__slide--placeholder"
              aria-hidden
              data-index={index}
            />
          );
        }
        if (row.type === "ad") {
          return <AdSlide key={row.key} ad={row.ad} active={active} onSaved={() => undefined} />;
        }
        return (
          <ContentSlide
            key={row.key}
            item={row.item}
            active={active}
            lockedPremium={Boolean(gatePremium && resolveTier(row.item) === "premium" && !premium)}
            credits={credits}
            onCredits={setCredits}
            overlayCaption={overlayCaption}
          />
        );
      })}
    </ul>
  );
}
