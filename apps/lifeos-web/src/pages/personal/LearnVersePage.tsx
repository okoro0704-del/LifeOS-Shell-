import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { MediaFeed } from "../../components/MediaFeed";
import { ElComFloat } from "../../components/ElComFloat";
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

function Shell({
  title: _title,
  active,
  children,
}: {
  title: string;
  active: string;
  children: ReactNode;
}) {
  const kernel = useKernel();
  const navigate = useNavigate();
  const base = `${personalNavBase(kernel)}/learnverse`;
  const home = `${personalNavBase(kernel)}/post`;
  const [scrolled, setScrolled] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { to: base, end: true, label: "Books", id: "books" },
    { to: `${base}/courses`, label: "Courses", id: "courses" },
    { to: `${base}/edu`, label: "Edu", id: "edu" },
    { to: `${base}/schools`, label: "Schools", id: "schools" },
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
      <nav className={`segment-topbar segment-topbar--glass${scrolled ? " is-pinned" : ""}`} aria-label="LearnVerse">
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
      <ElComFloat />
    </div>
  );
}

export function LearnVerseBooksPage() {
  const kernel = useKernel();
  return (
    <Shell title="Books" active="books">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["book"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseCoursesPage() {
  const kernel = useKernel();
  return (
    <Shell title="Courses" active="courses">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["course"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseEduPage() {
  const kernel = useKernel();
  return (
    <Shell title="Edu" active="edu">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["edu"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseSchoolsPage() {
  const kernel = useKernel();
  return (
    <Shell title="Schools" active="schools">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["school"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseSearchPage() {
  const kernel = useKernel();
  const [q, setQ] = useState("");
  const pool = filterKernel(
    kernel,
    catalogByKinds(["book", "course", "edu", "school"]),
  );
  const hits = q.trim()
    ? pool.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()))
    : pool.slice(0, 10);

  return (
    <Shell title="Search" active="search">
      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search LearnVerse…"
        aria-label="Search LearnVerse"
      />
      <MediaFeed items={hits} empty="No matches." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseRoutes() {
  return (
    <Routes>
      <Route index element={<LearnVerseBooksPage />} />
      <Route path="courses" element={<LearnVerseCoursesPage />} />
      <Route path="edu" element={<LearnVerseEduPage />} />
      <Route path="schools" element={<LearnVerseSchoolsPage />} />
      <Route path="search" element={<LearnVerseSearchPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
