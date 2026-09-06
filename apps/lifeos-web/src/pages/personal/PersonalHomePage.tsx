import type { ReactNode } from "react";
import { Link, NavLink, Navigate } from "react-router-dom";
import { MediaFeed, PremiumHint } from "../../components/MediaFeed";
import {
  catalogByKinds,
  type MediaItem,
} from "../../lib/personalCatalog";
import type { PersonalKernel } from "../../components/shell/nav";

export type HomeSection = "post" | "reels" | "connects" | "communities";

const SECTIONS: { id: HomeSection; label: string }[] = [
  { id: "post", label: "Post" },
  { id: "reels", label: "Reels" },
  { id: "connects", label: "Connects" },
  { id: "communities", label: "Communities" },
];

function basePath(kernel: PersonalKernel): string {
  if (kernel === "free") return "/app/personal/free";
  if (kernel === "offline") return "/app/personal/offline";
  return "/app/personal";
}

function filterForKernel(kernel: PersonalKernel, items: MediaItem[]): MediaItem[] {
  if (kernel === "free") return items.filter((i) => i.free);
  if (kernel === "offline") return items.filter((i) => i.ownedOrConsumed);
  return items;
}

function kernelCaption(kernel: PersonalKernel): string {
  if (kernel === "free") return "Creator-free content only — no Premium required.";
  if (kernel === "offline") return "Bought or already consumed — yours offline.";
  return "Main · Premium unlocks full play on paid streams.";
}

/**
 * Shared Personal home chrome: centered LifeOS + Post / Reels / Connects / Communities.
 * Free & Offline kernels mirror this UI with an Exit back to Main.
 */
export function PersonalKernelShell({
  kernel,
  section,
  children,
}: {
  kernel: PersonalKernel;
  section: HomeSection;
  children: ReactNode;
}) {
  const base = basePath(kernel);
  return (
    <div className={`page personal-page personal-page--kernel personal-page--${kernel}`}>
      {kernel !== "main" ? (
        <div className="personal-kernel-exit-row">
          <Link to="/app/personal/post" className="personal-kernel-exit" aria-label="Exit to Main">
            ← Exit
          </Link>
        </div>
      ) : null}

      <header className="personal-brand-hero">
        <p className="personal-brand-hero__mark">LifeOS</p>
        <p className="personal-brand-hero__sub muted small">{kernelCaption(kernel)}</p>
      </header>

      <nav className="segment-topbar segment-topbar--home" aria-label="Home sections">
        {SECTIONS.map((s) => (
          <NavLink
            key={s.id}
            to={`${base}/${s.id}`}
            end={s.id === "post"}
            className={({ isActive }) =>
              `segment-topbar__tab${isActive || section === s.id ? " is-active" : ""}`
            }
          >
            {s.label}
          </NavLink>
        ))}
      </nav>

      {kernel === "main" ? <PremiumHint /> : null}
      {children}
    </div>
  );
}

function postItems(kernel: PersonalKernel) {
  const raw = catalogByKinds(["picture", "video", "post"]).filter(
    (i) => i.kind === "picture" || i.free || i.kind === "post",
  );
  return filterForKernel(kernel, raw);
}

export function KernelPostPage({ kernel }: { kernel: PersonalKernel }) {
  return (
    <PersonalKernelShell kernel={kernel} section="post">
      <MediaFeed
        items={postItems(kernel)}
        empty={
          kernel === "offline"
            ? "No purchased or consumed posts yet."
            : kernel === "free"
              ? "No free posts right now."
              : "No posts yet."
        }
        gatePremium={kernel === "main"}
      />
    </PersonalKernelShell>
  );
}

export function KernelReelsPage({ kernel }: { kernel: PersonalKernel }) {
  return (
    <PersonalKernelShell kernel={kernel} section="reels">
      <MediaFeed
        items={filterForKernel(kernel, catalogByKinds(["reel"]))}
        empty={
          kernel === "offline"
            ? "No reels in your Offline library."
            : kernel === "free"
              ? "No free reels right now."
              : "No reels yet."
        }
        gatePremium={kernel === "main"}
      />
    </PersonalKernelShell>
  );
}

export function KernelConnectsPage({ kernel }: { kernel: PersonalKernel }) {
  const people =
    kernel === "free"
      ? [
          { name: "Ada · Creator", detail: "Free drops & open collabs" },
          { name: "Kofi Radio", detail: "Community free hour" },
        ]
      : kernel === "offline"
        ? [
            { name: "Saved: Maya Films", detail: "Purchased catalog" },
            { name: "History: Night Drive", detail: "Watched · kept offline" },
          ]
        : [
            { name: "Amaka Nwosu", detail: "Following · Streamify" },
            { name: "LearnVerse Hub", detail: "Suggested connect" },
            { name: "Tunde Beats", detail: "Music · Premium" },
          ];

  return (
    <PersonalKernelShell kernel={kernel} section="connects">
      <ul className="media-feed">
        {people.map((p) => (
          <li key={p.name} className="media-feed__item">
            <strong>{p.name}</strong>
            <span className="muted small">{p.detail}</span>
          </li>
        ))}
      </ul>
    </PersonalKernelShell>
  );
}

export function KernelCommunitiesPage({ kernel }: { kernel: PersonalKernel }) {
  const groups =
    kernel === "free"
      ? [
          { name: "Open Commons", detail: "Free creator circles" },
          { name: "Public Watch", detail: "Free screenings" },
        ]
      : kernel === "offline"
        ? [
            { name: "My purchased clubs", detail: "Memberships you own" },
            { name: "Finished courses guild", detail: "Consumed LearnVerse tracks" },
          ]
        : [
            { name: "Lagos Creators", detail: "12.4k members · posts & meetups" },
            { name: "LearnVerse Readers", detail: "Book clubs and study circles" },
            { name: "Streamify Night Owls", detail: "Live watch parties" },
          ];

  return (
    <PersonalKernelShell kernel={kernel} section="communities">
      <ul className="media-feed">
        {groups.map((g) => (
          <li key={g.name} className="media-feed__item">
            <strong>{g.name}</strong>
            <span className="muted small">{g.detail}</span>
          </li>
        ))}
      </ul>
    </PersonalKernelShell>
  );
}

/** Index redirects for each kernel. */
export function PersonalHomePage() {
  return <Navigate to="/app/personal/post" replace />;
}

export function FreeKernelHome() {
  return <Navigate to="/app/personal/free/post" replace />;
}

export function OfflineKernelHome() {
  return <Navigate to="/app/personal/offline/post" replace />;
}

/** Convenience wrappers used by routes. */
export const PersonalPostPage = () => <KernelPostPage kernel="main" />;
export const PersonalReelsPage = () => <KernelReelsPage kernel="main" />;
export const PersonalConnectsPage = () => <KernelConnectsPage kernel="main" />;
export const PersonalCommunitiesPage = () => <KernelCommunitiesPage kernel="main" />;

export const FreePostPage = () => <KernelPostPage kernel="free" />;
export const FreeReelsPage = () => <KernelReelsPage kernel="free" />;
export const FreeConnectsPage = () => <KernelConnectsPage kernel="free" />;
export const FreeCommunitiesPage = () => <KernelCommunitiesPage kernel="free" />;

export const OfflinePostPage = () => <KernelPostPage kernel="offline" />;
export const OfflineReelsPage = () => <KernelReelsPage kernel="offline" />;
export const OfflineConnectsPage = () => <KernelConnectsPage kernel="offline" />;
export const OfflineCommunitiesPage = () => <KernelCommunitiesPage kernel="offline" />;
