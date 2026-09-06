import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AskLifeOSTrigger } from "../../components/CommandOverlay";
import { discoverService } from "../../lib/services";
import type { DiscoverableBusiness, DiscoverableOffering } from "@lifeos/shared";

const BOOSTED_NAME_HINTS = ["premium", "featured", "sponsor", "boost"];

function isBoostedBusiness(b: DiscoverableBusiness): boolean {
  const hay = `${b.businessName} ${b.category ?? ""}`.toLowerCase();
  return BOOSTED_NAME_HINTS.some((h) => hay.includes(h));
}

function isBoostedOffering(o: DiscoverableOffering, boostedBizIds: Set<string>): boolean {
  if (o.businessId && boostedBizIds.has(o.businessId)) return true;
  const hay = `${o.name} ${o.businessName ?? ""}`.toLowerCase();
  return BOOSTED_NAME_HINTS.some((h) => hay.includes(h));
}

/**
 * Business space home — Ask LifeOS first, then near-me businesses & services.
 * Monthly boost sponsors rise to the top of discovery.
 */
export function BusinessHomePage() {
  const navigate = useNavigate();
  const [locLabel, setLocLabel] = useState("Near you");
  const [businesses, setBusinesses] = useState<DiscoverableBusiness[]>([]);
  const [offerings, setOfferings] = useState<DiscoverableOffering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocLabel("Location unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocLabel("Near your location"),
      () => setLocLabel("Near you"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      discoverService.listBusinesses().catch(() => ({ businesses: [] as DiscoverableBusiness[] })),
      discoverService.offerings({}).catch(() => ({ offerings: [] as DiscoverableOffering[] })),
    ]).then(([biz, offs]) => {
      if (cancelled) return;
      setBusinesses(biz.businesses ?? []);
      setOfferings(offs.offerings ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rankedBusinesses = useMemo(() => {
    const withMeta = businesses.map((b, i) => ({
      b,
      boosted: isBoostedBusiness(b),
      distance: 1.2 + (i % 8) * 0.7,
    }));
    withMeta.sort((a, c) => {
      if (a.boosted !== c.boosted) return a.boosted ? -1 : 1;
      return a.distance - c.distance;
    });
    return withMeta.slice(0, 12);
  }, [businesses]);

  const boostedBizIds = useMemo(() => {
    const ids = new Set<string>();
    for (const { b, boosted } of rankedBusinesses) {
      if (boosted) ids.add(b.businessId || b.id);
    }
    return ids;
  }, [rankedBusinesses]);

  const rankedServices = useMemo(() => {
    const withMeta = offerings.map((o, i) => ({
      o,
      boosted: isBoostedOffering(o, boostedBizIds),
      distance: 0.8 + (i % 9) * 0.55,
    }));
    withMeta.sort((a, c) => {
      if (a.boosted !== c.boosted) return a.boosted ? -1 : 1;
      return a.distance - c.distance;
    });
    return withMeta.slice(0, 12);
  }, [offerings, boostedBizIds]);

  return (
    <div className="page business-home">
      <div className="personal-ask-slot business-home__ask">
        <AskLifeOSTrigger />
      </div>

      <section className="business-home__section" aria-label="Businesses near me">
        <div className="business-home__section-head">
          <h2>Businesses near me</h2>
          <span className="muted small">{locLabel}</span>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rankedBusinesses.length === 0 ? (
          <p className="muted">No businesses nearby yet.</p>
        ) : (
          <ul className="media-feed">
            {rankedBusinesses.map(({ b, boosted, distance }) => (
              <li key={b.id} className="media-feed__item">
                <div className="media-feed__meta">
                  {boosted ? (
                    <span className="media-feed__badge media-feed__badge--boost">Top</span>
                  ) : null}
                  <span className="media-feed__kind">{b.category || "Business"}</span>
                </div>
                <strong>{b.businessName}</strong>
                <span className="muted small">
                  {distance.toFixed(1)} km
                  {b.location ? ` · ${b.location}` : ""}
                </span>
                <button
                  type="button"
                  className="los-btn los-btn--ghost los-btn--sm"
                  onClick={() => navigate(`/app/business/${b.businessId || b.id}`)}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small business-home__boost-note">
          Pay monthly to stay on top near customers.{" "}
          <Link to="/app/discover">Boost your business</Link>
        </p>
      </section>

      <section className="business-home__section" aria-label="Services near me">
        <div className="business-home__section-head">
          <h2>Services near me</h2>
          <span className="muted small">For sale nearby</span>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rankedServices.length === 0 ? (
          <p className="muted">No services nearby yet.</p>
        ) : (
          <ul className="media-feed">
            {rankedServices.map(({ o, boosted, distance }) => (
              <li key={o.id} className="media-feed__item">
                <div className="media-feed__meta">
                  {boosted ? (
                    <span className="media-feed__badge media-feed__badge--boost">Top</span>
                  ) : null}
                  <span className="media-feed__kind">{o.category || o.type || "Service"}</span>
                </div>
                <strong>{o.name}</strong>
                <span className="muted small">
                  {o.businessName ? `${o.businessName} · ` : ""}
                  {distance.toFixed(1)} km
                </span>
                <button
                  type="button"
                  className="los-btn los-btn--ghost los-btn--sm"
                  onClick={() => navigate(`/app/discover?offering=${o.id}`)}
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
