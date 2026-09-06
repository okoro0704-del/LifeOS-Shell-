import type { ReactNode } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import { MediaFeed } from "../../components/MediaFeed";
import { catalogByKinds, hasPremium, setPremium, type MediaItem } from "../../lib/personalCatalog";
import type { PersonalKernel } from "../../components/shell/nav";
import { authClient } from "../../lib/api";
import {
  isAuthBypass,
  markNeedsFaceOnKernelSwitch,
  needsFaceOnKernelSwitch,
  setPendingKernel,
} from "../../lib/personalConnectivity";
import { triggerWorkspaceHaptic } from "../../lib/mobileBridge";

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

function kernelLabel(kernel: PersonalKernel): string {
  if (kernel === "free") return "Free";
  if (kernel === "offline") return "Offline";
  return "Main";
}

/**
 * Brand row only on Home (Post) of each kernel.
 * Main: Main · LifeOS · Go Premium
 * Free/Offline: Kernel · LifeOS · × (exit to Main)
 */
function KernelBrandBar({ kernel }: { kernel: PersonalKernel }) {
  const navigate = useNavigate();

  function exitToMain() {
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    const leavingOffline = kernel === "offline";
    const requireFace =
      online && !isAuthBypass() && (needsFaceOnKernelSwitch() || leavingOffline);

    if (requireFace) {
      setPendingKernel("main");
      markNeedsFaceOnKernelSwitch(false);
      void triggerWorkspaceHaptic();
      void authClient.beginLogin({
        preferPasskey: true,
        silentUi: true,
        prompt: "login",
      });
      return;
    }

    void triggerWorkspaceHaptic();
    navigate("/app/personal/post");
  }

  return (
    <header className="kernel-brand-bar" aria-label="Kernel">
      <span className="kernel-brand-bar__side kernel-brand-bar__side--left">{kernelLabel(kernel)}</span>
      <span className="kernel-brand-bar__logo">LifeOS</span>
      <span className="kernel-brand-bar__side kernel-brand-bar__side--right">
        {kernel === "main" ? (
          hasPremium() ? (
            <span className="kernel-brand-bar__premium-on" aria-label="Premium active">
              Premium
            </span>
          ) : (
            <Link to="/app/personal/premium" className="kernel-brand-bar__premium">
              Go Premium
            </Link>
          )
        ) : (
          <button
            type="button"
            className="kernel-brand-bar__exit"
            aria-label="Exit to Main"
            onClick={exitToMain}
          >
            ×
          </button>
        )}
      </span>
    </header>
  );
}

/**
 * Shared Personal home chrome. Brand bar only on Post (Home).
 * Section tabs stay inside the active kernel.
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
  const isHome = section === "post";

  return (
    <div className={`page personal-page personal-page--kernel personal-page--${kernel}`}>
      {isHome ? <KernelBrandBar kernel={kernel} /> : null}

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
        empty="Nothing here yet."
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
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
      />
    </PersonalKernelShell>
  );
}

export function KernelConnectsPage({ kernel }: { kernel: PersonalKernel }) {
  const people =
    kernel === "free"
      ? [
          { name: "Ada · Creator", detail: "Free drops" },
          { name: "Kofi Radio", detail: "Community hour" },
        ]
      : kernel === "offline"
        ? [
            { name: "Maya Films", detail: "Purchased" },
            { name: "Night Drive", detail: "Watched" },
          ]
        : [
            { name: "Amaka Nwosu", detail: "Following" },
            { name: "LearnVerse Hub", detail: "Suggested" },
            { name: "Tunde Beats", detail: "Music" },
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
          { name: "Open Commons", detail: "Free circles" },
          { name: "Public Watch", detail: "Screenings" },
        ]
      : kernel === "offline"
        ? [
            { name: "Purchased clubs", detail: "Memberships" },
            { name: "Finished courses", detail: "LearnVerse" },
          ]
        : [
            { name: "Lagos Creators", detail: "12.4k members" },
            { name: "LearnVerse Readers", detail: "Book clubs" },
            { name: "Streamify Night Owls", detail: "Watch parties" },
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

export function PersonalPremiumPage() {
  return (
    <div className="page personal-page">
      <header className="page-header page-header--compact">
        <h1>Go Premium</h1>
      </header>
      <ul className="media-feed">
        <li className="media-feed__item">
          <strong>LifeOS Premium</strong>
          <span className="muted small">Full music, video, and podcast play on Main.</span>
          {hasPremium() ? (
            <span className="media-feed__badge">Active</span>
          ) : (
            <button
              type="button"
              className="los-btn los-btn--primary"
              onClick={() => {
                setPremium(true);
                window.location.assign("/app/personal/post");
              }}
            >
              Subscribe
            </button>
          )}
        </li>
      </ul>
      <p>
        <Link to="/app/personal/post" className="text-link">
          Back to Home
        </Link>
      </p>
    </div>
  );
}

export function PersonalHomePage() {
  return <Navigate to="/app/personal/post" replace />;
}

export function FreeKernelHome() {
  return <Navigate to="/app/personal/free/post" replace />;
}

export function OfflineKernelHome() {
  return <Navigate to="/app/personal/offline/post" replace />;
}

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
