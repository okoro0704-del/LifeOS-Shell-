import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { MediaFeed } from "../../components/MediaFeed";
import { SegmentGlassBar } from "../../components/SegmentGlassBar";
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

function Shell({ active, children }: { active: string; children: ReactNode }) {
  const kernel = useKernel();
  const base = `${personalNavBase(kernel)}/learnverse`;
  const home = `${personalNavBase(kernel)}/post`;
  const [scrolled, setScrolled] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { to: base, end: true, label: "Books", id: "books" },
    { to: `${base}/courses`, label: "Courses", id: "courses" },
    { to: `${base}/edu`, label: "Edu", id: "edu" },
    { to: `${base}/schools`, label: "Schools", id: "schools" },
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
      <KernelBrandBar kernel={kernel} hidden={scrolled} />
      <SegmentGlassBar
        tabs={tabs}
        activeId={active}
        scrolled={scrolled}
        showBack
        searchTo={`${base}/search`}
        backTo={home}
        ariaLabel="LearnVerse"
      />
      <div className="surface-scroll" ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

export function LearnVerseBooksPage() {
  const kernel = useKernel();
  return (
    <Shell active="books">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["book"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseCoursesPage() {
  const kernel = useKernel();
  return (
    <Shell active="courses">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["course"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseEduPage() {
  const kernel = useKernel();
  return (
    <Shell active="edu">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["edu"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseSchoolsPage() {
  const kernel = useKernel();
  return (
    <Shell active="schools">
      <MediaFeed items={filterKernel(kernel, catalogByKinds(["school"]))} empty="Nothing here yet." gatePremium={kernel === "main"} />
    </Shell>
  );
}

export function LearnVerseSearchPage() {
  const kernel = useKernel();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const pool = filterKernel(kernel, catalogByKinds(["book", "course", "edu", "school"]));
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
          aria-label="Search LearnVerse"
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
