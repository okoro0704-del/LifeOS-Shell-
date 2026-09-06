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
import {
  applyWatchedOffline,
  getLifeOsCredits,
  listSavedAds,
  listUserPosts,
  resolveTier,
  topUpLifeOsCredits,
} from "../../lib/personalMonetization";

export type HomeSection = "post" | "reels" | "connects" | "communities" | "search";
export type ScrollStage = "top" | "scrolled";

const SECTIONS: { id: HomeSection; label: string }[] = [
  { id: "post", label: "Post" },
  { id: "reels", label: "Reels" },
  { id: "connects", label: "Connects" },
  { id: "communities", label: "Communities" },
  { id: "search", label: "Search" },
];

function basePath(kernel: PersonalKernel): string {
  if (kernel === "free") return "/app/personal/free";
  if (kernel === "offline") return "/app/personal/offline";
  return "/app/personal";
}

function filterForKernel(kernel: PersonalKernel, items: MediaItem[]): MediaItem[] {
  applyWatchedOffline();
  const merged = [...listUserPosts(), ...items];
  if (kernel === "free") {
    return merged.filter((i) => resolveTier(i) === "free" || i.free);
  }
  if (kernel === "offline") {
    return merged.filter((i) => i.ownedOrConsumed);
  }
  return merged;
}

function kernelLabel(kernel: PersonalKernel): string {
  if (kernel === "free") return "Free";
  if (kernel === "offline") return "Offline";
  return "Main";
}

function KernelBrandBar({ kernel, hidden }: { kernel: PersonalKernel; hidden?: boolean }) {
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
    <header className={`kernel-brand-bar${hidden ? " is-hidden" : ""}`} aria-label="Kernel">
      <span className="kernel-brand-bar__side kernel-brand-bar__side--left">{kernelLabel(kernel)}</span>
      <span className="kernel-brand-bar__logo">LifeOS</span>
      <span className="kernel-brand-bar__side kernel-brand-bar__side--right">
        {kernel === "main" ? (
          <span className="kernel-brand-bar__main-actions">
            <Link to="/app/personal/compose" className="kernel-brand-bar__compose">
              Post
            </Link>
            {hasPremium() ? (
              <span className="kernel-brand-bar__premium-on">{getLifeOsCredits()} cr</span>
            ) : (
              <Link to="/app/personal/premium" className="kernel-brand-bar__premium">
                Go Premium
              </Link>
            )}
          </span>
        ) : (
          <span className="kernel-brand-bar__main-actions">
            <Link to="/app/personal/compose" className="kernel-brand-bar__compose">
              Post
            </Link>
            <button type="button" className="kernel-brand-bar__exit" aria-label="Exit to Main" onClick={exitToMain}>
              ×
            </button>
          </span>
        )}
      </span>
    </header>
  );
}

function SectionTabs({
  kernel,
  section,
  scrolled,
}: {
  kernel: PersonalKernel;
  section: HomeSection;
  scrolled: boolean;
}) {
  const navigate = useNavigate();
  const base = basePath(kernel);
  return (
    <nav
      className={`segment-topbar segment-topbar--glass${scrolled ? " is-pinned" : ""}`}
      aria-label="Home sections"
    >
      {scrolled ? (
        <button
          type="button"
          className="segment-topbar__back"
          aria-label="Back"
          onClick={() => navigate(`${base}/post`)}
        >
          ←
        </button>
      ) : null}
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
 * Brand bar hides on scroll. Section glass bar stays sticky with back when scrolled.
 */
export function PersonalKernelShell({
  kernel,
  section,
  children,
  immersive = false,
}: {
  kernel: PersonalKernel;
  section: HomeSection;
  children: ReactNode;
  immersive?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyWatchedOffline();
    setScrolled(false);
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const feed = root.querySelector(".immersive-feed") as HTMLElement | null;
      const y = (feed ?? root).scrollTop;
      setScrolled(y > 36);
    };
    const feed = root.querySelector(".immersive-feed");
    const target = (feed as HTMLElement | null) ?? root;
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener("scroll", onScroll);
  }, [section, kernel, immersive]);

  return (
    <div
      className={`page personal-page personal-page--kernel personal-page--${kernel}${
        immersive ? " personal-page--immersive" : ""
      }${scrolled ? " is-scrolled" : ""}`}
    >
      <KernelBrandBar kernel={kernel} hidden={scrolled} />
      <SectionTabs kernel={kernel} section={section} scrolled={scrolled} />
      <div className="kernel-scroll" ref={scrollRef}>
        {children}
      </div>
    </div>
  );
}

function postItems(kernel: PersonalKernel) {
  return filterForKernel(kernel, catalogByKinds(["picture", "video", "post"]));
}

export function KernelPostPage({ kernel }: { kernel: PersonalKernel }) {
  return (
    <PersonalKernelShell kernel={kernel} section="post" immersive>
      <ImmersiveMediaFeed
        items={postItems(kernel)}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
        mode="post"
        showAds={kernel === "free"}
      />
      {kernel === "offline" && listSavedAds().length > 0 ? (
        <section className="offline-saved-ads" aria-label="Saved ads">
          <h2>Saved ads</h2>
          <ul className="media-feed">
            {listSavedAds().map((ad) => (
              <li key={ad.id} className="media-feed__item">
                <span className="media-feed__badge media-feed__badge--ad">Ad</span>
                <strong>{ad.title}</strong>
                <span className="muted small">{ad.advertiser}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
        showAds={kernel === "free"}
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

export function KernelSearchPage({ kernel }: { kernel: PersonalKernel }) {
  const [q, setQ] = useState("");
  const pool = filterForKernel(kernel, catalogByKinds(["picture", "video", "post", "reel", "music", "podcast", "book", "course"]));
  const hits = q.trim()
    ? pool.filter(
        (i) =>
          i.title.toLowerCase().includes(q.toLowerCase()) ||
          (i.author || "").toLowerCase().includes(q.toLowerCase()),
      )
    : pool.slice(0, 8);

  return (
    <PersonalKernelShell kernel={kernel} section="search">
      <input
        className="surface-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search posts, creators…"
        aria-label="Search"
      />
      <ul className="media-feed">
        {hits.map((i) => (
          <li key={i.id} className="media-feed__item">
            <span className="media-feed__kind">{i.kind}</span>
            <strong>{i.title}</strong>
            <span className="muted small">{i.author ? `@${i.author}` : i.detail}</span>
          </li>
        ))}
      </ul>
    </PersonalKernelShell>
  );
}

export function PersonalPremiumPage() {
  const [credits, setCredits] = useState(() => getLifeOsCredits());

  return (
    <div className="page personal-page">
      <header className="page-header page-header--compact">
        <h1>Go Premium</h1>
      </header>
      <ul className="media-feed">
        <li className="media-feed__item">
          <strong>Premium subscription</strong>
          <span className="muted small">Main with no ads.</span>
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
        <li className="media-feed__item">
          <strong>LifeOS credits</strong>
          <span className="muted small">VIP watch · balance {credits}. 80% to creator.</span>
          <div className="row-actions">
            {[40, 80, 200].map((n) => (
              <button
                key={n}
                type="button"
                className="los-btn los-btn--soft los-btn--sm"
                onClick={() => setCredits(topUpLifeOsCredits(n))}
              >
                Buy {n}
              </button>
            ))}
          </div>
        </li>
      </ul>
      <p>
        <Link to="/app/personal/post" className="text-link">
          Back
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
export const PersonalSearchPage = () => <KernelSearchPage kernel="main" />;

export const FreePostPage = () => <KernelPostPage kernel="free" />;
export const FreeReelsPage = () => <KernelReelsPage kernel="free" />;
export const FreeConnectsPage = () => <KernelConnectsPage kernel="free" />;
export const FreeCommunitiesPage = () => <KernelCommunitiesPage kernel="free" />;
export const FreeSearchPage = () => <KernelSearchPage kernel="free" />;

export const OfflinePostPage = () => <KernelPostPage kernel="offline" />;
export const OfflineReelsPage = () => <KernelReelsPage kernel="offline" />;
export const OfflineConnectsPage = () => <KernelConnectsPage kernel="offline" />;
export const OfflineCommunitiesPage = () => <KernelCommunitiesPage kernel="offline" />;
export const OfflineSearchPage = () => <KernelSearchPage kernel="offline" />;
