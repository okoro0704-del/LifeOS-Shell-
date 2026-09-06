import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ImmersiveMediaFeed } from "../../components/ImmersiveMediaFeed";
import { SegmentGlassBar } from "../../components/SegmentGlassBar";
import { ElComFloat } from "../../components/ElComFloat";
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

export type HomeSection = "post" | "reels" | "products" | "communities" | "search";

const SECTIONS: { id: Exclude<HomeSection, "search">; label: string }[] = [
  { id: "post", label: "Post" },
  { id: "reels", label: "Reels" },
  { id: "products", label: "Products" },
  { id: "communities", label: "Communities" },
];

const SOFTWARE_PRODUCTS = [
  {
    id: "sw1",
    name: "RouteMesh",
    maker: "Ada Labs",
    seek: "Investment",
  },
  {
    id: "sw2",
    name: "ClinicOS Lite",
    maker: "HealthStack",
    seek: "Partnership",
  },
  {
    id: "sw3",
    name: "PayTrail",
    maker: "NairaForge",
    seek: "Sponsorship",
  },
  {
    id: "sw4",
    name: "ShelfSense",
    maker: "RetailBit",
    seek: "Sales",
  },
  {
    id: "sw5",
    name: "LearnKit API",
    maker: "EduForge",
    seek: "Partnership",
  },
  {
    id: "sw6",
    name: "StreamPipe",
    maker: "MediaBit",
    seek: "Investment",
  },
];

function railThumb(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/800`;
}

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
            <span className="kernel-brand-bar__credits" aria-label="LifeOS credits">
              {getLifeOsCredits()} cr
            </span>
            {hasPremium() ? null : (
              <Link to="/app/personal/premium" className="kernel-brand-bar__premium">
                Go Premium
              </Link>
            )}
          </span>
        ) : (
          <span className="kernel-brand-bar__main-actions">
            <span className="kernel-brand-bar__credits">{getLifeOsCredits()} cr</span>
            <button type="button" className="kernel-brand-bar__exit" aria-label="Exit to Main" onClick={exitToMain}>
              ×
            </button>
          </span>
        )}
      </span>
    </header>
  );
}

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
  const base = basePath(kernel);

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

  const tabs = SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    to: `${base}/${s.id}`,
    end: s.id === "post",
  }));

  return (
    <div
      className={`page personal-page personal-page--kernel personal-page--${kernel}${
        immersive ? " personal-page--immersive" : ""
      }${scrolled ? " is-scrolled" : ""}`}
    >
      <KernelBrandBar kernel={kernel} hidden={scrolled} />
      <SegmentGlassBar
        tabs={tabs}
        activeId={section === "search" ? "post" : section}
        scrolled={scrolled}
        showBack={false}
        searchTo={`${base}/search`}
        backTo={`${base}/post`}
        ariaLabel="Home sections"
      />
      <div className="kernel-scroll" ref={scrollRef}>
        {children}
      </div>
      <ElComFloat />
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

/** Software products streamed from creator PWAs — seek invest / partner / sell. */
export function KernelProductsPage({ kernel }: { kernel: PersonalKernel }) {
  return (
    <PersonalKernelShell kernel={kernel} section="products">
      <div className="near-rail near-rail--hero" role="list">
        {SOFTWARE_PRODUCTS.map((p) => (
          <button key={p.id} type="button" className="near-rail__card near-rail__card--media" role="listitem">
            <img className="near-rail__thumb" src={railThumb(p.id)} alt="" loading="lazy" />
            <span className="near-rail__boost">{p.seek}</span>
            <span className="near-rail__caption">
              <strong>{p.name}</strong>
              <span className="muted small">{p.maker}</span>
            </span>
          </button>
        ))}
        <button type="button" className="near-rail__card near-rail__card--media near-rail__card--more" role="listitem">
          <span className="near-rail__caption">
            <strong>See more</strong>
            <span className="muted small">Browse all</span>
          </span>
        </button>
      </div>
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
  const pool = filterForKernel(
    kernel,
    catalogByKinds(["picture", "video", "post", "reel", "music", "podcast", "book", "course"]),
  );
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
        placeholder="Search…"
        aria-label="Search"
        autoFocus
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
          <span className="muted small">VIP watch · balance {credits}</span>
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
export const PersonalProductsPage = () => <KernelProductsPage kernel="main" />;
export const PersonalCommunitiesPage = () => <KernelCommunitiesPage kernel="main" />;
export const PersonalSearchPage = () => <KernelSearchPage kernel="main" />;

export const FreePostPage = () => <KernelPostPage kernel="free" />;
export const FreeReelsPage = () => <KernelReelsPage kernel="free" />;
export const FreeProductsPage = () => <KernelProductsPage kernel="free" />;
export const FreeCommunitiesPage = () => <KernelCommunitiesPage kernel="free" />;
export const FreeSearchPage = () => <KernelSearchPage kernel="free" />;

export const OfflinePostPage = () => <KernelPostPage kernel="offline" />;
export const OfflineReelsPage = () => <KernelReelsPage kernel="offline" />;
export const OfflineProductsPage = () => <KernelProductsPage kernel="offline" />;
export const OfflineCommunitiesPage = () => <KernelCommunitiesPage kernel="offline" />;
export const OfflineSearchPage = () => <KernelSearchPage kernel="offline" />;
