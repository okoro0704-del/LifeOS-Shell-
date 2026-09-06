import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SegmentTopBar } from "../../components/SegmentTopBar";
import { MediaFeed, PremiumHint } from "../../components/MediaFeed";
import { catalogByKinds } from "../../lib/personalCatalog";

const TABS = [
  { to: "/app/personal/streamify", end: true, label: "Content" },
  { to: "/app/personal/streamify/music", label: "Music" },
  { to: "/app/personal/streamify/podcast", label: "Podcast" },
  { to: "/app/personal/streamify/videos", label: "Videos" },
];

function Shell({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <div className="page personal-page">
      <SegmentTopBar tabs={TABS} ariaLabel="Streamify" />
      <PremiumHint />
      <header className="page-header page-header--compact">
        <h1>{title}</h1>
        <p className="muted">{detail}</p>
      </header>
      {children}
    </div>
  );
}

export function StreamifyContentPage() {
  const items = catalogByKinds(["video", "music", "podcast", "reel", "info"]);
  return (
    <Shell title="Content" detail="Mixed Streamify feed — Premium unlocks full play on Main.">
      <MediaFeed items={items} empty="No content yet." gatePremium />
    </Shell>
  );
}

export function StreamifyMusicPage() {
  return (
    <Shell title="Music" detail="Albums and singles. Premium required to listen on Main.">
      <MediaFeed items={catalogByKinds(["music"])} empty="No music yet." gatePremium />
    </Shell>
  );
}

export function StreamifyPodcastPage() {
  return (
    <Shell title="Podcast" detail="Shows and episodes.">
      <MediaFeed items={catalogByKinds(["podcast"])} empty="No podcasts yet." gatePremium />
    </Shell>
  );
}

export function StreamifyVideosPage() {
  return (
    <Shell title="Videos" detail="Long-form and cinema-style streams.">
      <MediaFeed items={catalogByKinds(["video"])} empty="No videos yet." gatePremium />
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
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
}
