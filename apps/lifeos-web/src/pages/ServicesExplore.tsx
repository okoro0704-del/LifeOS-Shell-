import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SERVICE_CONCEPTS,
  SERVICE_FILTERS,
  type ServiceConcept,
} from "../lib/serviceReels";

function ReelTile({
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
      className={`reel-tile reel-tile--${concept.span} reel-tile--service`}
      onClick={onOpen}
      aria-label={concept.title}
    >
      {!failed ? (
        <video
          ref={videoRef}
          className="reel-tile__video"
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
        <img className="reel-tile__video" src={concept.posterUrl} alt="" />
      )}
      <div className="reel-tile__shade" aria-hidden />
      <div className="reel-tile__meta reel-tile__meta--service">
        <strong className="reel-tile__title">{concept.title}</strong>
      </div>
    </button>
  );
}

/** Discover (+) — service videos. Tap → full sellers page → business → PWA. */
export function ServicesExplorePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof SERVICE_FILTERS)[number]>("All");

  const concepts = useMemo(
    () =>
      filter === "All"
        ? SERVICE_CONCEPTS
        : SERVICE_CONCEPTS.filter((c) => c.category === filter),
    [filter],
  );

  return (
    <div className="page services-explore">
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

      <div className="services-explore__grid" role="list">
        {concepts.map((concept) => (
          <div key={concept.id} role="listitem">
            <ReelTile
              concept={concept}
              onOpen={() => navigate(`/app/services/explore/${encodeURIComponent(concept.id)}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
