import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DiscoverableOffering } from "@lifeos/shared";
import { EmptyState, Skeleton } from "@lifeos/ui";
import { discoverService } from "../lib/services";
import {
  MOCK_SERVICE_SELLERS,
  SERVICE_CONCEPTS,
  SERVICE_FILTERS,
  type ServiceConcept,
  type ServiceSeller,
} from "../lib/serviceReels";

function matchesConcept(o: DiscoverableOffering, concept: ServiceConcept) {
  const hay = `${o.name} ${o.description} ${o.businessName} ${o.category} ${o.type}`.toLowerCase();
  return concept.keywords.some((k) => hay.includes(k.toLowerCase()));
}

function isOfferingAvailable(o: DiscoverableOffering) {
  const a = (o.availability ?? "").toLowerCase();
  if (!a) return true;
  if (/sold out|unavailable|fully booked|closed/.test(a)) return false;
  return true;
}

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

/** Instagram-style service videos — tap a service to see every business that sells it. */
export function ServicesExplorePage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof SERVICE_FILTERS)[number]>("All");
  const [active, setActive] = useState<ServiceConcept | null>(null);
  const [sellers, setSellers] = useState<ServiceSeller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const concepts = useMemo(
    () =>
      filter === "All"
        ? SERVICE_CONCEPTS
        : SERVICE_CONCEPTS.filter((c) => c.category === filter),
    [filter],
  );

  useEffect(() => {
    if (!active) {
      setSellers([]);
      return;
    }

    let cancelled = false;
    setLoadingSellers(true);

    void (async () => {
      const mocks = [...(MOCK_SERVICE_SELLERS[active.id] ?? [])];
      const fromApi: ServiceSeller[] = [];

      try {
        const [{ offerings }, { businesses }] = await Promise.all([
          discoverService.offerings({ category: active.category }).catch(() => ({
            offerings: [] as DiscoverableOffering[],
          })),
          discoverService.listBusinesses().catch(() => ({ businesses: [] })),
        ]);

        const matchedOfferings = offerings.filter((o) => matchesConcept(o, active));
        const seen = new Set(mocks.map((m) => m.businessId));

        for (const o of matchedOfferings) {
          if (seen.has(o.businessId)) continue;
          seen.add(o.businessId);
          fromApi.push({
            businessId: o.businessId,
            businessName: o.businessName,
            offeringName: o.name,
            category: o.category,
            available: isOfferingAvailable(o),
            priceHint: o.priceFormatted || "See prices",
            locationLabel: o.availability || undefined,
          });
        }

        // Category businesses with no keyword hit still appear for that vertical.
        if (!mocks.length && !fromApi.length) {
          for (const b of businesses.filter((x) => x.category === active.category)) {
            if (seen.has(b.businessId)) continue;
            seen.add(b.businessId);
            fromApi.push({
              businessId: b.businessId,
              businessName: b.businessName,
              offeringName: active.title,
              category: b.category,
              available: true,
              priceHint: "See options",
              locationLabel: b.hours || undefined,
            });
          }
        }
      } catch {
        /* mocks still apply */
      }

      if (cancelled) return;

      const merged = [...mocks, ...fromApi].sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.businessName.localeCompare(b.businessName);
      });
      setSellers(merged);
      setLoadingSellers(false);
    })();

    return () => {
      cancelled = true;
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
            <ReelTile concept={concept} onOpen={() => setActive(concept)} />
          </div>
        ))}
      </div>

      {active ? (
        <div className="reel-preview" role="dialog" aria-modal="true" aria-label={active.title}>
          <button
            type="button"
            className="reel-preview__backdrop"
            aria-label="Close"
            onClick={() => setActive(null)}
          />
          <div className="reel-preview__panel reel-preview__panel--sellers">
            <div className="reel-preview__hero">
              <video
                className="reel-preview__video reel-preview__video--short"
                src={active.videoUrl}
                poster={active.posterUrl}
                muted
                loop
                playsInline
                autoPlay
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.currentTime >= active.clipSeconds) {
                    v.currentTime = 0;
                    void v.play().catch(() => undefined);
                  }
                }}
              />
              <div className="reel-preview__hero-label">
                <h2>{active.title}</h2>
                <p className="muted small">Businesses that offer this</p>
              </div>
            </div>

            <div className="reel-preview__body">
              {loadingSellers ? (
                <>
                  <Skeleton height={64} label="Loading businesses" />
                  <Skeleton height={64} />
                </>
              ) : sellers.length === 0 ? (
                <EmptyState
                  title={`No ${active.title.toLowerCase()} sellers yet`}
                  detail="Try another service, or check back soon."
                />
              ) : (
                <ul className="service-seller-list">
                  {sellers.map((s) => (
                    <li key={`${s.businessId}-${s.offeringName}`}>
                      <button
                        type="button"
                        className={`service-seller${s.available ? "" : " service-seller--busy"}`}
                        onClick={() =>
                          navigate(`/app/discover?business=${encodeURIComponent(s.businessId)}`)
                        }
                      >
                        <div className="service-seller__copy">
                          <strong>{s.businessName}</strong>
                          <span className="muted small">{s.offeringName}</span>
                          {s.locationLabel ? (
                            <span className="service-seller__avail">{s.locationLabel}</span>
                          ) : null}
                        </div>
                        <div className="service-seller__side">
                          <span
                            className={`service-seller__pill${s.available ? " service-seller__pill--ok" : ""}`}
                          >
                            {s.available ? "Available" : "Unavailable"}
                          </span>
                          <span className="service-seller__price">{s.priceHint}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="los-btn los-btn--ghost"
                onClick={() => setActive(null)}
              >
                Back to services
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
