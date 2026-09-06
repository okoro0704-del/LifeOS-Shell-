import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { EmptyState } from "@lifeos/ui";
import {
  freeCatalog,
  offlineCatalog,
  PERSONAL_CATALOG,
  type MediaItem,
} from "../../lib/personalCatalog";
import { personalKernelFromPath } from "../../components/shell/nav";
import { openCreatorApp } from "../../lib/mybrandOS";

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

/** Personal Plus — tight discover grid (2 per row). */
export function PersonalPlusPage() {
  const location = useLocation();
  const [filter, setFilter] = useState<"All" | "Videos" | "Posts" | "Products">("All");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const pool = useMemo(() => poolForPath(location.pathname), [location.pathname]);

  const rows = useMemo((): PlusRow[] => {
    const needle = submitted.trim().toLowerCase();
    const match = (i: MediaItem) =>
      !needle ||
      i.title.toLowerCase().includes(needle) ||
      (i.author ?? "").toLowerCase().includes(needle) ||
      (i.detail ?? "").toLowerCase().includes(needle);

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
  }, [pool, submitted, filter]);

  const filters = ["All", "Videos", "Posts", "Products"] as const;
  const searching = Boolean(submitted);

  return (
    <div className="page personal-page plus-discover plus-discover--tight">
      <form
        className="discover-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <span className="discover-search__icon" aria-hidden>
          ⌕
        </span>
        <input
          id="personal-plus-search"
          className="discover-search__input"
          placeholder="Search…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) setSubmitted("");
          }}
          autoComplete="off"
          aria-label="Search discover"
        />
        {query ? (
          <button
            type="button"
            className="discover-search__clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setSubmitted("");
            }}
          >
            ×
          </button>
        ) : null}
      </form>

      {!searching ? (
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
      ) : null}

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
                setSubmitted("");
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
            {!searching ? <h2 className="plus-discover__heading">{row.title}</h2> : null}
            <div className="discover-grid discover-grid--two" role="list">
              {row.items.slice(0, searching ? 24 : 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="discover-tile"
                  role="listitem"
                  aria-label={item.title}
                  onClick={() => openCreatorApp(item.author || item.id)}
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
