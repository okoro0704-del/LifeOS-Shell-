import { useEffect, useRef, useState } from "react";
import type { ServiceConcept } from "../lib/serviceReels";

type Props = {
  concept: ServiceConcept;
  onOpen: () => void;
  className?: string;
};

/** Video service tile used on Discover and Home discovery rails. */
export function ServiceConceptTile({ concept, onOpen, className }: Props) {
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
      className={className ? `discover-tile ${className}` : "discover-tile"}
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
