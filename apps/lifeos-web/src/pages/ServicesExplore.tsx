import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, SearchBar } from "@lifeos/ui";
import {
  SERVICE_CONCEPTS,
  SERVICE_FILTERS,
  type ServiceConcept,
} from "../lib/serviceReels";

function ServiceTile({
  concept,
  onOpen,
}: {
  concept: ServiceConcept;
  onOpen: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <button
      ref={wrapRef}
      type="button"
      className="discover-tile"
      onClick={onOpen}
      aria-label={concept.title}
    >
      {!failed ? (
        <video
          ref={videoRef}
          className="discover-tile__media"
          src={concept.videoUrl}
          poster={concept.posterUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= concept.clipSeconds) {
              v.currentTime = 0;
              void v.play().catch(() => undefined);
            }
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <img className="discover-tile__media" src={concept.posterUrl} alt="" />
      )}
      <div className="discover-tile__shade" aria-hidden />
      <div className="discover-tile__meta">
        <strong className="discover-tile__title">{concept.title}</strong>
        <span className="discover-tile__cat">{concept.category}</span>
      </div>
    </button>
  );
}

/** Discover (+) — search + 3-up services → sellers → business → PWA. */
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
        c.keywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [filter, query]);

  return (
    <div className="page services-explore">
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
            <div key={concept.id} role="listitem">
              <ServiceTile
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
