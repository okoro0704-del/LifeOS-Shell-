import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SegmentTopBar } from "../../components/SegmentTopBar";
import { MediaFeed, PremiumHint } from "../../components/MediaFeed";
import { catalogByKinds } from "../../lib/personalCatalog";

const TABS = [
  { to: "/app/personal/learnverse", end: true, label: "Books" },
  { to: "/app/personal/learnverse/courses", label: "Courses" },
  { to: "/app/personal/learnverse/edu", label: "Edu" },
  { to: "/app/personal/learnverse/schools", label: "Schools" },
];

function Shell({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <div className="page personal-page">
      <SegmentTopBar tabs={TABS} ariaLabel="LearnVerse" />
      <PremiumHint />
      <header className="page-header page-header--compact">
        <h1>{title}</h1>
        <p className="muted">{detail}</p>
      </header>
      {children}
    </div>
  );
}

export function LearnVerseBooksPage() {
  return (
    <Shell title="Books" detail="Handbooks, novels, and creator publications.">
      <MediaFeed items={catalogByKinds(["book"])} empty="No books yet." gatePremium />
    </Shell>
  );
}

export function LearnVerseCoursesPage() {
  return (
    <Shell title="Courses" detail="General learning tracks and creator courses.">
      <MediaFeed items={catalogByKinds(["course"])} empty="No courses yet." gatePremium />
    </Shell>
  );
}

export function LearnVerseEduPage() {
  return (
    <Shell
      title="Edu"
      detail="Specialized higher and secondary school programmes — not general learning courses."
    >
      <MediaFeed items={catalogByKinds(["edu"])} empty="No Edu programmes yet." gatePremium />
    </Shell>
  );
}

export function LearnVerseSchoolsPage() {
  return (
    <Shell title="Schools" detail="Academies and partner institutions.">
      <MediaFeed items={catalogByKinds(["school"])} empty="No schools yet." gatePremium />
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
