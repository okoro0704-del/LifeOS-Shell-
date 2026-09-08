import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { MediaFeed } from "../../components/MediaFeed";
import { ImmersiveMediaFeed } from "../../components/ImmersiveMediaFeed";
import { SegmentGlassBar } from "../../components/SegmentGlassBar";
import { useChromeVisibility } from "../../context/ChromeVisibilityContext";
import { KernelBrandBar } from "./PersonalHomePage";
import { catalogByKinds, type MediaItem } from "../../lib/personalCatalog";
import { personalKernelFromPath, personalNavBase, type PersonalKernel } from "../../components/shell/nav";
import { applyWatchedOffline } from "../../lib/personalMonetization";

function filterKernel(kernel: PersonalKernel, items: MediaItem[]) {
  applyWatchedOffline();
  if (kernel === "free") return items.filter((i) => i.free);
  if (kernel === "offline") return items.filter((i) => i.ownedOrConsumed);
  return items;
}

function useKernel(): PersonalKernel {
  return personalKernelFromPath(useLocation().pathname) ?? "main";
}

const MUSIC_CATEGORIES = ["Afrobeats", "Gospel", "Jazz", "Hip-Hop", "Indie", "Worship"];

function Shell({
  active,
  children,
  immersive = false,
}: {
  active: string;
  children: ReactNode;
  immersive?: boolean;
}) {
  const kernel = useKernel();
  const base = `${personalNavBase(kernel)}/streamify`;
  const home = `${personalNavBase(kernel)}/post`;
  const { chromeHidden, reportScroll } = useChromeVisibility();
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevY = useRef(0);

  const tabs = [
    { to: base, end: true, label: "Watch", id: "content" },
    { to: `${base}/music`, label: "Music", id: "music" },
    { to: `${base}/podcast`, label: "Podcast", id: "podcast" },
    { to: `${base}/videos`, label: "Cinema", id: "videos" },
  ];

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    prevY.current = 0;
    const onScroll = () => {
      const feed = el.querySelector(".immersive-feed") as HTMLElement | null;
      const y = (feed ?? el).scrollTop;
      reportScroll(y, prevY.current);
      prevY.current = y;
    };
    const feed = el.querySelector(".immersive-feed");
    const target = (feed as HTMLElement | null) ?? el;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [active, reportScroll]);

  return (
    <div
      className={`page personal-page personal-page--surface${immersive ? " personal-page--immersive" : ""}${
        chromeHidden ? " is-scrolled is-chrome-hidden" : ""
      }`}
    >
      <KernelBrandBar kernel={kernel} hidden={chromeHidden} />
      <SegmentGlassBar
        tabs={tabs}
        activeId={active}
        scrolled={chromeHidden}
        showBack
        searchTo={`${base}/search`}
        backTo={home}
        ariaLabel="Streamify"
      />
      <div className={immersive ? "kernel-scroll" : "surface-scroll"} ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

export function StreamifyContentPage() {
  const kernel = useKernel();
  return (
    <Shell active="content" immersive>
      <ImmersiveMediaFeed
        items={filterKernel(kernel, catalogByKinds(["video", "reel"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
        mode="reels"
        showAds={kernel === "free"}
      />
    </Shell>
  );
}

export function StreamifyMusicPage() {
  const kernel = useKernel();
  const [cat, setCat] = useState("All");
  const pool = filterKernel(kernel, catalogByKinds(["music"]));
  const trending = pool.filter((i) => i.trending).slice(0, 6);
  const list =
    cat === "All"
      ? pool
      : pool.filter((i) => i.detail.toLowerCase().includes(cat.toLowerCase()) || i.title.toLowerCase().includes(cat.toLowerCase()));

  return (
    <Shell active="music">
      <section className="streamify-block" aria-label="Trending music">
        <h2 className="streamify-block__title">Trending</h2>
        <ul className="media-feed">
          {(trending.length ? trending : pool.slice(0, 4)).map((i) => (
            <li key={i.id} className="media-feed__item">
              <span className="media-feed__badge media-feed__badge--trend">Trending</span>
              <strong>{i.title}</strong>
              <span className="muted small">{i.author ? `@${i.author}` : i.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="streamify-block" aria-label="Categories">
        <h2 className="streamify-block__title">Categories</h2>
        <div className="services-explore__filters" role="tablist" aria-label="Music categories">
          {["All", ...MUSIC_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              className={`services-explore__chip${cat === c ? " active" : ""}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <MediaFeed items={list} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function StreamifyPodcastPage() {
  const kernel = useKernel();
  return (
    <Shell active="podcast">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["podcast"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function StreamifyVideosPage() {
  const kernel = useKernel();
  return (
    <Shell active="videos" immersive>
      <ImmersiveMediaFeed
        items={filterKernel(kernel, catalogByKinds(["video"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
        mode="reels"
        showAds={kernel === "free"}
      />
    </Shell>
  );
}

export function StreamifySearchPage() {
  const kernel = useKernel();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const pool = filterKernel(kernel, catalogByKinds(["video", "music", "podcast", "reel"]));
  const hits = submitted
    ? pool.filter((i) => i.title.toLowerCase().includes(submitted.toLowerCase()))
    : [];

  return (
    <Shell active="search">
      <form
        className="surface-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <input
          className="surface-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value.trim()) setSubmitted("");
          }}
          placeholder="Search…"
          aria-label="Search Streamify"
          autoFocus
        />
      </form>
      {submitted ? (
        <MediaFeed items={hits} empty="No matches." gatePremium={kernel === "main"} />
      ) : (
        <p className="muted small">Type a query and press Enter.</p>
      )}
    </Shell>
  );
}

export function StreamifyRoutes() {
  return (
    <Routes>
      <Route index element={<StreamifyContentPage />} />
      <Route path="music" element={<StreamifyMusicPage />} />
      <Route path="podcast" element={<StreamifyPodcastPage />} />
      <Route path="videos" element={<StreamifyVideosPage />} />
      <Route path="search" element={<StreamifySearchPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
