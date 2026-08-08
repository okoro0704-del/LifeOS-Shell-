import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DiscoverableOffering } from "@lifeos/shared";
import { EmptyState, Skeleton } from "@lifeos/ui";
import { discoverService } from "../lib/services";
import {
  MOCK_SERVICE_SELLERS,
  SERVICE_CONCEPTS,
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

/** Full-page list of businesses that offer a Discover service concept (e.g. Room). */
export function ServiceSellersPage() {
  const { conceptId = "" } = useParams();
  const navigate = useNavigate();
  const concept = useMemo(
    () => SERVICE_CONCEPTS.find((c) => c.id === conceptId) ?? null,
    [conceptId],
  );
  const [sellers, setSellers] = useState<ServiceSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!concept) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const mocks = [...(MOCK_SERVICE_SELLERS[concept.id] ?? [])];
      const fromApi: ServiceSeller[] = [];

      try {
        const [{ offerings }, { businesses }] = await Promise.all([
          discoverService.offerings({ category: concept.category }).catch(() => ({
            offerings: [] as DiscoverableOffering[],
          })),
          discoverService.listBusinesses().catch(() => ({ businesses: [] })),
        ]);

        const matchedOfferings = offerings.filter((o) => matchesConcept(o, concept));
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

        if (!mocks.length && !fromApi.length) {
          for (const b of businesses.filter((x) => x.category === concept.category)) {
            if (seen.has(b.businessId)) continue;
            seen.add(b.businessId);
            fromApi.push({
              businessId: b.businessId,
              businessName: b.businessName,
              offeringName: concept.title,
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
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [concept]);

  if (!concept) {
    return (
      <div className="page service-sellers-page">
        <EmptyState
          title="Service not found"
          detail="Pick another service from Discover."
          action={
            <button
              type="button"
              className="los-btn los-btn--soft"
              onClick={() => navigate("/app/services/explore")}
            >
              Back to Discover
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page service-sellers-page">
      <div className="service-sellers-hero">
        <img src={concept.posterUrl} alt="" className="service-sellers-hero__img" />
        <div className="service-sellers-hero__shade" aria-hidden />
        <div className="service-sellers-hero__copy">
          <p className="muted small">Discover · {concept.category}</p>
          <h1>{concept.title}</h1>
          <p className="muted">Businesses that offer this — available first</p>
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton height={72} label="Loading businesses" />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </>
      ) : sellers.length === 0 ? (
        <EmptyState
          title={`No ${concept.title.toLowerCase()} sellers yet`}
          detail="Try another service, or check back soon."
        />
      ) : (
        <ul className="service-seller-list service-seller-list--page">
          {sellers.map((s) => (
            <li key={`${s.businessId}-${s.offeringName}`}>
              <button
                type="button"
                className={`service-seller${s.available ? "" : " service-seller--busy"}`}
                onClick={() =>
                  navigate(`/app/business/${encodeURIComponent(s.businessId)}`)
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
    </div>
  );
}
