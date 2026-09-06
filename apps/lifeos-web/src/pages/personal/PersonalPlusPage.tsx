import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EmptyState, SearchBar } from "@lifeos/ui";
import {
  freeCatalog,
  offlineCatalog,
  PERSONAL_CATALOG,
  type MediaItem,
} from "../../lib/personalCatalog";
import { personalKernelFromPath } from "../../components/shell/nav";

function poolForPath(pathname: string): MediaItem[] {
  const kernel = personalKernelFromPath(pathname) ?? "main";
  if (kernel === "free") return freeCatalog();
  if (kernel === "offline") return offlineCatalog();
  return PERSONAL_CATALOG;
}

function thumb(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/480/640`;
}

type PlusRow = { id: string; title: string; items: MediaItem[] };

/**
 * Personal Plus — discovery grid (2 drafts per row), streamed from creator PWAs.
 */
export function PersonalPlusPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"All" | "Videos" | "Posts" | "Products">("All");
  const [query, setQuery] = useState("");

  const pool = useMemo(() => poolForPath(location.pathname), [location.pathname]);

  const rows = useMemo((): PlusRow[] => {
    const q = query.trim().toLowerCase();
    const match = (i: MediaItem) =>
      !q ||
      i.title.toLowerCase().includes(q) ||
      (i.author ?? "").toLowerCase().includes(q) ||
      (i.detail ?? "").toLowerCase().includes(q);

    const videos = pool.filter((i) => ["video", "reel"].includes(i.kind) && match(i));
    const posts = pool.filter((i) => ["post", "picture", "music", "podcast"].includes(i.kind) && match(i));
    const products = pool.filter((i) => ["course", "book", "edu"].includes(i.kind) && match(i));

    const all: PlusRow[] = [
      { id: "videos", title: "Videos", items: videos },
      { id: "posts", title: "Posts", items: posts },
      { id: "products", title: "Products", items: products },
    ];

    if (filter === "All") return all.filter((r) => r.items.length > 0);
    return all.filter((r) => r.title === filter && r.items.length > 0);
  }, [pool, query, filter]);

  const filters = ["All", "Videos", "Posts", "Products"] as const;

  return (
    <div className="page personal-page plus-discover">
      <header className="page-header page-header--compact">
        <h1>Discover</h1>
        <p className="muted small">Videos, posts, and products from creator apps.</p>
      </header>

      <SearchBar
        id="personal-plus-search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search discover"
      />

      <div className="services-explore__filters" role="tablist" aria-label="Discover filters">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className={`services-explore__chip${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          detail="Try another search or filter."
          action={
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
            >
              Show all
            </button>
          }
        />
      ) : (
        rows.map((row) => (
          <section key={row.id} className="plus-discover__section" aria-label={row.title}>
            <h2 className="plus-discover__heading">{row.title}</h2>
            <div className="discover-grid discover-grid--two" role="list">
              {row.items.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="discover-tile"
                  role="listitem"
                  aria-label={item.title}
                  onClick={() => navigate(`/app/personal/creator/${encodeURIComponent(item.author || item.id)}`)}
                >
                  <img className="discover-tile__media" src={thumb(item.id)} alt="" loading="lazy" />
                  <div className="discover-tile__shade" aria-hidden />
                  <div className="discover-tile__meta">
                    <strong className="discover-tile__title">{item.title}</strong>
                    <span className="discover-tile__cat">{item.kind}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
