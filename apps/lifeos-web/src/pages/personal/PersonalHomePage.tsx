import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { SegmentTopBar } from "../../components/SegmentTopBar";
import { MediaFeed, PremiumHint } from "../../components/MediaFeed";
import { catalogByKinds } from "../../lib/personalCatalog";

const HOME_TABS = [
  { to: "/app/personal/post", end: true, label: "Post" },
  { to: "/app/personal/reels", label: "Reels" },
  { to: "/app/personal/communities", label: "Communities" },
] as const;

function HomeShell({ children }: { children: ReactNode }) {
  return (
    <div className="page personal-page">
      <SegmentTopBar tabs={[...HOME_TABS]} ariaLabel="Home sections" />
      <PremiumHint />
      {children}
    </div>
  );
}

/** Default Home landing — Post (free videos + picture posts). */
export function PersonalHomePage() {
  return <Navigate to="/app/personal/post" replace />;
}

export function PersonalPostPage() {
  const items = catalogByKinds(["picture", "video", "post"]).filter(
    (i) => i.kind === "picture" || i.free || i.kind === "post",
  );
  return (
    <HomeShell>
      <header className="page-header page-header--compact">
        <h1>Post</h1>
        <p className="muted">Free videos and picture posts from creators.</p>
      </header>
      <MediaFeed items={items} empty="No posts yet." gatePremium />
    </HomeShell>
  );
}

export function PersonalReelsPage() {
  return (
    <HomeShell>
      <header className="page-header page-header--compact">
        <h1>Reels</h1>
        <p className="muted">Short vertical clips. Premium reels need a subscription on Main.</p>
      </header>
      <MediaFeed items={catalogByKinds(["reel"])} empty="No reels yet." gatePremium />
    </HomeShell>
  );
}

export function PersonalCommunitiesPage() {
  return (
    <HomeShell>
      <header className="page-header page-header--compact">
        <h1>Communities</h1>
        <p className="muted">Groups and spaces you belong to.</p>
      </header>
      <ul className="media-feed">
        <li className="media-feed__item">
          <strong>Lagos Creators</strong>
          <span className="muted small">12.4k members · posts & meetups</span>
        </li>
        <li className="media-feed__item">
          <strong>LearnVerse Readers</strong>
          <span className="muted small">Book clubs and study circles</span>
        </li>
        <li className="media-feed__item">
          <strong>Streamify Night Owls</strong>
          <span className="muted small">Live watch parties</span>
        </li>
      </ul>
    </HomeShell>
  );
}
