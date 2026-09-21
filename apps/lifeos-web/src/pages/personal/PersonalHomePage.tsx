import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { ImmersiveMediaFeed } from "../../components/ImmersiveMediaFeed";
import { SegmentGlassBar } from "../../components/SegmentGlassBar";
import { LivingLifeOsIdentity } from "../../components/LivingLifeOsIdentity";
import { useChromeVisibility } from "../../context/ChromeVisibilityContext";
import { useNavigationDock } from "../../context/NavigationDockContext";
import { catalogByKinds, hasPremium, setPremium, type MediaItem } from "../../lib/personalCatalog";
import type { PersonalKernel } from "../../components/shell/nav";
import {
  applyWatchedOffline,
  getLifeOsCredits,
  listSavedAds,
  listUserPosts,
  resolveTier,
  topUpLifeOsCredits,
} from "../../lib/personalMonetization";
import {
  fetchBrandedCatalogueItems,
  fetchLifeOsPublicationFeed,
  fetchMybrandPublicPosts,
  type CatalogueItem,
} from "../../lib/mybrandPublicFeed";
import {
  assembleMediaFeed,
  fetchEcommerceLifeOsFeed,
  mapPublicationToMediaItem,
  type DatedMediaItem,
} from "../../lib/ecommerceLifeOsFeed";
import {
  fetchHospitalityLifeOsFeed,
  mapHospitalityPublicationToMediaItem,
} from "../../lib/hospitalityLifeOsFeed";
import { installedAppsService } from "../../lib/services";
import type { InstalledAppManifest } from "@lifeos/shared";
import { openCreatorApp } from "../../lib/mybrandOS";

export { LivingLifeOsIdentity, KernelBrandBar } from "../../components/LivingLifeOsIdentity";

export type HomeSection = "post" | "reels" | "products" | "communities" | "search";

const SECTIONS: { id: Exclude<HomeSection, "search">; label: string }[] = [
  { id: "post", label: "Post" },
  { id: "reels", label: "Reels" },
  { id: "products", label: "Products" },
  { id: "communities", label: "Communities" },
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
  const { chromeHidden, setChromeHidden, reportScroll } = useChromeVisibility();
  const { shellControlsVisible } = useNavigationDock();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScroll = useRef(0);
  const base = basePath(kernel);

  useEffect(() => {
    applyWatchedOffline();
    if (!immersive) {
      setChromeHidden(false);
    }
  }, [section, kernel, immersive, setChromeHidden]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || immersive) return;
    const onScroll = () => {
      const y = root.scrollTop;
      reportScroll(y, prevScroll.current);
      prevScroll.current = y;
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [immersive, reportScroll, section]);

  const tabs = SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    to: `${base}/${s.id}`,
    end: s.id === "post",
  }));

  // Unified shell: section bar visible iff shellControlsVisible (not scroll-independent).
  const sectionHidden = !shellControlsVisible;

  return (
    <div
      className={`page personal-page personal-page--kernel personal-page--layered personal-page--${kernel}${
        immersive ? " personal-page--immersive" : ""
      }${chromeHidden && !shellControlsVisible ? " is-scrolled is-chrome-hidden" : ""}${
        shellControlsVisible ? " is-shell-open" : " is-shell-clean"
      }`}
    >
      {/* LAYER 1 — living LifeOS identity (independent of shell bars) */}
      <LivingLifeOsIdentity placement="right" />
      {/* LAYER 2 — top section bar: part of unified shellControlsVisible */}
      <SegmentGlassBar
        tabs={tabs}
        activeId={section}
        scrolled={sectionHidden}
        showBack={false}
        searchTo={`${base}/search`}
        backTo={`${base}/post`}
        ariaLabel="Home sections"
      />
      {/* LAYER 3 — experience content */}
      <div className="kernel-scroll" ref={scrollRef}>
        {children}
      </div>
    </div>
  );
}

function postItems(kernel: PersonalKernel, remote: MediaItem[]) {
  // Digiconomy consume: real mybrandOS public Posts only — no mock catalog mix-in.
  return filterForKernel(kernel, remote);
}

export function KernelPostPage({ kernel }: { kernel: PersonalKernel }) {
  const [remote, setRemote] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const initialPublicationId = searchParams.get("publication") || searchParams.get("p");

  const loadPage = useCallback(async (cursor?: string | null) => {
    const [projected, eco, hos] = await Promise.all([
      fetchLifeOsPublicationFeed({
        cursor: cursor || undefined,
        limit: 24,
      }),
      // First page only — vertical public feeds are not cursor-aligned with LifeOS.
      cursor
        ? Promise.resolve({ ok: false as const, items: [], nextCursor: null as string | null })
        : fetchEcommerceLifeOsFeed({ kind: "publication", timeoutMs: 1500, limit: 24 }),
      cursor
        ? Promise.resolve({ ok: false as const, items: [], nextCursor: null as string | null })
        : fetchHospitalityLifeOsFeed({ kind: "publication", timeoutMs: 1500, limit: 24 }),
    ]);

    let baseItems: MediaItem[] = projected.items;
    if (!baseItems.length && !cursor) {
      try {
        const data = await installedAppsService.list();
        const apps = (data.apps ?? []) as InstalledAppManifest[];
        const reserved = new Set(["mybrandos", "hospitalityos", "serviceos", "ecommerceos"]);
        const slugs = [
          ...new Set(
            apps
              .map((a) => String(a.subdomain || "").trim().toLowerCase())
              .filter((slug) => slug && !reserved.has(slug)),
          ),
        ];
        const batches = await Promise.all(slugs.map((slug) => fetchMybrandPublicPosts(slug)));
        baseItems = batches.flat();
      } catch {
        baseItems = [];
      }
    }

    const lifeosDated: DatedMediaItem[] = baseItems.map((item) => ({
      item,
      publishedAt: item.publishedAt ?? null,
    }));
    const ecoDated: DatedMediaItem[] =
      eco.ok && eco.items.length
        ? eco.items.map((row) => ({
            item: mapPublicationToMediaItem(row),
            publishedAt: row.publishedAt ?? null,
          }))
        : [];
    const hosDated: DatedMediaItem[] =
      hos.ok && hos.items.length
        ? hos.items.map((row) => ({
            item: mapHospitalityPublicationToMediaItem(row),
            publishedAt: row.publishedAt ?? null,
          }))
        : [];

    // Partial success: any vertical failure keeps remaining items.
    const items = assembleMediaFeed([lifeosDated, ecoDated, hosDated]);
    return { items, nextCursor: projected.nextCursor };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const page = await loadPage(null);
      if (!active) return;
      setRemote(page.items);
      setNextCursor(page.nextCursor);
    })();
    return () => {
      active = false;
    };
  }, [loadPage]);

  const onNearEnd = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    void loadPage(nextCursor).then((page) => {
      setRemote((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const appended = page.items.filter((i) => !seen.has(i.id));
        return appended.length ? [...prev, ...appended] : prev;
      });
      setNextCursor(page.nextCursor);
      setLoadingMore(false);
    });
  }, [nextCursor, loadingMore, loadPage]);

  return (
    <PersonalKernelShell kernel={kernel} section="post" immersive>
      <ImmersiveMediaFeed
        items={postItems(kernel, remote)}
        empty="Nothing here yet."
        gatePremium={kernel === "main"}
        mode="post"
        showAds={kernel === "free"}
        initialPublicationId={initialPublicationId}
        hasMore={Boolean(nextCursor)}
        onNearEnd={onNearEnd}
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

/** Catalogue projections from branded Digital Spaces — no LifeOS-owned mock store. */
export function KernelProductsPage({ kernel }: { kernel: PersonalKernel }) {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const next = await fetchBrandedCatalogueItems();
      if (active) {
        setItems(next);
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PersonalKernelShell kernel={kernel} section="products">
      {loaded && items.length === 0 ? (
        <p className="muted padded" style={{ margin: "0.75rem 1rem" }}>
          No catalogue items from branded Digital Spaces yet.
        </p>
      ) : (
        <div className="products-feed" role="list">
          {items.map((p) => (
            <button
              key={p.id}
              type="button"
              className="products-feed__card"
              role="listitem"
              onClick={() => {
                if (p.destinationUrl) {
                  window.open(p.destinationUrl, "_blank", "noopener,noreferrer");
                  return;
                }
                void openCreatorApp(p.ownerSlug);
              }}
            >
              {p.mediaUrl ? (
                <img className="products-feed__thumb" src={p.mediaUrl} alt="" loading="lazy" />
              ) : (
                <span className="products-feed__thumb products-feed__thumb--empty" aria-hidden />
              )}
              <span className="products-feed__meta">
                <span className="products-feed__type">{p.itemType}</span>
                <strong>{p.title}</strong>
                <span className="muted small">{p.ownerDisplayName || p.ownerSlug}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </PersonalKernelShell>
  );
}

export function KernelCommunitiesPage({ kernel }: { kernel: PersonalKernel }) {
  const creators =
    kernel === "free"
      ? [
          {
            creator: "Open Commons",
            hubs: [
              { name: "Free drops", asset: "Posts" },
              { name: "Public watch", asset: "Videos" },
            ],
          },
        ]
      : kernel === "offline"
        ? [
            {
              creator: "Your purchases",
              hubs: [
                { name: "Owned courses", asset: "LearnVerse" },
                { name: "Saved reels", asset: "Reels" },
              ],
            },
          ]
        : [
            {
              creator: "amaka.lens",
              hubs: [
                { name: "Lagoon stills", asset: "Pictures" },
                { name: "Street walks", asset: "Videos" },
                { name: "Print drops", asset: "Products" },
              ],
            },
            {
              creator: "tunde.beats",
              hubs: [
                { name: "Afrobeats room", asset: "Music" },
                { name: "Studio sessions", asset: "Podcasts" },
                { name: "Sample packs", asset: "Products" },
              ],
            },
            {
              creator: "learnverse.hub",
              hubs: [
                { name: "Course talk", asset: "Courses" },
                { name: "Book club", asset: "Books" },
                { name: "Edu shorts", asset: "Edu" },
              ],
            },
          ];

  return (
    <PersonalKernelShell kernel={kernel} section="communities">
      <ul className="community-tree">
        {creators.map((c) => (
          <li key={c.creator} className="community-tree__creator">
            <strong className="community-tree__name">@{c.creator}</strong>
            <span className="muted small">Creator community</span>
            <ul className="community-tree__subs">
              {c.hubs.map((h) => (
                <li key={h.name} className="community-tree__sub">
                  <strong>{h.name}</strong>
                  <span className="muted small">Discusses · {h.asset}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </PersonalKernelShell>
  );
}

export function KernelSearchPage({ kernel }: { kernel: PersonalKernel }) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const pool = filterForKernel(
    kernel,
    catalogByKinds(["picture", "video", "post", "reel", "music", "podcast", "book", "course"]),
  );
  const hits = submitted
    ? pool.filter(
        (i) =>
          i.title.toLowerCase().includes(submitted.toLowerCase()) ||
          (i.author || "").toLowerCase().includes(submitted.toLowerCase()),
      )
    : [];

  return (
    <PersonalKernelShell kernel={kernel} section="search">
      <form
        className="surface-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <input
          className="surface-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value.trim()) setSubmitted("");
          }}
          placeholder="Search…"
          aria-label="Search"
          autoFocus
        />
      </form>
      {submitted ? (
        <ul className="media-feed">
          {hits.length === 0 ? (
            <li className="media-feed__item">
              <strong>No matches</strong>
            </li>
          ) : (
            hits.map((i) => (
              <li key={i.id} className="media-feed__item">
                <span className="media-feed__kind">{i.kind}</span>
                <strong>{i.title}</strong>
                <span className="muted small">{i.author ? `@${i.author}` : i.detail}</span>
              </li>
            ))
          )}
        </ul>
      ) : (
        <p className="muted small">Type a query and press Enter to see results.</p>
      )}
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

/** Offline Kernel entry — AppShell enters bare TV broadcast; no Living chrome. */
export function OfflineKernelHome() {
  return (
    <div
      className="offline-broadcast-landing"
      data-kernel="lifeos-offline-kernel"
      aria-label="Broadcast"
    />
  );
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
