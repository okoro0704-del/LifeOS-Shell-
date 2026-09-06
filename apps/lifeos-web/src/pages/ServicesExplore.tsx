import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@lifeos/ui";
import { ServiceConceptTile } from "../components/ServiceConceptTile";
import { SERVICE_CONCEPTS, SERVICE_FILTERS } from "../lib/serviceReels";

/** Business Plus — discover services as short video concepts. */
export function ServicesExplorePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof SERVICE_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const concepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICE_CONCEPTS.filter((c) => {
      if (filter !== "All" && c.category !== filter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
      );
    });
  }, [filter, query]);

  return (
    <div className="page services-explore services-explore--tight">
      <label className="discover-search" htmlFor="discover-search">
        <span className="discover-search__icon" aria-hidden>
          ⌕
        </span>
        <input
          id="discover-search"
          className="discover-search__input"
          placeholder="Search services…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-label="Search services"
        />
        {query ? (
          <button
            type="button"
            className="discover-search__clear"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        ) : null}
      </label>

      <div className="services-explore__filters" role="tablist" aria-label="Service filters">
        {SERVICE_FILTERS.map((f) => (
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

      {concepts.length === 0 ? (
        <EmptyState
          title="No services match"
          detail="Try another search or clear the filter."
          action={
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
            >
              Show all services
            </button>
          }
        />
      ) : (
        <div className="discover-grid" role="list">
          {concepts.map((concept) => (
            <div key={concept.id} role="listitem" className="services-explore__tile-wrap">
              <ServiceConceptTile
                concept={concept}
                onOpen={() =>
                  navigate(`/app/services/explore/${encodeURIComponent(concept.id)}`)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
