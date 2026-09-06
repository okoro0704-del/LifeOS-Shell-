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
  const base = `${personalNavBase(kernel)}/streamify`;
  const tabs = [
    { to: base, end: true, label: "Content" },
    { to: `${base}/music`, label: "Music" },
    { to: `${base}/podcast`, label: "Podcast" },
    { to: `${base}/videos`, label: "Videos" },
  ];
  return (
    <div className="page personal-page">
      <SegmentTopBar tabs={tabs} ariaLabel="Streamify" />
      <header className="page-header page-header--compact">
        <h1>{title}</h1>
      </header>
      {children}
    </div>
  );
}

export function StreamifyContentPage() {
  const kernel = useKernel();
  return (
    <Shell title="Content">
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
    <Shell title="Music">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["music"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </Shell>
  );
}

export function StreamifyPodcastPage() {
  const kernel = useKernel();
  return (
    <Shell title="Podcast">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["podcast"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </Shell>
  );
}

export function StreamifyVideosPage() {
  const kernel = useKernel();
  return (
    <Shell title="Videos">
      <MediaFeed
        items={filterKernel(kernel, catalogByKinds(["video"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
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
