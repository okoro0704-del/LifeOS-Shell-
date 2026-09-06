import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SegmentTopBar } from "../../components/SegmentTopBar";
import { MediaFeed } from "../../components/MediaFeed";
import { catalogByKinds, type MediaItem } from "../../lib/personalCatalog";
import { personalKernelFromPath, personalNavBase, type PersonalKernel } from "../../components/shell/nav";

function filterKernel(kernel: PersonalKernel, items: MediaItem[]) {
  if (kernel === "free") return items.filter((i) => i.free);
  if (kernel === "offline") return items.filter((i) => i.ownedOrConsumed);
  return items;
}

function useKernel(): PersonalKernel {
  return personalKernelFromPath(useLocation().pathname) ?? "main";
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  const kernel = useKernel();
  const base = `${personalNavBase(kernel)}/learnverse`;
  const tabs = [
    { to: base, end: true, label: "Books" },
    { to: `${base}/courses`, label: "Courses" },
    { to: `${base}/edu`, label: "Edu" },
    { to: `${base}/schools`, label: "Schools" },
  ];
  return (
    <div className="page personal-page">
      <SegmentTopBar tabs={tabs} ariaLabel="LearnVerse" />
      <header className="page-header page-header--compact">
        <h1>{title}</h1>
      </header>
      {children}
    </div>
  );
}

export function LearnVerseBooksPage() {
  const kernel = useKernel();
  return (
    <Shell title="Books">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["book"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </Shell>
  );
}

export function LearnVerseCoursesPage() {
  const kernel = useKernel();
  return (
    <Shell title="Courses">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["course"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </Shell>
  );
}

export function LearnVerseEduPage() {
  const kernel = useKernel();
  return (
    <Shell title="Edu">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["edu"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </Shell>
  );
}

export function LearnVerseSchoolsPage() {
  const kernel = useKernel();
  return (
    <Shell title="Schools">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["school"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
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
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
