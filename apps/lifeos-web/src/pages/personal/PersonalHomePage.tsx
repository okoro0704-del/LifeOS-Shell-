import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Navigate, useNavigate } from "react-router-dom";
import { ImmersiveMediaFeed } from "../../components/ImmersiveMediaFeed";
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
export type ScrollStage = "top" | "peek" | "immersed";

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

function sectionLabel(section: HomeSection): string {
  return SECTIONS.find((s) => s.id === section)?.label ?? "Post";
}

/** Only static chrome: Kernel · LifeOS · Go Premium / × */
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

function SectionTabs({ kernel, section }: { kernel: PersonalKernel; section: HomeSection }) {
  const base = basePath(kernel);
  return (
    <nav className="segment-topbar segment-topbar--home segment-topbar--body" aria-label="Home sections">
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
  );
}

/**
 * Static brand bar only. Section tabs live in the scroll body.
 * Scroll: tabs leave → tiny section peek → full immersive media.
 */
export function PersonalKernelShell({
  kernel,
  section,
  children,
  immersive = false,
  onStageChange,
}: {
  kernel: PersonalKernel;
  section: HomeSection;
  children: ReactNode;
  immersive?: boolean;
  onStageChange?: (stage: ScrollStage) => void;
}) {
  const [stage, setStage] = useState<ScrollStage>("top");
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ScrollStage>("top");

  useEffect(() => {
    stageRef.current = "top";
    setStage("top");
    onStageChange?.("top");
    const root = scrollRef.current;
    if (!root) return;

    const onScroll = () => {
      const feed = root.querySelector(".immersive-feed") as HTMLElement | null;
      const target = feed ?? root;
      const y = target.scrollTop;
      let next: ScrollStage = "top";
      if (y > 140) next = "immersed";
      else if (y > 28) next = "peek";
      if (next === stageRef.current) return;
      stageRef.current = next;
      setStage(next);
      onStageChange?.(next);
    };

    const feed = root.querySelector(".immersive-feed");
    const target = (feed as HTMLElement | null) ?? root;
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener("scroll", onScroll);
  }, [section, kernel, immersive, onStageChange]);

  return (
    <div
      className={`page personal-page personal-page--kernel personal-page--${kernel}${
        immersive ? " personal-page--immersive" : ""
      } is-stage-${stage}`}
    >
      <KernelBrandBar kernel={kernel} />

      <div
        className={`kernel-peek-title${stage === "peek" ? " is-visible" : ""}`}
        aria-live="polite"
      >
        {sectionLabel(section)}
      </div>

      <div className="kernel-scroll" ref={scrollRef}>
        {!immersive ? <SectionTabs kernel={kernel} section={section} /> : null}
        {children}
      </div>
    </div>
  );
}

function postItems(kernel: PersonalKernel) {
  const raw = catalogByKinds(["picture", "video", "post"]);
  return filterForKernel(kernel, raw);
}

export function KernelPostPage({ kernel }: { kernel: PersonalKernel }) {
  return (
    <PersonalKernelShell kernel={kernel} section="post" immersive>
      <ImmersiveMediaFeed
        items={postItems(kernel)}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
        mode="post"
        leading={<SectionTabs kernel={kernel} section="post" />}
      />
    </PersonalKernelShell>
  );
}

export function KernelReelsPage({ kernel }: { kernel: PersonalKernel }) {
  return (
    <PersonalKernelShell kernel={kernel} section="reels" immersive>
      <ImmersiveMediaFeed
        items={filterForKernel(kernel, catalogByKinds(["reel"]))}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
        mode="reels"
        leading={<SectionTabs kernel={kernel} section="reels" />}
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
