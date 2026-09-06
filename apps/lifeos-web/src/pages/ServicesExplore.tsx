import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, SearchBar } from "@lifeos/ui";
import { ServiceConceptTile } from "../components/ServiceConceptTile";
import { SERVICE_CONCEPTS, SERVICE_FILTERS } from "../lib/serviceReels";

/** Business Plus — video services pushed with monthly boost first. */
export function ServicesExplorePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof SERVICE_FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const concepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = SERVICE_CONCEPTS.filter((c) => {
      if (filter !== "All" && c.category !== filter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
      );
    });
    return [...filtered].sort((a, b) => Number(Boolean(b.pushedMonthly)) - Number(Boolean(a.pushedMonthly)));
  }, [filter, query]);

  return (
    <div className="page services-explore">
      <header className="page-header page-header--compact">
        <h1>Pushed services</h1>
        <p className="muted small">Monthly boosts rise first in discovery video.</p>
      </header>

      <SearchBar
        id="discover-search"
        placeholder="Search services…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search services"
      />

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
              {concept.pushedMonthly ? (
                <span className="services-explore__push-badge">Pushed</span>
              ) : null}
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
