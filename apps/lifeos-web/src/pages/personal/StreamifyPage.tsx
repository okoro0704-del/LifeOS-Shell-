import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { MediaFeed } from "../../components/MediaFeed";
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

function Shell({ active, children }: { active: string; children: ReactNode }) {
  const kernel = useKernel();
  const navigate = useNavigate();
  const base = `${personalNavBase(kernel)}/streamify`;
  const home = `${personalNavBase(kernel)}/post`;
  const [scrolled, setScrolled] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { to: base, label: "Content", id: "content" },
    { to: `${base}/music`, label: "Music", id: "music" },
    { to: `${base}/podcast`, label: "Podcast", id: "podcast" },
    { to: `${base}/videos`, label: "Videos", id: "videos" },
    { to: `${base}/search`, label: "Search", id: "search" },
  ];

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 36);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [active]);

  return (
    <div className={`page personal-page personal-page--surface${scrolled ? " is-scrolled" : ""}`}>
      <nav className={`segment-topbar segment-topbar--glass${scrolled ? " is-pinned" : ""}`} aria-label="Streamify">
        {scrolled ? (
          <button type="button" className="segment-topbar__back" aria-label="Back" onClick={() => navigate(home)}>
            ←
          </button>
        ) : null}
        {tabs.map((t) => (
          <a
            key={t.id}
            href={t.to}
            className={`segment-topbar__tab${active === t.id ? " is-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(t.to);
            }}
          >
            {t.label}
          </a>
        ))}
      </nav>
      <div className="surface-scroll" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

export function StreamifyContentPage() {
  const kernel = useKernel();
  return (
    <Shell active="content">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["video", "music", "podcast", "reel", "info"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </Shell>
  );
}

export function StreamifyMusicPage() {
  const kernel = useKernel();
  return (
    <Shell active="music">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["music"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
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
    <Shell active="videos">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["video"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function StreamifySearchPage() {
  const kernel = useKernel();
  const [q, setQ] = useState("");
  const pool = filterKernel(kernel, catalogByKinds(["video", "music", "podcast", "reel"]));
  const hits = q.trim()
    ? pool.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()))
    : pool.slice(0, 10);

  return (
    <Shell active="search">
      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Streamify…"
        aria-label="Search Streamify"
      />
      <MediaFeed items={hits} empty="No matches." gatePremium={kernel === "main"} />
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
