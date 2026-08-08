import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { DiscoverableOffering } from "@lifeos/shared";
import { Button, EmptyState, Skeleton } from "@lifeos/ui";
import { discoverService } from "../lib/services";
import { serviceLabel } from "../lib/serviceCatalog";
import { StatusBanner } from "../components/StatusBanner";

const TONE_BY_CATEGORY: Record<string, string> = {
  Stay: "stay",
  Eat: "eat",
  Wellness: "wellness",
  Fitness: "fitness",
  Cinema: "cinema",
  Events: "events",
  Activities: "activities",
  Travel: "travel",
};

/**
 * Horizontal social-style discovery — swipe left/right through offerings
 * like a video feed (peek of neighbors on each side).
 */
export function OfferingFeedPage() {
  const { category = "Stay" } = useParams();
  const [params] = useSearchParams();
  const focusId = params.get("focus");
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const title = category === "Stay" ? "Hotel rooms nearby" : serviceLabel(category);
  const tone = TONE_BY_CATEGORY[category] ?? "stay";

  useEffect(() => {
    setLoading(true);
    void discoverService
      .offerings({ category })
      .then((d) => {
        const rooms =
          category === "Stay"
            ? d.offerings.filter((o) => o.type === "ROOM" || o.category === "Stay")
            : d.offerings;
        const sorted = [...rooms].sort((a, b) => {
          if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
          return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
        });
        setOfferings(sorted);
      })
      .catch(() => setError("Couldn't load rooms around you."))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    if (!offerings.length || !scrollerRef.current) return;
    const start = focusId ? Math.max(0, offerings.findIndex((o) => o.id === focusId)) : 0;
    const i = start >= 0 ? start : 0;
    setIndex(i);
    const el = scrollerRef.current;
    const slide = el.children[i] as HTMLElement | undefined;
    if (slide) {
      requestAnimationFrame(() => {
        el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2, behavior: "auto" });
      });
    }
  }, [offerings, focusId]);

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !el.children.length) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const mid = child.offsetLeft + child.clientWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setIndex(best);
  }, []);

  function scrollToIndex(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, offerings.length - 1));
    const slide = el.children[clamped] as HTMLElement | undefined;
    if (!slide) return;
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2,
      behavior: "smooth",
    });
    setIndex(clamped);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToIndex(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToIndex(index - 1);
      } else if (e.key === "Escape") {
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, offerings.length]);

  return (
    <div className="offering-feed-page">
      {error ? <StatusBanner title={error} /> : null}

      {loading ? (
        <div className="offering-feed__loading">
          <Skeleton height={420} label="Loading rooms" />
        </div>
      ) : offerings.length === 0 ? (
        <EmptyState
          title="No rooms nearby"
          detail="Try another area, or ask LifeOS."
          action={
            <Button variant="soft" size="sm" onClick={() => navigate("/app/services")}>
              Browse services
            </Button>
          }
        />
      ) : (
        <>
          <div
            ref={scrollerRef}
            className="offering-feed"
            role="list"
            aria-label={title}
            onScroll={syncIndex}
          >
            {offerings.map((o, i) => (
              <article
                key={o.id}
                role="listitem"
                className={`offering-slide offering-slide--${tone}${i === index ? " is-active" : ""}`}
                aria-current={i === index ? "true" : undefined}
              >
                <div className="offering-slide__glow" aria-hidden />
                <div className="offering-slide__media">
                  {o.image ? (
                    <img src={o.image} alt="" className="offering-slide__photo" />
                  ) : (
                    <div className="offering-slide__mark" aria-hidden>
                      {o.businessName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  {o.badge ? <span className="offering-slide__badge">{o.badge}</span> : null}
                </div>
                <div className="offering-slide__body">
                  <p className="offering-slide__hotel">{o.businessName}</p>
                  <h2 className="offering-slide__name">{o.name}</h2>
                  <p className="offering-slide__desc">{o.description}</p>
                  <div className="offering-slide__meta">
                    <span>{o.priceFormatted}{o.priceUnit ? ` / ${o.priceUnit}` : ""}</span>
                    {o.location ? <span>{o.location}</span> : null}
                    {o.distanceKm != null ? <span>{o.distanceKm.toFixed(1)} km</span> : null}
                    {o.rating != null ? <span>★ {o.rating.toFixed(1)}</span> : null}
                  </div>
                  {o.availability ? (
                    <p className="offering-slide__avail">{o.availability}</p>
                  ) : null}
                  <div className="offering-slide__actions">
                    <Button
                      onClick={() => navigate(`/app/discover?offering=${o.id}`)}
                    >
                      Book this room
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="offering-feed__nav" aria-hidden={false}>
            <button
              type="button"
              className="offering-feed__arrow"
              aria-label="Previous room"
              disabled={index <= 0}
              onClick={() => scrollToIndex(index - 1)}
            >
              ‹
            </button>
            <div className="offering-feed__dots" role="tablist" aria-label="Rooms">
              {offerings.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Room ${i + 1}: ${o.name}`}
                  className={`offering-feed__dot${i === index ? " active" : ""}`}
                  onClick={() => scrollToIndex(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className="offering-feed__arrow"
              aria-label="Next room"
              disabled={index >= offerings.length - 1}
              onClick={() => scrollToIndex(index + 1)}
            >
              ›
            </button>
          </div>
          <p className="offering-feed__hint muted small">Swipe left or right · {offerings.length} rooms around you</p>
        </>
      )}
    </div>
  );
}
