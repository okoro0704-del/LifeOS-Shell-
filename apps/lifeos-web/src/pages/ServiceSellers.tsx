import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DiscoverableOffering } from "@lifeos/shared";
import { EmptyState, SearchBar, Skeleton } from "@lifeos/ui";
import { discoverService } from "../lib/services";
import {
  MOCK_SERVICE_SELLERS,
  SERVICE_CONCEPTS,
  type ServiceConcept,
  type ServiceSeller,
} from "../lib/serviceReels";

const SELLER_COVERS: Record<string, string> = {
  Stay: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  Eat: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
  Wellness: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80",
  Fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80",
  Cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
  Events: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=80",
  Travel: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80",
};

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

type SellerCard = ServiceSeller & { image?: string; offeringId?: string };

/** Full-page 3-up grid of businesses/services for a Discover concept. */
export function ServiceSellersPage() {
  const { conceptId = "" } = useParams();
  const navigate = useNavigate();
  const concept = useMemo(
    () => SERVICE_CONCEPTS.find((c) => c.id === conceptId) ?? null,
    [conceptId],
  );
  const [sellers, setSellers] = useState<SellerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!concept) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const mocks: SellerCard[] = (MOCK_SERVICE_SELLERS[concept.id] ?? []).map((m) => ({
        ...m,
        image: concept.posterUrl,
      }));
      const fromApi: SellerCard[] = [];

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
            offeringId: o.id,
            category: o.category,
            available: isOfferingAvailable(o),
            priceHint: o.priceFormatted || "See prices",
            locationLabel: o.location || o.availability || undefined,
            image: o.image || concept.posterUrl,
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
              locationLabel: b.location || b.hours || undefined,
              image: b.logo || SELLER_COVERS[b.category] || concept.posterUrl,
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter(
      (s) =>
        s.businessName.toLowerCase().includes(q) ||
        s.offeringName.toLowerCase().includes(q) ||
        (s.locationLabel ?? "").toLowerCase().includes(q),
    );
  }, [sellers, query]);

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
          <p className="muted">Services & businesses — available first</p>
        </div>
      </div>

      <SearchBar
        id="sellers-search"
        placeholder={`Search ${concept.title.toLowerCase()}…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-label={`Search ${concept.title}`}
      />

      {loading ? (
        <div className="discover-grid">
          <Skeleton height={160} label="Loading" />
          <Skeleton height={160} />
          <Skeleton height={160} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No ${concept.title.toLowerCase()} matches`}
          detail="Try another search, or pick a different service."
        />
      ) : (
        <div className="discover-grid" role="list">
          {filtered.map((s) => (
            <button
              key={`${s.businessId}-${s.offeringName}`}
              type="button"
              role="listitem"
              className={`discover-tile discover-tile--seller${s.available ? "" : " discover-tile--busy"}`}
              onClick={() => {
                const qs = s.offeringId
                  ? `?offering=${encodeURIComponent(s.offeringId)}`
                  : "";
                navigate(`/app/business/${encodeURIComponent(s.businessId)}${qs}`);
              }}
            >
              <img
                className="discover-tile__media"
                src={s.image || SELLER_COVERS[s.category] || concept.posterUrl}
                alt=""
                loading="lazy"
              />
              <div className="discover-tile__shade" aria-hidden />
              <div className="discover-tile__meta">
                <strong className="discover-tile__title">{s.businessName}</strong>
                <span className="discover-tile__cat">{s.offeringName}</span>
                <span className="discover-tile__foot">
                  <span
                    className={`service-seller__pill${s.available ? " service-seller__pill--ok" : ""}`}
                  >
                    {s.available ? "Available" : "Unavailable"}
                  </span>
                  <span>{s.priceHint}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
