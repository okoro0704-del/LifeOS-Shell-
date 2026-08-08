import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { REEL_FILTERS, SERVICE_REELS, type ServiceReel } from "../lib/serviceReels";

function ReelTile({ reel, onOpen }: { reel: ServiceReel; onOpen: () => void }) {
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
      className={`reel-tile reel-tile--${reel.span}`}
      onClick={onOpen}
      aria-label={`${reel.title} — ${reel.category}. ${reel.blurb}`}
    >
      {!failed ? (
        <video
          ref={videoRef}
          className="reel-tile__video"
          src={reel.videoUrl}
          poster={reel.posterUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      ) : (
        <img className="reel-tile__video" src={reel.posterUrl} alt="" />
      )}
      <div className="reel-tile__shade" aria-hidden />
      <div className="reel-tile__meta">
        <span className="reel-tile__cat">{reel.category}</span>
        <strong className="reel-tile__title">{reel.title}</strong>
        <span className="reel-tile__place">{reel.place}</span>
        <span className="reel-tile__price">{reel.priceHint}</span>
      </div>
    </button>
  );
}

/** Instagram Explore–style video mosaic of services (+ button destination). */
export function ServicesExplorePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof REEL_FILTERS)[number]>("All");
  const [active, setActive] = useState<ServiceReel | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const reels =
    filter === "All" ? SERVICE_REELS : SERVICE_REELS.filter((r) => r.category === filter);

  useEffect(() => {
    const v = previewRef.current;
    if (!v || !active) return;
    void v.play().catch(() => undefined);
    return () => {
      v.pause();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div className="page services-explore">
      <div className="services-explore__filters" role="tablist" aria-label="Service filters">
        {REEL_FILTERS.map((f) => (
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
        {reels.map((reel) => (
          <div key={reel.id} role="listitem">
            <ReelTile reel={reel} onOpen={() => setActive(reel)} />
          </div>
        ))}
      </div>

      {active ? (
        <div className="reel-preview" role="dialog" aria-modal="true" aria-label={active.title}>
          <button
            type="button"
            className="reel-preview__backdrop"
            aria-label="Close preview"
            onClick={() => setActive(null)}
          />
          <div className="reel-preview__panel">
            <video
              ref={previewRef}
              className="reel-preview__video"
              src={active.videoUrl}
              poster={active.posterUrl}
              muted
              loop
              playsInline
              autoPlay
              controls={false}
            />
            <div className="reel-preview__body">
              <span className="reel-preview__cat">{active.category}</span>
              <h2>{active.title}</h2>
              <p className="muted">{active.blurb}</p>
              <p className="reel-preview__place">
                {active.place} · {active.priceHint}
              </p>
              <div className="row-actions">
                <button
                  type="button"
                  className="los-btn los-btn--primary"
                  onClick={() => navigate(active.href)}
                >
                  Open {active.category}
                </button>
                <button
                  type="button"
                  className="los-btn los-btn--ghost"
                  onClick={() => setActive(null)}
                >
                  Keep browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
